-- Behaviour tests for 20261109100000_enterprise_seats_and_question_billing.sql.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000000e1', 'head@enterprise.in', now()),
  ('00000000-0000-4000-8000-0000000000e2', 'late@enterprise.in', now()),
  ('00000000-0000-4000-8000-0000000000f1', 'owner@msme.in', now())
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) SELECT id FROM auth.users WHERE email LIKE '%.in' ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claim.sub', coalesce(p::text, ''), false); END $$;

-- An MSME team on a free plan keeps its plan seats.
INSERT INTO public.organizations (name, owner_id) VALUES ('Small Works', '00000000-0000-4000-8000-0000000000f1');

-- 1. Claiming enterprise access lifts the seat limit to the ceiling; the MSME team is unchanged.
SELECT private.grant_enterprise_access('head@enterprise.in', 'Sample Enterprise Ltd', 25, 'staff');
DO $$
DECLARE v_org uuid; v_seats int; v_msme int;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000e1');
  PERFORM public.claim_enterprise_access();
  RESET ROLE;
  SELECT organization_id INTO v_org FROM public.enterprise_access WHERE email = 'head@enterprise.in';
  SELECT max_members INTO v_seats FROM public.organizations WHERE id = v_org;
  IF v_seats <> private.enterprise_seat_ceiling() THEN RAISE EXCEPTION 'FAIL: enterprise seats %', v_seats; END IF;
  SELECT max_members INTO v_msme FROM public.organizations WHERE name = 'Small Works';
  IF v_msme <> public.owner_plan_seat_limit('00000000-0000-4000-8000-0000000000f1') THEN RAISE EXCEPTION 'FAIL: MSME seats changed to %', v_msme; END IF;
  RAISE NOTICE 'ok: claimed enterprise teams are not blocked on seats; other teams keep their plan seats';
END $$;

-- 2. Twelve members fit (the quote has 10); the two past it show on the staff bill.
DO $$
DECLARE v_org uuid := (SELECT organization_id FROM public.enterprise_access WHERE email = 'head@enterprise.in'); i int; v_seat bigint;
BEGIN
  FOR i IN 1..11 LOOP
    INSERT INTO auth.users (id, email, email_confirmed_at) VALUES (gen_random_uuid(), 'm' || i || '@enterprise.in', now());
  END LOOP;
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
  SELECT v_org, id, 'viewer', now() FROM auth.users WHERE email ~ '^m[0-9]+@enterprise\.in$';
  IF (SELECT count(*) FROM public.organization_members WHERE organization_id = v_org) <> 12 THEN RAISE EXCEPTION 'FAIL: members not added'; END IF;
  SELECT quantity INTO v_seat FROM private.enterprise_bill(v_org, now() - interval '1 day', now() + interval '1 day') WHERE kind = 'seat';
  IF v_seat <> 2 THEN RAISE EXCEPTION 'FAIL: extra seats billed %', v_seat; END IF;
  RAISE NOTICE 'ok: seats past the quote are billed, not blocked';
END $$;

-- 3. Revoking access returns the team to the owner''s plan seats.
DO $$
DECLARE v_org uuid := (SELECT organization_id FROM public.enterprise_access WHERE email = 'head@enterprise.in');
BEGIN
  UPDATE public.enterprise_access SET status = 'revoked' WHERE email = 'head@enterprise.in';
  IF (SELECT max_members FROM public.organizations WHERE id = v_org) <> public.owner_plan_seat_limit('00000000-0000-4000-8000-0000000000e1') THEN
    RAISE EXCEPTION 'FAIL: revoked team kept enterprise seats'; END IF;
  UPDATE public.enterprise_access SET status = 'active' WHERE email = 'head@enterprise.in';
  IF (SELECT max_members FROM public.organizations WHERE id = v_org) <> private.enterprise_seat_ceiling() THEN RAISE EXCEPTION 'FAIL: reactivated seats'; END IF;
  RAISE NOTICE 'ok: seats follow the access status';
END $$;

-- 4. 1,000 questions past the quote bill once at the rate per 1,000; included ones are free.
DO $$
DECLARE v_org uuid := (SELECT organization_id FROM public.enterprise_access WHERE email = 'head@enterprise.in'); v_q bigint;
BEGIN
  INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise)
  SELECT v_org, 'question', 1, true, (SELECT unit_paise FROM public.enterprise_rates WHERE kind = 'questions_1000') FROM generate_series(1, 1000);
  INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise) VALUES (v_org, 'question', 1, false, NULL);
  SELECT amount_paise INTO v_q FROM private.enterprise_bill(v_org, now() - interval '1 day', now() + interval '1 day') WHERE kind = 'question';
  IF v_q <> (SELECT unit_paise FROM public.enterprise_rates WHERE kind = 'questions_1000') THEN RAISE EXCEPTION 'FAIL: 1,000 questions billed %', v_q; END IF;
  RAISE NOTICE 'ok: questions bill per 1,000 at the stored rate';
END $$;

-- 5. Browsers still cannot call the seat or bill functions.
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.owner_seat_limit('00000000-0000-4000-8000-0000000000e1'); RAISE EXCEPTION 'FAIL: browser read seat limit';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.owner_plan_seat_limit('00000000-0000-4000-8000-0000000000e1'); RAISE EXCEPTION 'FAIL: browser read plan seats';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ok: seat and bill functions stay server-only';
END $$;

\echo ALL ENTERPRISE SEAT AND QUESTION TESTS PASSED
