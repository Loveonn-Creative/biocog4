-- Behaviour tests for 20261013100000_org_workspace_roles.sql.
-- Run on a database built from supabase/migrations plus the pending chain
-- (see tests/run_chain.sh). Every failed expectation raises and stops the run.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;

CREATE OR REPLACE FUNCTION pg_temp.act(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid::text, false);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, false);
  EXECUTE 'SET ROLE authenticated';
END $$;
CREATE OR REPLACE FUNCTION pg_temp.as_db() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub', '', false);
  PERFORM set_config('request.jwt.claims', '', false);
END $$;
-- Runs a statement and requires it to fail with SQLSTATE 42501 (or the given state).
CREATE OR REPLACE FUNCTION pg_temp.expect_denied(p_sql text, p_label text, p_state text DEFAULT '42501') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE = 'XX000' THEN RAISE; END IF;
  IF p_state IS NOT NULL AND SQLSTATE <> p_state THEN
    RAISE EXCEPTION 'FAIL (wrong error %: %): %', SQLSTATE, SQLERRM, p_label;
  END IF;
  RAISE NOTICE 'ok denied: %', p_label;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF;
  RAISE NOTICE 'ok: %', p_label;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated;

-- People: owner O, admin A, data manager D, analyst N, auditor C, viewer V, outsider X, second admin B.
INSERT INTO auth.users (id, email) VALUES
 ('00000000-0000-4000-8000-00000000000a', 'owner@acme.in'),
 ('00000000-0000-4000-8000-00000000000b', 'admin@acme.in'),
 ('00000000-0000-4000-8000-00000000000c', 'dm@acme.in'),
 ('00000000-0000-4000-8000-00000000000d', 'analyst@acme.in'),
 ('00000000-0000-4000-8000-00000000000e', 'auditor@acme.in'),
 ('00000000-0000-4000-8000-00000000000f', 'viewer@acme.in'),
 ('00000000-0000-4000-8000-000000000010', 'outsider@other.in'),
 ('00000000-0000-4000-8000-000000000011', 'admin2@acme.in');
INSERT INTO public.profiles (id, subscription_tier)
SELECT id, CASE WHEN email = 'owner@acme.in' THEN 'scale' ELSE 'snapshot' END FROM auth.users
ON CONFLICT (id) DO UPDATE SET subscription_tier = EXCLUDED.subscription_tier;

SELECT pg_temp.act('00000000-0000-4000-8000-00000000000a');
CREATE TEMP TABLE t_org AS SELECT (public.create_organization('Acme Steel')).id AS id;
SELECT pg_temp.as_db();
SELECT pg_temp.check((SELECT max_members FROM public.organizations WHERE id = (SELECT id FROM t_org)) = 10,
  'Scale without a quote gets 10 seats');

-- Scale quote with 40 seats, consumed: seats follow the quote.
INSERT INTO public.scale_price_quotes (user_id, amount_inr, seats, valid_until, status, consumed_at)
VALUES ('00000000-0000-4000-8000-00000000000a', 500000, 40, now() + interval '30 days', 'consumed', now());
SELECT pg_temp.check((SELECT max_members FROM public.organizations WHERE id = (SELECT id FROM t_org)) = 40,
  'Scale seats come from the consumed quote');
UPDATE public.profiles SET subscription_tier = 'pro' WHERE id = '00000000-0000-4000-8000-00000000000a';
SELECT pg_temp.check((SELECT max_members FROM public.organizations WHERE id = (SELECT id FROM t_org)) = 10, 'Pro gets 10 seats');
UPDATE public.profiles SET subscription_tier = 'basic' WHERE id = '00000000-0000-4000-8000-00000000000a';
SELECT pg_temp.check((SELECT max_members FROM public.organizations WHERE id = (SELECT id FROM t_org)) = 3, 'Essential gets 3 seats');
UPDATE public.profiles SET subscription_tier = 'scale' WHERE id = '00000000-0000-4000-8000-00000000000a';

INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
SELECT (SELECT id FROM t_org), u, r, now() FROM (VALUES
 ('00000000-0000-4000-8000-00000000000b'::uuid, 'admin'),
 ('00000000-0000-4000-8000-00000000000c'::uuid, 'data_manager'),
 ('00000000-0000-4000-8000-00000000000d'::uuid, 'analyst'),
 ('00000000-0000-4000-8000-00000000000e'::uuid, 'carbon_auditor'),
 ('00000000-0000-4000-8000-00000000000f'::uuid, 'viewer'),
 ('00000000-0000-4000-8000-000000000011'::uuid, 'admin')) v(u, r);

