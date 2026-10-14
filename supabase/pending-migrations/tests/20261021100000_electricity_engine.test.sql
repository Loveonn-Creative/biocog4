-- Behaviour tests for 20261021100000_electricity_engine.sql (run after it).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: % (%)', p_label, SQLERRM; END $$;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'a@x.in'), ('00000000-0000-4000-8000-0000000000b2', 'b@x.in'), ('00000000-0000-4000-8000-0000000000c3', 'reviewer@x.in')
ON CONFLICT DO NOTHING;
INSERT INTO public.documents (id, user_id, document_type, document_hash) VALUES
  ('d0000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000a1', 'bill', repeat('1', 64)),
  ('d0000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000a1', 'certificate', repeat('2', 64)),
  ('d0000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-0000000000b2', 'bill', repeat('3', 64));

-- ---------------------------------------------------------------- factor registry
CREATE OR REPLACE FUNCTION pg_temp.factor_sql(p_key text, p_kind text, p_gases text, p_gwp text, p_supplier text, p_status text, p_approver text) RETURNS text LANGUAGE sql AS $$
  SELECT format($f$INSERT INTO public.electricity_factors (factor_key, version, kind, country, supplier_ref, kg_per_kwh, gases, gwp_basis, methodology, valid_from, valid_to,
    source_name, source_ref, publication_year, status, created_by, approved_by, approved_at)
    VALUES (%L, '1', %L, 'IN', %L, 0.7, %L, %L, 'weighted average', '2025-04-01', '2026-03-31', 'Test', 'T1', 2025, %L, '00000000-0000-4000-8000-0000000000a1', %L, %s)$f$,
    p_key, p_kind, p_supplier, p_gases, p_gwp, p_status, p_approver, CASE WHEN p_approver IS NULL THEN 'NULL' ELSE 'now()' END)
$$;
SELECT pg_temp.expect_error(pg_temp.factor_sql('T_GRID', 'grid_average', 'CO2', NULL, NULL, 'approved', '00000000-0000-4000-8000-0000000000a1'), 'the author cannot approve their own factor');
SELECT pg_temp.expect_error(pg_temp.factor_sql('T_GRID', 'grid_average', 'CO2e', NULL, NULL, 'draft', NULL), 'a CO2e factor needs its GWP basis');
SELECT pg_temp.expect_error(pg_temp.factor_sql('T_SUP', 'supplier_specific', 'CO2', NULL, NULL, 'draft', NULL), 'a supplier-specific rate needs its supplier');
SELECT pg_temp.expect_error(pg_temp.factor_sql('T_GRID', 'average', 'CO2', NULL, NULL, 'draft', NULL), 'unknown factor kinds are refused');
DO $$ BEGIN
  EXECUTE pg_temp.factor_sql('T_GRID', 'grid_average', 'CO2', NULL, NULL, 'approved', '00000000-0000-4000-8000-0000000000c3');
  EXECUTE pg_temp.factor_sql('T_CM', 'project_combined_margin', 'CO2', NULL, NULL, 'approved', '00000000-0000-4000-8000-0000000000c3');
  EXECUTE pg_temp.factor_sql('T_RM', 'residual_mix', 'CO2e', 'AR5 GWP100', NULL, 'approved', '00000000-0000-4000-8000-0000000000c3');
  EXECUTE pg_temp.factor_sql('T_DRAFT', 'grid_average', 'CO2', NULL, NULL, 'draft', NULL);
END $$;
SELECT pg_temp.expect_error($q$UPDATE public.electricity_factors SET kg_per_kwh = 0.1 WHERE factor_key = 'T_GRID'$q$, 'an approved factor cannot be edited');
SELECT pg_temp.expect_error($q$DELETE FROM public.electricity_factors WHERE factor_key = 'T_GRID'$q$, 'an approved factor cannot be deleted');

