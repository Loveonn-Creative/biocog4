-- Behaviour tests for 20261017100000_solar_signals.sql (run after it).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000a1', 'a@x.in'), ('00000000-0000-4000-8000-0000000000b2', 'b@x.in') ON CONFLICT DO NOTHING;
SELECT pg_temp.expect_error($q$INSERT INTO public.grid_emission_factors (region, kind, kg_per_kwh, source, version) VALUES ('IN', 'combined_margin', 0.8, ' ', 'v1')$q$, 'factor without a source is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.grid_emission_factors (region, kind, kg_per_kwh, source, version) VALUES ('IN', 'average', 0.8, 'X', 'v1')$q$, 'only combined-margin factors');
INSERT INTO public.grid_emission_factors (region, kind, kg_per_kwh, source, version) VALUES ('TEST', 'combined_margin', 0.8, 'Test source', 'vTest');
INSERT INTO public.solar_assets (id, user_id, capacity_kwp, commissioned_on) VALUES ('5a000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 10, '2026-01-01');
INSERT INTO public.solar_readings (asset_id, period_start, period_end, kwh, evidence) VALUES ('5a000000-0000-4000-8000-000000000001', '2026-02-01', '2026-02-28', 1200, 'net_meter_bill');
SELECT pg_temp.expect_error($q$INSERT INTO public.solar_readings (asset_id, period_start, period_end, kwh, evidence) VALUES ('5a000000-0000-4000-8000-000000000001', '2026-03-31', '2026-03-01', 10, 'net_meter_bill')$q$, 'period end before start refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.solar_readings (asset_id, period_start, period_end, kwh, evidence) VALUES ('5a000000-0000-4000-8000-000000000001', '2026-02-01', '2026-02-28', 5, 'net_meter_bill')$q$, 'same period twice refused');
INSERT INTO public.credit_signals (asset_id, method_id, method_version, status, eligible_kwh, uncertainty_pct, checks, inputs_hash) VALUES ('5a000000-0000-4000-8000-000000000001', 'SENSEIBLE-SOLAR-01', '0.1', 'withheld', 1200, 1, '[]', 'h');

GRANT USAGE ON SCHEMA public TO authenticated, anon;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
SELECT pg_temp.check((SELECT count(*) FROM public.solar_assets) = 1 AND (SELECT count(*) FROM public.solar_readings) = 1 AND (SELECT count(*) FROM public.credit_signals) = 1, 'owner reads own asset, readings and signal');
SELECT pg_temp.check((SELECT count(*) FROM public.grid_emission_factors) = 1, 'factors are readable');
SELECT pg_temp.expect_error($q$INSERT INTO public.solar_assets (user_id, capacity_kwp, commissioned_on) VALUES ('00000000-0000-4000-8000-0000000000a1', 5, '2026-01-01')$q$, 'browser cannot write assets');
SELECT pg_temp.expect_error($q$INSERT INTO public.grid_emission_factors (region, kind, kg_per_kwh, source, version) VALUES ('IN', 'combined_margin', 0.1, 'Mine', 'v9')$q$, 'browser cannot write factors');
SELECT pg_temp.expect_error($q$UPDATE public.credit_signals SET central_tco2e = 999$q$, 'browser cannot edit signals');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
SELECT pg_temp.check((SELECT count(*) FROM public.solar_assets) = 0 AND (SELECT count(*) FROM public.credit_signals) = 0, 'other users read nothing');
RESET ROLE;
SELECT 'ALL SOLAR TESTS PASSED' AS result;
