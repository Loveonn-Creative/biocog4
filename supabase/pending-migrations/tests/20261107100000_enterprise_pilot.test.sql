-- Behaviour tests for 20261107100000_enterprise_pilot.sql (run_enterprise_pilot.sh).
\set ON_ERROR_STOP on
SET client_min_messages = notice;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- People: enterprise head (granted), a teammate, a Scale-plan MSME with no grant,
-- a supplier with a new account, an existing MSME matched by GSTIN, an outsider.
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000000e1', 'head@buyer.in', now()),
  ('00000000-0000-4000-8000-0000000000e2', 'team@buyer.in', now()),
  ('00000000-0000-4000-8000-0000000000e3', 'scale@msme.in', now()),
  ('00000000-0000-4000-8000-0000000000f1', 'sup@steel.in', now()),
  ('00000000-0000-4000-8000-0000000000f2', 'old@castings.in', now()),
  ('00000000-0000-4000-8000-0000000000f3', 'nosy@other.in', now()),
  ('00000000-0000-4000-8000-0000000000f4', 'unconfirmed@buyer2.in', NULL)
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) VALUES
  ('00000000-0000-4000-8000-0000000000e1'), ('00000000-0000-4000-8000-0000000000e2'), ('00000000-0000-4000-8000-0000000000e3'),
  ('00000000-0000-4000-8000-0000000000f1'), ('00000000-0000-4000-8000-0000000000f2'), ('00000000-0000-4000-8000-0000000000f3'),
  ('00000000-0000-4000-8000-0000000000f4') ON CONFLICT DO NOTHING;
UPDATE public.profiles SET subscription_tier = 'scale' WHERE id = '00000000-0000-4000-8000-0000000000e3';
UPDATE public.profiles SET gstin = '27AABCO1234F1Z5' WHERE id = '00000000-0000-4000-8000-0000000000f2';

-- Supplier records: 2 bills in the period (one verified), 1 outside it, 1 in an org workspace.
INSERT INTO public.documents (id, user_id, vendor, document_type, invoice_date, document_hash) VALUES
  ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000000f1', 'MSEDCL', 'invoice', '2025-07-31', repeat('a', 64)),
  ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-0000000000f1', 'Indian Oil', 'invoice', '2025-09-12', repeat('b', 64)),
  ('00000000-0000-4000-8000-00000000d003', '00000000-0000-4000-8000-0000000000f1', 'MSEDCL', 'invoice', '2024-12-31', repeat('c', 64))
ON CONFLICT DO NOTHING;
INSERT INTO public.emissions (user_id, document_id, scope, category, co2_kg, activity_data, activity_unit, verified) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000d001', 2, 'Grid electricity', 7100, 10000, 'kWh', true),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000d002', 1, 'Diesel', 2680, 1000, 'litres', false),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000d003', 2, 'Grid electricity', 9999, 1, 'kWh', true);

CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claim.sub', coalesce(p::text, ''), false); END $$;

-- 1. Nobody in a browser can grant access or read the access table.
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000e3');
  BEGIN PERFORM private.grant_enterprise_access('scale@msme.in', 'Self Grant', 100, 'me');
    RAISE EXCEPTION 'FAIL: a signed-in user granted enterprise access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.enterprise_access (email, company_name, granted_by) VALUES ('scale@msme.in', 'Self', 'me');
    RAISE EXCEPTION 'FAIL: a signed-in user inserted enterprise access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM public.enterprise_access;
    RAISE EXCEPTION 'FAIL: enterprise_access readable from a browser';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS (SELECT 1 FROM public.my_enterprise()) THEN RAISE EXCEPTION 'FAIL: Scale user sees enterprise access'; END IF;
  BEGIN PERFORM public.claim_enterprise_access(); RAISE EXCEPTION 'FAIL: Scale user claimed enterprise access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ok: no browser user, Scale included, can grant, read or claim enterprise access';
END $$;
DO $$
BEGIN
  SET LOCAL ROLE anon;
  BEGIN PERFORM private.grant_enterprise_access('x@y.in', 'X', 1, 'x'); RAISE EXCEPTION 'FAIL: anon granted access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ok: anon cannot grant access';
END $$;

-- 2. Staff grant (SQL editor role), then the granted person claims it.
SELECT private.grant_enterprise_access('Head@Buyer.in ', 'Sample Buyer Ltd', 2, 'test staff');
SELECT private.grant_enterprise_access('unconfirmed@buyer2.in', 'Unconfirmed Ltd', 5, 'test staff');
DO $$
DECLARE v_org uuid;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000f4');
  BEGIN PERFORM public.claim_enterprise_access(); RAISE EXCEPTION 'FAIL: unconfirmed email claimed access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000e1');
  IF NOT (SELECT claimable FROM public.my_enterprise()) THEN RAISE EXCEPTION 'FAIL: grant not shown as claimable'; END IF;
  SELECT organization_id INTO v_org FROM public.claim_enterprise_access();
  IF v_org IS NULL THEN RAISE EXCEPTION 'FAIL: claim returned no organisation'; END IF;
  IF (SELECT organization_id FROM public.my_enterprise() WHERE NOT claimable) <> v_org THEN RAISE EXCEPTION 'FAIL: my_enterprise after claim'; END IF;
  IF (SELECT organization_id FROM public.claim_enterprise_access()) <> v_org THEN RAISE EXCEPTION 'FAIL: second claim made a new organisation'; END IF;
  RESET ROLE;
  RAISE NOTICE 'ok: granted email claims once; unconfirmed email cannot; claiming again reuses the organisation';