-- ---------------------------------------------------------------- framework registry
SELECT pg_temp.expect_error($q$INSERT INTO public.reporting_frameworks (code, version, name, kind, jurisdiction, applicability, scope2_rules, source_name, source_url, source_ref, status, created_by, approved_by, approved_at)
  VALUES ('GHGP_S2', '2015', 'GHG Protocol Scope 2 Guidance', 'voluntary', 'GLOBAL', '{}', '{"dual_reporting": true}', 'WRI/WBCSD', 'https://ghgprotocol.org/scope-2-guidance', 'ch. 4', 'approved', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', now())$q$, 'a framework needs a second approver');
SELECT pg_temp.expect_error($q$INSERT INTO public.reporting_frameworks (code, version, name, kind, jurisdiction, applicability, scope2_rules, source_name, source_url, source_ref, created_by)
  VALUES ('GHGP_S2', '2015', 'x', 'voluntary', 'GLOBAL', '{}', '{}', 'WRI', 'not a url', 'r', '00000000-0000-4000-8000-0000000000a1')$q$, 'a framework needs a source URL');
SELECT pg_temp.expect_error($q$INSERT INTO public.reporting_frameworks (code, version, name, kind, jurisdiction, applicability, scope2_rules, source_name, source_url, source_ref, created_by)
  VALUES ('XY_TEST', '1', 'x', 'law', 'IN', '{}', '{}', 'S', 'https://x.org', 'r', '00000000-0000-4000-8000-0000000000a1')$q$, 'mandatory, voluntary and customer are the only kinds');

-- ---------------------------------------------------------------- activities
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_activities (user_id, document_id, line_key, country, country_source, status, method_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-0000000000e1', 'x', 'IN', 'profile', 'valid', 'v')$q$, 'valid consumption needs kWh and its period');
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_activities (user_id, document_id, line_key, country_source, status, method_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-0000000000e1', 'x', 'unknown', 'needs_data', 'v')$q$, 'consumption that needs data says why');
INSERT INTO public.electricity_activities (id, user_id, document_id, line_key, country, country_source, period_start, period_end, quantity_printed, unit_printed, kwh, status, method_version) VALUES
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-0000000000e1', 'billed', 'IN', 'profile', '2025-06-01', '2025-06-30', 1000, 'kWh', 1000, 'valid', 'v'),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000b2', 'd0000000-0000-4000-8000-0000000000e3', 'billed', 'IN', 'bill', '2025-06-01', '2025-06-30', 500, 'kWh', 500, 'valid', 'v');
INSERT INTO public.electricity_activities (id, user_id, document_id, line_key, country, country_source, quantity_printed, unit_printed, status, reasons, method_version) VALUES
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-0000000000e1', 'kvah', 'IN', 'profile', 1200, 'kVAh', 'needs_data', ARRAY['apparent_or_reactive_energy'], 'v');
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_activities (user_id, document_id, line_key, country, country_source, period_start, period_end, kwh, status, method_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-0000000000e1', 'billed', 'IN', 'profile', '2025-06-01', '2025-06-30', 1, 'valid', 'v')$q$, 'the same bill line is recorded once');

-- ---------------------------------------------------------------- instruments
INSERT INTO public.electricity_instruments (id, user_id, type, scheme, certificate_ref, mwh, generation_country, vintage_start, vintage_end, kg_per_kwh, retired, retirement_ref, beneficiary_confirmed, evidence_document_id)
VALUES ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'eac', 'I-REC', 'IREC-IN-0001-0400', 0.4, 'IN', '2025-05-01', '2025-05-31', 0, true, 'RET-1', true, 'd0000000-0000-4000-8000-0000000000e2');
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_instruments (user_id, type, scheme, certificate_ref, mwh, generation_country, vintage_start, vintage_end, kg_per_kwh)
  VALUES ('00000000-0000-4000-8000-0000000000b2', 'eac', 'i-rec ', ' irec-in-0001-0400', 0.4, 'IN', '2025-05-01', '2025-05-31', 0)$q$, 'the same certificate cannot be registered twice, by anyone');
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_instruments (user_id, type, scheme, certificate_ref, mwh, generation_country, vintage_start, vintage_end, kg_per_kwh, retired)
  VALUES ('00000000-0000-4000-8000-0000000000a1', 'eac', 'I-REC', 'IREC-2', 1, 'IN', '2025-05-01', '2025-05-31', 0, true)$q$, 'a retired certificate needs its retirement reference');
INSERT INTO public.electricity_instruments (id, user_id, type, scheme, certificate_ref, mwh, generation_country, vintage_start, vintage_end, kg_per_kwh)
VALUES ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000b2', 'eac', 'I-REC', 'IREC-B-1', 10, 'IN', '2025-05-01', '2025-05-31', 0);

-- ---------------------------------------------------------------- allocations
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_allocations (instrument_id, activity_id, user_id, reporting_year, kwh, method_version)
  VALUES ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'FY2025-26', 401, 'v')$q$, 'not more than the instrument holds');
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_allocations (instrument_id, activity_id, user_id, reporting_year, kwh, method_version)
  VALUES ('10000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'FY2025-26', 10, 'v')$q$, 'not another owner''s instrument');
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_allocations (instrument_id, activity_id, user_id, reporting_year, kwh, method_version)
  VALUES ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', 'FY2025-26', 10, 'v')$q$, 'not consumption that still needs data');
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_allocations (instrument_id, activity_id, user_id, reporting_year, kwh, method_version)
  VALUES ('10000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000b2', 'FY2025-26', 501, 'v')$q$, 'not more than the consumption');

