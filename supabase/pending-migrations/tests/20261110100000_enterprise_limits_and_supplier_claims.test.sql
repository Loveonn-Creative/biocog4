-- Behaviour tests for 20261110100000_enterprise_limits_and_supplier_claims.sql (run_enterprise_limits_claims.sh).
\set ON_ERROR_STOP on
SET client_min_messages = notice;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'head@buyer.in', now()),
  ('00000000-0000-4000-8000-0000000000a2', 'viewer@buyer.in', now()),
  ('00000000-0000-4000-8000-0000000000d1', 'one@supplier.in', now()),
  ('00000000-0000-4000-8000-0000000000d2', 'accounts@supplier.in', now()),
  ('00000000-0000-4000-8000-0000000000d9', 'stranger@elsewhere.in', now())
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) SELECT id FROM auth.users WHERE email LIKE '%.in' ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claim.sub', coalesce(p::text, ''), false); END $$;

SELECT private.grant_enterprise_access('head@buyer.in', 'Sample Buyer Ltd', 2, 'staff');
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
  PERFORM public.claim_enterprise_access();
  RESET ROLE;
END $$;
INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
SELECT organization_id, '00000000-0000-4000-8000-0000000000a2', 'viewer', now() FROM public.enterprise_access WHERE email = 'head@buyer.in';
CREATE TEMP TABLE t_req (request_id uuid, token text, who text);
GRANT SELECT ON t_req TO authenticated;

CREATE OR REPLACE FUNCTION pg_temp.org() RETURNS uuid LANGUAGE sql AS $$ SELECT organization_id FROM public.enterprise_access WHERE email = 'head@buyer.in' $$;
CREATE OR REPLACE FUNCTION pg_temp.ask(p_name text, p_email text, p_start date, p_end date) RETURNS void LANGUAGE sql AS $$
  INSERT INTO t_req SELECT r.request_id, r.token, p_name
  FROM public.service_create_supplier_request(pg_temp.org(), '00000000-0000-4000-8000-0000000000a1', p_name, p_email, NULL, 'Yarn', p_start, p_end) r $$;

-- 1. Defaults keep billing; the same supplier asked for another period is not a new supplier.
DO $$
BEGIN
  PERFORM pg_temp.ask('Supplier One', 'one@supplier.in', '2025-04-01', '2026-03-31');
  PERFORM pg_temp.ask('Supplier Two', 'two@supplier.in', '2025-04-01', '2026-03-31');
  PERFORM pg_temp.ask('Supplier One', 'one@supplier.in', '2024-04-01', '2025-03-31');
  IF (SELECT count(*) FROM public.enterprise_usage WHERE enterprise_org_id = pg_temp.org() AND kind = 'supplier') <> 0 THEN
    RAISE EXCEPTION 'FAIL: repeat supplier counted as new'; END IF;
  PERFORM pg_temp.ask('Supplier Three', 'three@supplier.in', '2025-04-01', '2026-03-31');
  IF (SELECT count(*) FROM public.enterprise_usage WHERE enterprise_org_id = pg_temp.org() AND kind = 'supplier' AND billable AND unit_paise = 119900) <> 1 THEN
    RAISE EXCEPTION 'FAIL: third supplier not billed at the stored rate'; END IF;
  RAISE NOTICE 'ok: by default extra suppliers are billed, and a supplier counts once a contract year';
END $$;

-- 2. Terms are checked; "stop" refuses the next supplier; a custom rate bills at that rate.
DO $$
BEGIN
  BEGIN UPDATE public.enterprise_access SET over_limit = '{"suppliers":"maybe"}' WHERE email = 'head@buyer.in'; RAISE EXCEPTION 'FAIL: bad rule accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.enterprise_access SET rates = '{"supplier":-5}' WHERE email = 'head@buyer.in'; RAISE EXCEPTION 'FAIL: negative rate accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.enterprise_access SET over_limit = '{"suppliers":"stop"}' WHERE email = 'head@buyer.in';
  BEGIN PERFORM pg_temp.ask('Supplier Four', 'four@supplier.in', '2025-04-01', '2026-03-31'); RAISE EXCEPTION 'FAIL: stop rule let a supplier in';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.enterprise_access SET over_limit = '{}', rates = '{"supplier":50000}' WHERE email = 'head@buyer.in';
  PERFORM pg_temp.ask('Supplier Four', 'four@supplier.in', '2025-04-01', '2026-03-31');
  IF NOT EXISTS (SELECT 1 FROM public.enterprise_usage WHERE enterprise_org_id = pg_temp.org() AND kind = 'supplier' AND unit_paise = 50000) THEN
    RAISE EXCEPTION 'FAIL: custom supplier rate not used'; END IF;
  RAISE NOTICE 'ok: terms are validated, stop refuses, custom rates bill';
END $$;

