-- Behaviour tests for my_finance_insights and my_private_records.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000e1', 'fa@x.in'),
  ('00000000-0000-4000-8000-0000000000e2', 'fb@x.in') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) VALUES
  ('00000000-0000-4000-8000-0000000000e1'),
  ('00000000-0000-4000-8000-0000000000e2') ON CONFLICT DO NOTHING;

INSERT INTO public.financial_documents (user_id, doc_kind, storage_path, sha256, mime_type, size_bytes, figures, monthly) VALUES
  ('00000000-0000-4000-8000-0000000000e1', 'bank_statement', 'e1/a.pdf', repeat('a', 64), 'application/pdf', 100,
   '{"period_from":"2026-04-01","period_to":"2026-09-30","average_monthly_balance_inr":250000}'::jsonb,
   '[{"month":"2026-04","inflow":500000,"outflow":420000,"opening":100000,"closing":180000,"balanced":true,"categories":{"electricity":60000,"other":360000}}]'::jsonb),
  ('00000000-0000-4000-8000-0000000000e1', 'itr', 'e1/b.pdf', repeat('b', 64), 'application/pdf', 100,
   '{"financial_year":"2025-26","gross_turnover_inr":6000000}'::jsonb, '[]'::jsonb),
  ('00000000-0000-4000-8000-0000000000e2', 'bank_statement', 'e2/c.pdf', repeat('c', 64), 'application/pdf', 100,
   '{"average_monthly_balance_inr":999}'::jsonb, '[]'::jsonb);

GRANT USAGE ON SCHEMA public TO authenticated;


-- Records list: own rows only, no figures.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', true);
DO $$
DECLARE r jsonb;
BEGIN
  r := public.my_private_records();
  IF jsonb_array_length(r) <> 2 THEN RAISE EXCEPTION 'FAIL: own records %', r; END IF;
  IF r::text LIKE '%999%' OR r::text LIKE '%gross_turnover%' OR r::text LIKE '%storage_path%' THEN RAISE EXCEPTION 'FAIL: records leak figures or paths %', r; END IF;
  RAISE NOTICE 'ok: the records list shows only the caller''s uploads, with no figures or file paths';
END $$;
-- The table itself stays closed to browsers.
DO $$
BEGIN
  BEGIN PERFORM 1 FROM public.financial_documents LIMIT 1; RAISE EXCEPTION 'FAIL: browser read the table';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: the table is closed to signed-in browsers'; END;
END $$;
COMMIT;

-- Switch off: no figures for anyone.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', true);
DO $$
DECLARE r jsonb;
BEGIN
  r := public.my_finance_insights();
  IF (r->>'enabled')::boolean OR jsonb_array_length(r->'records') <> 0 THEN RAISE EXCEPTION 'FAIL: switch off still returned data %', r; END IF;
  RAISE NOTICE 'ok: with the switch off nothing is returned';
END $$;
COMMIT;

UPDATE public.profiles SET trust_layer_prefs = '{"finance_insights": true}'::jsonb WHERE id IN ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e2');

-- Snapshot (no plan): locked, no figures.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', true);
DO $$
DECLARE r jsonb;
BEGIN
  r := public.my_finance_insights();
  IF r->>'plan' <> 'snapshot' OR jsonb_array_length(r->'records') <> 0 THEN RAISE EXCEPTION 'FAIL: snapshot got data %', r; END IF;
  RAISE NOTICE 'ok: Snapshot gets no figures';
END $$;
COMMIT;

-- Essential: monthly totals without categories, no summary figures.
INSERT INTO public.subscriptions (user_id, tier, billing_cycle, amount, status, starts_at, expires_at)
VALUES ('00000000-0000-4000-8000-0000000000e1', 'basic', 'monthly', 1999, 'active', now() - interval '1 day', now() + interval '20 days');
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', true);
DO $$
DECLARE r jsonb;
BEGIN
  r := public.my_finance_insights();
  IF r->>'plan' <> 'essential' THEN RAISE EXCEPTION 'FAIL: plan %', r->>'plan'; END IF;
  IF r::text LIKE '%categories%' OR r::text LIKE '%gross_turnover%' OR r::text LIKE '%average_monthly_balance%' THEN RAISE EXCEPTION 'FAIL: essential got more than totals %', r; END IF;
  IF r::text NOT LIKE '%"inflow": 500000%' THEN RAISE EXCEPTION 'FAIL: essential missing totals %', r; END IF;
  RAISE NOTICE 'ok: Essential gets monthly totals only';
END $$;
COMMIT;

-- Pro: everything for own records; never another account's.
UPDATE public.subscriptions SET tier = 'pro' WHERE user_id = '00000000-0000-4000-8000-0000000000e1';
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', true);
DO $$
DECLARE r jsonb;
BEGIN
  r := public.my_finance_insights();
  IF r->>'plan' <> 'pro' OR jsonb_array_length(r->'records') <> 2 THEN RAISE EXCEPTION 'FAIL: pro records %', r; END IF;
  IF r::text NOT LIKE '%electricity%' OR r::text NOT LIKE '%gross_turnover_inr%' THEN RAISE EXCEPTION 'FAIL: pro missing data %', r; END IF;
  IF r::text LIKE '%999%' THEN RAISE EXCEPTION 'FAIL: another account''s figures leaked'; END IF;
  RAISE NOTICE 'ok: Pro gets its own figures and categories, never another account''s';
END $$;
COMMIT;

-- The other account, on no plan, still sees nothing; with no session nothing at all.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e2', true);
DO $$
DECLARE r jsonb;
BEGIN
  r := public.my_finance_insights();
  IF jsonb_array_length(r->'records') <> 0 THEN RAISE EXCEPTION 'FAIL: unpaid account got data'; END IF;
  r := public.my_private_records();
  IF jsonb_array_length(r) <> 1 THEN RAISE EXCEPTION 'FAIL: other account records %', r; END IF;
  RAISE NOTICE 'ok: each account sees only its own records';
END $$;
COMMIT;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.my_finance_insights()', 'EXECUTE') OR has_function_privilege('anon', 'public.my_private_records()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: signed-out visitors can call the functions';
  END IF;
  IF has_function_privilege('authenticated', 'public.finance_insights_plan(uuid)', 'EXECUTE') THEN RAISE EXCEPTION 'FAIL: plan helper open to browsers'; END IF;
  RAISE NOTICE 'ok: signed-out visitors cannot call either function, and the plan helper is server only';
END $$;

SELECT 'ALL FINANCE INSIGHTS TESTS PASSED';