-- ---------------------------------------------------------------- calculations via scope2_record
CREATE OR REPLACE FUNCTION pg_temp.calc(p_method text, p_factor text, p_kind text, p_fkwh numeric, p_ikwh numeric, p_kg numeric, p_status text, p_hash text DEFAULT repeat('a', 64), p_reasons text[] DEFAULT '{}') RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('activity_id', 'a0000000-0000-4000-8000-000000000001', 'reporting_year', 'FY2025-26', 'method', p_method,
    'period_start', '2025-06-01', 'period_end', '2025-06-30', 'kwh', 1000,
    'factor_id', (SELECT id FROM public.electricity_factors WHERE factor_key = p_factor), 'factor_key', p_factor, 'factor_version', CASE WHEN p_factor IS NULL THEN NULL ELSE '1' END,
    'factor_kind', p_kind, 'factor_value', (SELECT kg_per_kwh FROM public.electricity_factors WHERE factor_key = p_factor),
    'factor_gases', (SELECT gases FROM public.electricity_factors WHERE factor_key = p_factor), 'factor_kwh', p_fkwh,
    'instrument_kwh', p_ikwh, 'instrument_kg', 0, 'kg', p_kg, 'status', p_status, 'formula', 'f', 'reasons', to_jsonb(p_reasons), 'inputs_sha256', p_hash)
$$;
CREATE OR REPLACE FUNCTION pg_temp.record(p_allocs jsonb, p_calcs jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.scope2_record(jsonb_build_object('user_id', '00000000-0000-4000-8000-0000000000a1', 'method_version', 'SENSEIBLE-SCOPE2_v1.0', 'allocations', p_allocs, 'calculations', p_calcs))
$$;
SELECT pg_temp.expect_error($q$SELECT pg_temp.record('[]', jsonb_build_array(pg_temp.calc('location', 'T_CM', 'grid_average', 1000, 0, 700, 'calculated')))$q$, 'a combined-margin factor can never produce a Scope 2 result');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record('[]', jsonb_build_array(pg_temp.calc('location', 'T_DRAFT', 'grid_average', 1000, 0, 700, 'calculated')))$q$, 'a draft factor cannot be used');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record('[]', jsonb_build_array(pg_temp.calc('location', 'T_GRID', 'grid_average', 1000, 0, 650, 'calculated')))$q$, 'kg must equal kWh x factor');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record('[]', jsonb_build_array(pg_temp.calc('location', 'T_RM', 'residual_mix', 1000, 0, 700, 'calculated')))$q$, 'location-based uses only the grid average');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record('[]', jsonb_build_array(pg_temp.calc('location', NULL, NULL, NULL, 0, NULL, 'unresolved')))$q$, 'an unresolved result must say why');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record('[]', jsonb_build_array(pg_temp.calc('location', NULL, NULL, NULL, 0, 0, 'calculated')))$q$, 'no zero without a factor');