-- 3. Downloads and questions follow their rule.
DO $$
DECLARE j jsonb;
BEGIN
  UPDATE public.enterprise_access SET reports_included = 1, questions_per_month = 1, over_limit = '{"reports":"stop","questions":"stop"}' WHERE email = 'head@buyer.in';
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
  PERFORM public.record_enterprise_download('supplier_sheet');
  BEGIN PERFORM public.record_enterprise_download('supplier_sheet'); RAISE EXCEPTION 'FAIL: download past a stop limit';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'download limit reached' THEN RAISE; END IF; END;
  IF NOT (public.service_enterprise_question(pg_temp.org(), false)->>'allowed')::boolean THEN RAISE EXCEPTION 'FAIL: first question refused'; END IF;
  PERFORM public.service_enterprise_question(pg_temp.org(), true);
  IF (public.service_enterprise_question(pg_temp.org(), false)->>'allowed')::boolean THEN RAISE EXCEPTION 'FAIL: question past a stop limit allowed'; END IF;
  UPDATE public.enterprise_access SET over_limit = '{}', rates = '{"questions_1000":100000}' WHERE email = 'head@buyer.in';
  j := public.service_enterprise_question(pg_temp.org(), true);
  IF NOT EXISTS (SELECT 1 FROM public.enterprise_usage WHERE enterprise_org_id = pg_temp.org() AND kind = 'question' AND billable AND unit_paise = 100000) THEN
    RAISE EXCEPTION 'FAIL: extra question not billed at the custom rate'; END IF;
  RAISE NOTICE 'ok: downloads and questions stop or bill as agreed';
END $$;

-- 4. Seats: "stop" caps the team at the quote; "bill" keeps the ceiling.
DO $$
BEGIN
  UPDATE public.enterprise_access SET seats_included = 7, over_limit = '{"seats":"stop"}' WHERE email = 'head@buyer.in';
  IF (SELECT max_members FROM public.organizations WHERE id = pg_temp.org()) <> 7 THEN RAISE EXCEPTION 'FAIL: stop seats not applied'; END IF;
  UPDATE public.enterprise_access SET over_limit = '{}' WHERE email = 'head@buyer.in';
  IF (SELECT max_members FROM public.organizations WHERE id = pg_temp.org()) <> private.enterprise_seat_ceiling() THEN RAISE EXCEPTION 'FAIL: bill seats not restored'; END IF;
  RAISE NOTICE 'ok: seats follow the rule';
END $$;

-- 5. Claims: a request id with someone else''s code finds nothing; a forwarded link works and shows who opened it.
DO $$
DECLARE v_one uuid := (SELECT request_id FROM t_req WHERE who = 'Supplier One' LIMIT 1);
        v_two_token text := (SELECT token FROM t_req WHERE who = 'Supplier Two');
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000d9');
  BEGIN PERFORM public.accept_supplier_request(v_one, 'not-a-real-code'); RAISE EXCEPTION 'FAIL: id plus fake code claimed';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN PERFORM public.accept_supplier_request(v_one, NULL); RAISE EXCEPTION 'FAIL: id alone claimed for a stranger';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- A code always claims its own request, never the id passed next to it.
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000d2');
  IF public.accept_supplier_request(v_one, v_two_token) = v_one THEN RAISE EXCEPTION 'FAIL: code claimed a different request'; END IF;
  RESET ROLE;
  IF (SELECT claimed_email FROM public.supplier_requests WHERE token_hash = encode(sha256(convert_to(v_two_token, 'UTF8')), 'hex')) <> 'accounts@supplier.in' THEN
    RAISE EXCEPTION 'FAIL: claiming email not recorded'; END IF;
  IF (SELECT supplier_user_id FROM public.supplier_requests WHERE id = v_one) IS NOT NULL THEN RAISE EXCEPTION 'FAIL: request one was touched'; END IF;
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000d9');
  BEGIN PERFORM public.accept_supplier_request(NULL, v_two_token); RAISE EXCEPTION 'FAIL: second account took a claimed request';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ok: links claim only their own request, forwarding works and the claim is visible';
END $$;

