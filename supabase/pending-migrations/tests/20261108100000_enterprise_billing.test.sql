-- Behaviour tests for 20261108100000_enterprise_billing.sql (run_enterprise_billing.sh).
\set ON_ERROR_STOP on
SET client_min_messages = notice;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- People: enterprise head, an analyst, a viewer, two invited suppliers, an MSME nobody invited.
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000000b1', 'head@buyer.in', now()),
  ('00000000-0000-4000-8000-0000000000b2', 'analyst@buyer.in', now()),
  ('00000000-0000-4000-8000-0000000000b3', 'viewer@buyer.in', now()),
  ('00000000-0000-4000-8000-0000000000c1', 'one@supplier.in', now()),
  ('00000000-0000-4000-8000-0000000000c2', 'two@supplier.in', now()),
  ('00000000-0000-4000-8000-0000000000c9', 'alone@msme.in', now())
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) SELECT id FROM auth.users WHERE email LIKE '%.in' ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claim.sub', coalesce(p::text, ''), false); END $$;

-- Grant with a quote of 2 suppliers and 1 report, so limits are easy to pass.
SELECT private.grant_enterprise_access('head@buyer.in', 'Sample Buyer Ltd', 2, 'staff');
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000b1');
  PERFORM public.claim_enterprise_access();
  RESET ROLE;
END $$;
UPDATE public.enterprise_access SET reports_included = 1 WHERE email = 'head@buyer.in';
INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
SELECT organization_id, '00000000-0000-4000-8000-0000000000b2', 'analyst', now() FROM public.enterprise_access WHERE email = 'head@buyer.in';
INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
SELECT organization_id, '00000000-0000-4000-8000-0000000000b3', 'viewer', now() FROM public.enterprise_access WHERE email = 'head@buyer.in';

CREATE TEMP TABLE t_req (request_id uuid, who text);
GRANT SELECT ON t_req TO authenticated;
INSERT INTO t_req SELECT r.request_id, 'one' FROM public.enterprise_access ea,
  public.service_create_supplier_request(ea.organization_id, '00000000-0000-4000-8000-0000000000b1', 'Supplier One', 'one@supplier.in', NULL, 'Yarn', '2025-04-01', '2026-03-31') r
  WHERE ea.email = 'head@buyer.in';
INSERT INTO t_req SELECT r.request_id, 'two' FROM public.enterprise_access ea,
  public.service_create_supplier_request(ea.organization_id, '00000000-0000-4000-8000-0000000000b1', 'Supplier Two', 'two@supplier.in', NULL, 'Dyes', '2025-04-01', '2026-03-31') r
  WHERE ea.email = 'head@buyer.in';

-- 1. A supplier past the quote is added and billed, not refused.
DO $$
DECLARE v_org uuid := (SELECT organization_id FROM public.enterprise_access WHERE email = 'head@buyer.in');
BEGIN
  PERFORM public.service_create_supplier_request(v_org, '00000000-0000-4000-8000-0000000000b1', 'Supplier Three', 'three@supplier.in', NULL, NULL, '2025-04-01', '2026-03-31');
  IF (SELECT count(*) FROM public.supplier_requests WHERE enterprise_org_id = v_org) <> 3 THEN RAISE EXCEPTION 'FAIL: third supplier refused'; END IF;
  IF (SELECT count(*) FROM public.enterprise_usage WHERE enterprise_org_id = v_org AND kind = 'supplier' AND billable AND unit_paise = 119900) <> 1 THEN
    RAISE EXCEPTION 'FAIL: supplier past the quote not billed'; END IF;
  RAISE NOTICE 'ok: suppliers past the quote are added and billed at the stored rate';
END $$;

-- 2. Reads: nothing is covered for an account nobody invited, or before the supplier accepts.
DO $$
BEGIN
  IF (public.service_enterprise_cover_reads('00000000-0000-4000-8000-0000000000c9', 3)->>'covered')::boolean THEN RAISE EXCEPTION 'FAIL: uninvited MSME covered'; END IF;
  IF (public.service_enterprise_cover_reads('00000000-0000-4000-8000-0000000000c1', 3)->>'covered')::boolean THEN RAISE EXCEPTION 'FAIL: covered before accepting'; END IF;
  RAISE NOTICE 'ok: reads are covered only for suppliers who accepted a request';
END $$;

-- The supplier accepts in the app.
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000c1');
  PERFORM public.accept_supplier_request((SELECT request_id FROM t_req WHERE who = 'one'));
  RESET ROLE;
END $$;