END $$;
-- The head adds a teammate through the existing organisation membership.
INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
SELECT organization_id, '00000000-0000-4000-8000-0000000000e2', 'analyst', now() FROM public.enterprise_access WHERE email = 'head@buyer.in';

-- 3. The supplier-requests function (service role) creates requests.
CREATE TEMP TABLE t_tokens (request_id uuid, token text, who text);
INSERT INTO t_tokens SELECT r.request_id, r.token, 'steel' FROM public.enterprise_access ea,
  private.create_supplier_request(ea.organization_id, '00000000-0000-4000-8000-0000000000e1', 'Supplier A steel', 'SUP@steel.in', NULL,
    'Steel coils', '2025-04-01', '2026-03-31', 30, 12.5, 1::smallint) r WHERE ea.email = 'head@buyer.in';
INSERT INTO t_tokens SELECT r.request_id, r.token, 'castings' FROM public.enterprise_access ea,
  private.create_supplier_request(ea.organization_id, '00000000-0000-4000-8000-0000000000e1', 'Supplier B castings', NULL, '27aabco1234f1z5',
    'Castings', '2025-04-01', '2026-03-31') r WHERE ea.email = 'head@buyer.in';
DO $$
BEGIN
  BEGIN
    PERFORM private.create_supplier_request(ea.organization_id, '00000000-0000-4000-8000-0000000000e1', 'Supplier C', 'c@c.in', NULL, NULL, '2025-04-01', '2026-03-31')
    FROM public.enterprise_access ea WHERE ea.email = 'head@buyer.in';
    RAISE EXCEPTION 'FAIL: supplier limit not enforced';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    PERFORM private.create_supplier_request(ea.organization_id, '00000000-0000-4000-8000-0000000000f3', 'Supplier D', 'd@d.in', NULL, NULL, '2025-04-01', '2026-03-31')
    FROM public.enterprise_access ea WHERE ea.email = 'head@buyer.in';
    RAISE EXCEPTION 'FAIL: outsider created a request';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS (SELECT 1 FROM public.supplier_requests WHERE token_hash = (SELECT token FROM t_tokens LIMIT 1)) THEN
    RAISE EXCEPTION 'FAIL: plain token stored'; END IF;
  RAISE NOTICE 'ok: requests respect the supplier limit, need an enterprise member, and store only a token hash';
END $$;
GRANT SELECT ON t_tokens TO anon, authenticated;

-- 4. Before sign-in the link shows only who is asking.
DO $$
BEGIN
  SET LOCAL ROLE anon;
  IF (SELECT company_name FROM public.supplier_request_preview((SELECT token FROM t_tokens WHERE who = 'steel'))) <> 'Sample Buyer Ltd' THEN
    RAISE EXCEPTION 'FAIL: preview by token'; END IF;
  IF EXISTS (SELECT 1 FROM public.supplier_request_preview('not-a-token')) THEN RAISE EXCEPTION 'FAIL: preview with a wrong token'; END IF;
  BEGIN PERFORM 1 FROM public.supplier_requests; RAISE EXCEPTION 'FAIL: anon reads requests';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ok: the link preview shows the buyer and period only; anon reads no request rows';
END $$;

-- 5. Suppliers see requests addressed to them, including an existing MSME matched by GSTIN.
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000f1');
  IF (SELECT count(*) FROM public.my_supplier_requests()) <> 1 THEN RAISE EXCEPTION 'FAIL: supplier by email does not see the request'; END IF;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000f2');
  IF (SELECT count(*) FROM public.my_supplier_requests()) <> 1 THEN RAISE EXCEPTION 'FAIL: existing MSME by GSTIN does not see the request'; END IF;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000f3');
  IF (SELECT count(*) FROM public.my_supplier_requests()) <> 0 THEN RAISE EXCEPTION 'FAIL: outsider sees requests'; END IF;
  BEGIN PERFORM public.accept_supplier_request((SELECT request_id FROM t_tokens WHERE who = 'steel'));
    RAISE EXCEPTION 'FAIL: outsider accepted by id';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.share_with_enterprise((SELECT request_id FROM t_tokens WHERE who = 'steel'), 'v1', repeat('e', 64));
    RAISE EXCEPTION 'FAIL: outsider shared';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000f1');
  PERFORM public.accept_supplier_request(NULL, (SELECT token FROM t_tokens WHERE who = 'steel'));
  IF (SELECT status FROM public.supplier_requests WHERE id = (SELECT request_id FROM t_tokens WHERE who = 'steel')) <> 'opened' THEN
    RAISE EXCEPTION 'FAIL: accept did not open the request'; END IF;
  BEGIN UPDATE public.supplier_requests SET status = 'shared'; RAISE EXCEPTION 'FAIL: supplier updated a request directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ok: requests reach the right supplier by email or GSTIN; outsiders cannot see, accept or share';