-- 6. A reminder keeps earlier links working; Send new link removes the claim and kills every earlier link.
DO $$
DECLARE v_req uuid; v_old text := (SELECT token FROM t_req WHERE who = 'Supplier Two'); v_new text;
BEGIN
  SELECT id INTO v_req FROM public.supplier_requests WHERE token_hash = encode(sha256(convert_to(v_old, 'UTF8')), 'hex');
  SELECT token INTO v_new FROM public.service_reissue_supplier_link(v_req, '00000000-0000-4000-8000-0000000000a1');
  IF NOT EXISTS (SELECT 1 FROM public.supplier_request_preview(v_old)) THEN RAISE EXCEPTION 'FAIL: reminder broke the first link'; END IF;
  INSERT INTO public.supplier_consents (request_id, supplier_user_id, consent_version, consent_text_hash)
  VALUES (v_req, '00000000-0000-4000-8000-0000000000d2', 'v1', repeat('a', 64));
  SELECT token INTO v_new FROM public.service_reset_supplier_link(v_req, '00000000-0000-4000-8000-0000000000a1');
  IF EXISTS (SELECT 1 FROM public.supplier_request_preview(v_old)) THEN RAISE EXCEPTION 'FAIL: old link works after reset'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.supplier_request_preview(v_new)) THEN RAISE EXCEPTION 'FAIL: new link does not work'; END IF;
  IF EXISTS (SELECT 1 FROM public.supplier_requests WHERE id = v_req AND (supplier_user_id IS NOT NULL OR claimed_email IS NOT NULL OR status <> 'sent' OR link_reset_at IS NULL)) THEN
    RAISE EXCEPTION 'FAIL: claim not removed'; END IF;
  IF EXISTS (SELECT 1 FROM public.supplier_consents WHERE request_id = v_req AND withdrawn_at IS NULL) THEN RAISE EXCEPTION 'FAIL: consent still active'; END IF;
  BEGIN PERFORM public.service_reset_supplier_link(v_req, '00000000-0000-4000-8000-0000000000a1'); RAISE EXCEPTION 'FAIL: reset twice in a day';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'reset in the last day' THEN RAISE; END IF; END;
  BEGIN PERFORM public.service_reset_supplier_link(v_req, '00000000-0000-4000-8000-0000000000a2'); RAISE EXCEPTION 'FAIL: viewer reset a link';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'ok: reminders keep links, Send new link removes the claim';
END $$;

-- 7. Covered reads stop when the request expires, and "stop" never buys extra reads.
DO $$
DECLARE v_req uuid := (SELECT request_id FROM t_req WHERE who = 'Supplier One' AND token IS NOT NULL ORDER BY request_id LIMIT 1);
BEGIN
  UPDATE public.supplier_requests SET supplier_user_id = '00000000-0000-4000-8000-0000000000d1', status = 'opened' WHERE id IN (SELECT request_id FROM t_req WHERE who = 'Supplier One');
  UPDATE public.enterprise_access SET reads_per_supplier = 5, over_limit = '{"reads":"stop"}' WHERE email = 'head@buyer.in';
  IF (public.service_enterprise_cover_reads('00000000-0000-4000-8000-0000000000d1', 8)->>'reads')::int <> 5 THEN RAISE EXCEPTION 'FAIL: stop rule did not cap reads at the quote'; END IF;
  IF (public.service_enterprise_cover_reads('00000000-0000-4000-8000-0000000000d1', 1)->>'covered')::boolean THEN RAISE EXCEPTION 'FAIL: extra reads bought under stop'; END IF;
  UPDATE public.enterprise_access SET over_limit = '{}' WHERE email = 'head@buyer.in';
  UPDATE public.supplier_requests SET expires_at = now() - interval '1 day' WHERE id IN (SELECT request_id FROM t_req WHERE who = 'Supplier One');
  IF (public.service_enterprise_cover_reads('00000000-0000-4000-8000-0000000000d1', 1)->>'covered')::boolean THEN RAISE EXCEPTION 'FAIL: reads covered after expiry'; END IF;
  RAISE NOTICE 'ok: covered reads respect expiry and the stop rule';
END $$;

-- 8. Profile usage: owners see amounts, viewers see counts only.
DO $$
DECLARE v_amt bigint; v_rule text;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a1');
  SELECT extra_paise, over_limit INTO v_amt, v_rule FROM public.my_enterprise_usage() WHERE kind = 'suppliers';
  IF v_amt IS NULL OR v_amt <= 0 OR v_rule <> 'bill' THEN RAISE EXCEPTION 'FAIL: owner usage % %', v_amt, v_rule; END IF;
  PERFORM pg_temp.as_user('00000000-0000-4000-8000-0000000000a2');
  IF EXISTS (SELECT 1 FROM public.my_enterprise_usage() WHERE extra_paise IS NOT NULL) THEN RAISE EXCEPTION 'FAIL: viewer sees amounts'; END IF;
  IF (SELECT count(*) FROM public.my_enterprise_usage()) <> 6 THEN RAISE EXCEPTION 'FAIL: usage rows'; END IF;
  RESET ROLE;
  RAISE NOTICE 'ok: usage shows rules and extras, amounts for owners and admins';
END $$;

-- 9. Browsers cannot call the service functions.
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.service_enterprise_question(pg_temp.org(), true); RAISE EXCEPTION 'FAIL: browser counted a question';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.service_reset_supplier_link(gen_random_uuid(), gen_random_uuid()); RAISE EXCEPTION 'FAIL: browser reset a link';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'ok: service functions are server-only';
END $$;

\echo ALL ENTERPRISE LIMIT AND CLAIM TESTS PASSED