SELECT pg_temp.check((pg_temp.record(
  '[{"instrument_id": "10000000-0000-4000-8000-000000000001", "activity_id": "a0000000-0000-4000-8000-000000000001", "reporting_year": "FY2025-26", "kwh": 400}]',
  jsonb_build_array(pg_temp.calc('location', 'T_GRID', 'grid_average', 1000, 0, 700, 'calculated'),
                    pg_temp.calc('market', 'T_RM', 'residual_mix', 600, 400, 420, 'calculated'))))->>'written' = '2', 'location and market results recorded');
SELECT pg_temp.check((SELECT kg = 700 AND coalesce(instrument_kwh, 0) = 0 FROM public.scope2_totals WHERE method = 'location' AND reporting_year = 'FY2025-26'), 'location-based total');
SELECT pg_temp.check((SELECT kg = 420 AND instrument_kwh = 400 FROM public.scope2_totals WHERE method = 'market' AND reporting_year = 'FY2025-26'), 'market-based total, reported alongside');
SELECT pg_temp.check((pg_temp.record(
  '[{"instrument_id": "10000000-0000-4000-8000-000000000001", "activity_id": "a0000000-0000-4000-8000-000000000001", "reporting_year": "FY2025-26", "kwh": 400}]',
  jsonb_build_array(pg_temp.calc('location', 'T_GRID', 'grid_average', 1000, 0, 700, 'calculated'),
                    pg_temp.calc('market', 'T_RM', 'residual_mix', 600, 400, 420, 'calculated'))))->>'kept' = '2', 'same inputs: nothing rewritten (idempotent)');
SELECT pg_temp.check((SELECT count(*) FROM public.electricity_allocations WHERE is_current) = 1 AND (SELECT count(*) FROM public.electricity_allocations) = 2, 'allocations replaced as a set, history kept, no double allocation');
SELECT pg_temp.check((pg_temp.record('[]', jsonb_build_array(pg_temp.calc('location', 'T_GRID', 'grid_average', 1000, 0, 700, 'calculated', repeat('b', 64)))))->>'written' = '1', 'changed inputs: a new version');
SELECT pg_temp.check((SELECT count(*) FROM public.electricity_calculations WHERE method = 'location') = 2 AND (SELECT count(*) FROM public.electricity_calculations WHERE method = 'market' AND is_current) = 0, 'earlier versions kept; results no longer produced stop being current');
SELECT pg_temp.expect_error($q$UPDATE public.electricity_calculations SET kg = 1$q$, 'a calculation is append-only');

-- ---------------------------------------------------------------- access
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
SELECT pg_temp.check((SELECT count(*) FROM public.electricity_activities) = 2 AND (SELECT count(*) FROM public.scope2_totals) >= 1, 'the owner reads their consumption and totals');
SELECT pg_temp.check((SELECT count(*) FROM public.electricity_factors) = 3, 'approved factors are readable, drafts are not');
SELECT pg_temp.expect_error($q$INSERT INTO public.electricity_instruments (user_id, type, scheme, mwh, generation_country, vintage_start, vintage_end, kg_per_kwh) VALUES ('00000000-0000-4000-8000-0000000000a1', 'eac', 'I-REC', 1, 'IN', '2025-01-01', '2025-01-31', 0)$q$, 'the browser cannot register instruments directly');
SELECT pg_temp.expect_error($q$SELECT public.scope2_record('{}'::jsonb)$q$, 'the browser cannot call the write function');
SELECT pg_temp.expect_error($q$UPDATE public.electricity_activities SET kwh = 1$q$, 'the browser cannot edit consumption');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
SELECT pg_temp.check((SELECT count(*) FROM public.electricity_calculations) = 0 AND (SELECT count(*) FROM public.electricity_instruments) = 1, 'another user sees only their own rows');
RESET ROLE;
SET ROLE anon;
SELECT pg_temp.expect_error($q$SELECT count(*) FROM public.electricity_calculations$q$, 'anonymous visitors have no access');
RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'ALL SCOPE2 ENGINE TESTS PASSED'; END $$;