-- Permissions per role, as the browser sees them.
DO $$
DECLARE r record; v jsonb; org uuid := (SELECT id FROM t_org);
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('00000000-0000-4000-8000-00000000000a'::uuid, 'owner', 7),
    ('00000000-0000-4000-8000-00000000000b'::uuid, 'admin', 7),
    ('00000000-0000-4000-8000-00000000000c'::uuid, 'data_manager', 5),
    ('00000000-0000-4000-8000-00000000000d'::uuid, 'analyst', 3),
    ('00000000-0000-4000-8000-00000000000e'::uuid, 'carbon_auditor', 3),
    ('00000000-0000-4000-8000-00000000000f'::uuid, 'viewer', 1)) x(uid, role, n)
  LOOP
    PERFORM set_config('request.jwt.claim.sub', r.uid::text, false);
    v := public.my_org_permissions(org);
    IF v->>'role' <> r.role OR jsonb_array_length(v->'capabilities') <> r.n THEN
      RAISE EXCEPTION 'FAIL: permissions for % were %', r.role, v;
    END IF;
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000010', false);
  IF public.my_org_permissions(org)->>'role' IS NOT NULL THEN RAISE EXCEPTION 'FAIL: outsider has a role'; END IF;
  PERFORM set_config('request.jwt.claim.sub', '', false);
  RAISE NOTICE 'ok: capability counts per role';
END $$;
SELECT pg_temp.check(NOT private.role_can('analyst', 'records.verify') AND private.role_can('carbon_auditor', 'records.verify')
  AND NOT private.role_can('carbon_auditor', 'records.upload') AND NOT private.role_can('viewer', 'reports.create'),
  'separation of duties: analysts upload, auditors verify, viewers only read');

-- Uploading into the organisation workspace.
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000d');
INSERT INTO public.documents (id, user_id, organization_id, document_type, document_hash)
VALUES ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000d', (SELECT id FROM t_org), 'invoice', 'hash-1');
INSERT INTO public.emissions (id, user_id, document_id, scope, category, co2_kg)
VALUES ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000d', '10000000-0000-4000-8000-000000000001', 2, 'electricity', 71);
-- A personal record for the same analyst.
INSERT INTO public.documents (id, user_id, document_type, document_hash)
VALUES ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000d', 'invoice', 'hash-2');
SELECT pg_temp.as_db();
SELECT pg_temp.check((SELECT organization_id FROM public.emissions WHERE id = '20000000-0000-4000-8000-000000000001') = (SELECT id FROM t_org),
  'emission inherits the workspace of its invoice');

SELECT pg_temp.act('00000000-0000-4000-8000-00000000000f');
SELECT pg_temp.expect_denied(format($q$INSERT INTO public.documents (user_id, organization_id, document_type) VALUES ('00000000-0000-4000-8000-00000000000f', %L, 'invoice')$q$, (SELECT id FROM t_org)),
  'viewer cannot upload into the organisation');
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000e');
SELECT pg_temp.expect_denied(format($q$INSERT INTO public.documents (user_id, organization_id, document_type) VALUES ('00000000-0000-4000-8000-00000000000e', %L, 'invoice')$q$, (SELECT id FROM t_org)),
  'auditor cannot upload into the organisation');
SELECT pg_temp.act('00000000-0000-4000-8000-000000000010');
SELECT pg_temp.expect_denied(format($q$INSERT INTO public.documents (user_id, organization_id, document_type) VALUES ('00000000-0000-4000-8000-000000000010', %L, 'invoice')$q$, (SELECT id FROM t_org)),
  'outsider cannot upload into the organisation');