-- 3. First the 150 included reads (not billed), then billed packs of 100.
DO $$
DECLARE r jsonb; v_org uuid := (SELECT organization_id FROM public.enterprise_access WHERE email = 'head@buyer.in');
BEGIN
  r := public.service_enterprise_cover_reads('00000000-0000-4000-8000-0000000000c1', 3);
  IF NOT (r->>'covered')::boolean OR (r->>'reads')::int <> 150 OR (r->>'billable')::int <> 0 THEN RAISE EXCEPTION 'FAIL: included reads %', r; END IF;
  IF (SELECT credits FROM public.invoice_credit_packs WHERE user_id = '00000000-0000-4000-8000-0000000000c1' AND funded_by_org = v_org) <> 150 THEN
    RAISE EXCEPTION 'FAIL: included pack not added'; END IF;
  -- The supplier uses them all; a second call adds a billed pack, never more included reads.
  UPDATE public.invoice_credit_packs SET used = credits WHERE user_id = '00000000-0000-4000-8000-0000000000c1';
  r := public.service_enterprise_cover_reads('00000000-0000-4000-8000-0000000000c1', 130);
  IF (r->>'reads')::int <> 200 OR (r->>'billable')::int <> 200 THEN RAISE EXCEPTION 'FAIL: extra reads %', r; END IF;
  IF (SELECT sum(credits) FROM public.invoice_credit_packs WHERE user_id = '00000000-0000-4000-8000-0000000000c1' AND razorpay_order_id LIKE 'enterprise-included:%') <> 150 THEN
    RAISE EXCEPTION 'FAIL: included reads granted twice'; END IF;
  IF (SELECT sum(quantity) FROM public.enterprise_usage WHERE enterprise_org_id = v_org AND kind = 'reads' AND billable) <> 200 THEN
    RAISE EXCEPTION 'FAIL: extra reads not billed'; END IF;
  RAISE NOTICE 'ok: 150 included reads first, then billed packs of 100; the supplier is never blocked';
END $$;

-- 4. Reminders past 2 per request are billed.
DO $$
DECLARE v_org uuid := (SELECT organization_id FROM public.enterprise_access WHERE email = 'head@buyer.in'); i int;
BEGIN
  FOR i IN 1..3 LOOP
    UPDATE public.supplier_requests SET last_reminded_at = now() + make_interval(days => i * 4) WHERE id = (SELECT request_id FROM t_req WHERE who = 'two');
  END LOOP;
  IF (SELECT reminders_sent FROM public.supplier_requests WHERE id = (SELECT request_id FROM t_req WHERE who = 'two')) <> 3 THEN RAISE EXCEPTION 'FAIL: reminders not counted'; END IF;
  IF (SELECT count(*) FROM public.enterprise_usage WHERE enterprise_org_id = v_org AND kind = 'reminder' AND billable AND unit_paise = 900) <> 1 THEN
    RAISE EXCEPTION 'FAIL: third reminder not billed'; END IF;
  RAISE NOTICE 'ok: the first 2 reminders per request are included; the third is billed';
END $$;

-- 5. Downloads: viewers cannot; past the quote they are billed.
DO $$
DECLARE r jsonb;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000b3');
  BEGIN PERFORM public.record_enterprise_download(); RAISE EXCEPTION 'FAIL: viewer downloaded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000b2');
  r := public.record_enterprise_download();
  r := public.record_enterprise_download();
  IF (r->>'used')::int <> 2 THEN RAISE EXCEPTION 'FAIL: downloads counted %', r; END IF;
  -- Members see use against the quote, never rates or the usage rows themselves.
  IF (SELECT used FROM public.my_enterprise_usage() WHERE kind = 'reports') <> 2 THEN RAISE EXCEPTION 'FAIL: my_enterprise_usage reports'; END IF;
  IF (SELECT used FROM public.my_enterprise_usage() WHERE kind = 'suppliers') <> 3 THEN RAISE EXCEPTION 'FAIL: my_enterprise_usage suppliers'; END IF;
  BEGIN PERFORM 1 FROM public.enterprise_rates; RAISE EXCEPTION 'FAIL: member read rates';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM public.enterprise_usage; RAISE EXCEPTION 'FAIL: member read usage rows';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.service_enterprise_cover_reads('00000000-0000-4000-8000-0000000000c1', 1); RAISE EXCEPTION 'FAIL: browser covered reads';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  IF (SELECT count(*) FROM public.enterprise_usage WHERE kind = 'report' AND billable AND unit_paise = 9900) <> 1 THEN RAISE EXCEPTION 'FAIL: second download not billed'; END IF;
  RAISE NOTICE 'ok: downloads past the quote are billed; viewers cannot download; rates and rows stay private';
END $$;

-- 6. The staff bill adds it up: 1 supplier (1,199), 200 reads (158), 1 reminder (9), 1 report (99), no extra seats.
DO $$
DECLARE v_org uuid := (SELECT organization_id FROM public.enterprise_access WHERE email = 'head@buyer.in'); v_total bigint;
BEGIN
  SELECT sum(amount_paise) INTO v_total FROM private.enterprise_bill(v_org, now() - interval '1 day', now() + interval '1 year');
  IF v_total <> 119900 + 15800 + 900 + 9900 THEN RAISE EXCEPTION 'FAIL: bill total %', v_total; END IF;
  RAISE NOTICE 'ok: the staff bill totals only billable usage at the stored rates';
END $$;

-- 7. Questions past the monthly quote are billed per 1,000 at the stored rate (written by enterprise-intelligence).
DO $$
DECLARE v_org uuid := (SELECT organization_id FROM public.enterprise_access WHERE email = 'head@buyer.in'); v_q bigint;
BEGIN
  INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise)
  SELECT v_org, 'question', 1, true, (SELECT unit_paise FROM public.enterprise_rates WHERE kind = 'questions_1000') FROM generate_series(1, 1000);
  INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise) VALUES (v_org, 'question', 1, false, NULL);
  SELECT amount_paise INTO v_q FROM private.enterprise_bill(v_org, now() - interval '1 day', now() + interval '1 year') WHERE kind = 'question';
  IF v_q <> 299900 THEN RAISE EXCEPTION 'FAIL: 1,000 questions billed %', v_q; END IF;
  RAISE NOTICE 'ok: questions past the quote bill at the rate per 1,000; included ones are free';
END $$;

\echo ALL ENTERPRISE BILLING TESTS PASSED