END $$;

-- 6. Share: totals come from the supplier's own records in the period.
DO $$
DECLARE s public.supplier_snapshots%ROWTYPE;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000f1');
  PERFORM public.share_with_enterprise((SELECT request_id FROM t_tokens WHERE who = 'steel'), 'v1', repeat('e', 64));
  SELECT * INTO s FROM public.supplier_snapshots WHERE request_id = (SELECT request_id FROM t_tokens WHERE who = 'steel');
  IF s.total_kg <> 9780 OR s.scope1_kg <> 2680 OR s.scope2_kg <> 7100 THEN RAISE EXCEPTION 'FAIL: totals %', s.total_kg; END IF;
  IF s.verified_kg <> 7100 THEN RAISE EXCEPTION 'FAIL: verified %', s.verified_kg; END IF;
  IF s.documents_total <> 2 OR s.documents_verified <> 1 THEN RAISE EXCEPTION 'FAIL: document counts'; END IF;
  IF (s.activity->>'kwh')::numeric <> 10000 OR (s.activity->>'litres')::numeric <> 1000 THEN RAISE EXCEPTION 'FAIL: activity %', s.activity; END IF;
  IF array_length(s.evidence_hashes, 1) <> 2 THEN RAISE EXCEPTION 'FAIL: evidence hashes'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.supplier_consents WHERE request_id = s.request_id) THEN RAISE EXCEPTION 'FAIL: consent not recorded'; END IF;
  BEGIN INSERT INTO public.supplier_snapshots (request_id, enterprise_org_id, supplier_name, period_start, period_end, snapshot_hash)
    VALUES (s.request_id, s.enterprise_org_id, 'fake', '2025-04-01', '2026-03-31', repeat('0', 64));
    RAISE EXCEPTION 'FAIL: browser inserted a snapshot';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ok: shared totals come from in-period records only, with verified share, activity, evidence and consent';
END $$;

-- 7. The enterprise reads snapshots, never supplier documents or emissions.
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000e2');
  IF (SELECT count(*) FROM public.supplier_snapshots) <> 1 THEN RAISE EXCEPTION 'FAIL: teammate cannot read the snapshot'; END IF;
  IF (SELECT count(*) FROM public.supplier_requests) <> 2 THEN RAISE EXCEPTION 'FAIL: teammate cannot read requests'; END IF;
  IF (SELECT count(*) FROM public.emissions WHERE user_id = '00000000-0000-4000-8000-0000000000f1') <> 0 THEN
    RAISE EXCEPTION 'FAIL: enterprise reads supplier emissions'; END IF;
  IF (SELECT count(*) FROM public.documents WHERE user_id = '00000000-0000-4000-8000-0000000000f1') <> 0 THEN
    RAISE EXCEPTION 'FAIL: enterprise reads supplier documents'; END IF;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000e3');
  IF (SELECT count(*) FROM public.supplier_snapshots) <> 0 OR (SELECT count(*) FROM public.supplier_requests) <> 0 THEN
    RAISE EXCEPTION 'FAIL: Scale user reads enterprise data'; END IF;
  RESET ROLE;
  RAISE NOTICE 'ok: the enterprise reads only shared snapshots; supplier bills and emission rows stay private';
END $$;

-- 8. Withdrawn consent and revoked access stop further sharing.
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000f1');
  PERFORM public.withdraw_supplier_consent((SELECT request_id FROM t_tokens WHERE who = 'steel'));
  BEGIN PERFORM public.share_with_enterprise((SELECT request_id FROM t_tokens WHERE who = 'steel'), 'v1', repeat('e', 64));
    RAISE EXCEPTION 'FAIL: shared after withdrawing';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ok: after withdrawing, nothing new can be shared on that request';
END $$;
SELECT private.revoke_enterprise_access('head@buyer.in');
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000e1');
  IF (SELECT count(*) FROM public.supplier_snapshots) <> 0 THEN RAISE EXCEPTION 'FAIL: revoked enterprise still reads snapshots'; END IF;
  IF EXISTS (SELECT 1 FROM public.my_enterprise()) THEN RAISE EXCEPTION 'FAIL: revoked enterprise still listed'; END IF;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000f2');
  IF (SELECT count(*) FROM public.my_supplier_requests()) <> 0 THEN RAISE EXCEPTION 'FAIL: requests from a revoked buyer still shown'; END IF;
  RESET ROLE;
  RAISE NOTICE 'ok: revoking access closes the dashboard data and pending requests';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL ENTERPRISE PILOT TESTS PASSED'; END $$;