SELECT pg_temp.expect_denied($q$INSERT INTO public.emissions (user_id, document_id, scope, category, co2_kg) VALUES ('00000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 1, 'diesel', 1)$q$,
  'outsider cannot attach emissions to an organisation invoice');
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000c');
SELECT pg_temp.expect_denied(format($q$INSERT INTO public.documents (user_id, organization_id, document_type, document_hash) VALUES ('00000000-0000-4000-8000-00000000000c', %L, 'invoice', 'hash-1')$q$, (SELECT id FROM t_org)),
  'the same invoice cannot be added twice to one organisation', '23505');
SELECT pg_temp.as_db();

-- Who reads what.
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000f');
SELECT pg_temp.check((SELECT count(*) FROM public.documents) = 1 AND (SELECT count(*) FROM public.emissions) = 1,
  'viewer sees the organisation invoice and its emission, not the analyst''s personal invoice');
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000a');
SELECT pg_temp.check((SELECT count(*) FROM public.documents WHERE id = '10000000-0000-4000-8000-000000000002') = 0,
  'owner cannot see a member''s personal records');
SELECT pg_temp.act('00000000-0000-4000-8000-000000000010');
SELECT pg_temp.check((SELECT count(*) FROM public.documents) = 0 AND (SELECT count(*) FROM public.emissions) = 0,
  'outsider sees nothing');
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000d');
SELECT pg_temp.check((SELECT count(*) FROM public.documents) = 2, 'analyst still sees both own records');
SELECT pg_temp.expect_denied($q$UPDATE public.documents SET organization_id = NULL WHERE id = '10000000-0000-4000-8000-000000000001'$q$,
  'a record cannot leave the organisation');
SELECT pg_temp.expect_denied(format($q$UPDATE public.documents SET organization_id = %L WHERE id = '10000000-0000-4000-8000-000000000002'$q$, (SELECT id FROM t_org)),
  'a personal record cannot be moved into the organisation from the browser');
SELECT pg_temp.as_db();

-- Organisation profile.
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000b');
UPDATE public.organizations SET name = 'Acme Steel Ltd', metadata = '{"profile":{"sector":"manufacturing"}}' WHERE id = (SELECT id FROM t_org);
SELECT pg_temp.check((SELECT name FROM public.organizations WHERE id = (SELECT id FROM t_org)) = 'Acme Steel Ltd', 'admin edits the organisation profile');
SELECT pg_temp.expect_denied(format($q$UPDATE public.organizations SET owner_id = '00000000-0000-4000-8000-00000000000b' WHERE id = %L$q$, (SELECT id FROM t_org)),
  'admin cannot take ownership');
UPDATE public.organizations SET max_members = 999, subscription_tier = 'scale' WHERE id = (SELECT id FROM t_org);
SELECT pg_temp.check((SELECT max_members FROM public.organizations WHERE id = (SELECT id FROM t_org)) = 40, 'admin cannot raise seats');
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000f');
UPDATE public.organizations SET name = 'Hacked' WHERE id = (SELECT id FROM t_org);
SELECT pg_temp.check((SELECT name FROM public.organizations WHERE id = (SELECT id FROM t_org)) = 'Acme Steel Ltd', 'viewer cannot edit the profile');
SELECT pg_temp.as_db();

-- Team management.
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000b');
SELECT public.update_member_role((SELECT id FROM t_org), '00000000-0000-4000-8000-00000000000d', 'data_manager');
SELECT pg_temp.check((SELECT role FROM public.organization_members WHERE user_id = '00000000-0000-4000-8000-00000000000d') = 'data_manager', 'admin assigns data manager');
SELECT pg_temp.expect_denied(format($q$SELECT public.update_member_role(%L, '00000000-0000-4000-8000-00000000000d', 'admin')$q$, (SELECT id FROM t_org)),
  'admin cannot grant admin');
SELECT pg_temp.expect_denied(format($q$SELECT public.update_member_role(%L, '00000000-0000-4000-8000-000000000011', 'viewer')$q$, (SELECT id FROM t_org)),
  'admin cannot demote another admin');
SELECT pg_temp.expect_denied(format($q$SELECT public.remove_member(%L, '00000000-0000-4000-8000-000000000011')$q$, (SELECT id FROM t_org)),
  'admin cannot remove another admin');
SELECT pg_temp.expect_denied(format($q$SELECT public.update_member_role(%L, '00000000-0000-4000-8000-00000000000a', 'viewer')$q$, (SELECT id FROM t_org)),
  'nobody changes the owner');
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000c');
SELECT pg_temp.expect_denied(format($q$SELECT public.update_member_role(%L, '00000000-0000-4000-8000-00000000000f', 'analyst')$q$, (SELECT id FROM t_org)),
  'data manager cannot manage the team');
SELECT pg_temp.act('00000000-0000-4000-8000-00000000000a');
SELECT public.update_member_role((SELECT id FROM t_org), '00000000-0000-4000-8000-00000000000e', 'admin');
SELECT public.update_member_role((SELECT id FROM t_org), '00000000-0000-4000-8000-00000000000e', 'carbon_auditor');
SELECT pg_temp.check(true, 'owner grants and removes admin');
SELECT pg_temp.as_db();

-- Invitations (called by the send-team-invitation edge function as service_role).
SELECT pg_temp.check((SELECT role FROM public.service_create_team_invitation('00000000-0000-4000-8000-00000000000b', (SELECT id FROM t_org), 'new.auditor@acme.in', 'carbon_auditor', 'tok-1')) = 'carbon_auditor',
  'admin invites a carbon auditor');
SELECT pg_temp.expect_denied(format($q$SELECT public.service_create_team_invitation('00000000-0000-4000-8000-00000000000b', %L, 'x@acme.in', 'admin', 'tok-2')$q$, (SELECT id FROM t_org)),
  'admin cannot invite an admin', NULL);
SELECT pg_temp.expect_denied(format($q$SELECT public.service_create_team_invitation('00000000-0000-4000-8000-00000000000d', %L, 'y@acme.in', 'viewer', 'tok-3')$q$, (SELECT id FROM t_org)),
  'a data manager cannot invite', NULL);
SELECT pg_temp.check(public.service_org_can('00000000-0000-4000-8000-00000000000e', (SELECT id FROM t_org), 'records.verify')
  AND NOT public.service_org_can('00000000-0000-4000-8000-000000000010', (SELECT id FROM t_org), 'records.view'),
  'edge-function permission check');

SELECT 'ALL ORG WORKSPACE TESTS PASSED' AS result;
