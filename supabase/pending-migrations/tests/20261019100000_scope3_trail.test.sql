-- Behaviour tests for 20261019100000_scope3_trail.sql (run after it).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'a@x.in'), ('00000000-0000-4000-8000-0000000000b2', 'b@x.in'),
  ('00000000-0000-4000-8000-0000000000c3', 'reviewer@x.in') ON CONFLICT DO NOTHING;
-- Three uploads by user A: invoice 1, a re-scan of invoice 1 (other bytes), and an invoice with no number.
INSERT INTO public.documents (id, user_id, document_type, document_hash) VALUES
  ('d0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'invoice', repeat('1', 64)),
  ('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', 'invoice', repeat('2', 64)),
  ('d0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a1', 'invoice', repeat('3', 64));
INSERT INTO public.document_extractions (id, document_id, user_id, document_hash, extraction, extraction_sha256, method_version)
SELECT ('e0000000-0000-4000-8000-00000000000' || n)::uuid, ('d0000000-0000-4000-8000-00000000000' || n)::uuid,
       '00000000-0000-4000-8000-0000000000a1', repeat(n::text, 64), '{"lines": []}'::jsonb, repeat('a', 64), 'SENSEIBLE-SCOPE3-LINES_v1.0'
FROM generate_series(1, 3) n;

-- ---------------------------------------------------------------- extraction
SELECT pg_temp.expect_error($q$UPDATE public.document_extractions SET extraction = '{"lines": [1]}' WHERE id = 'e0000000-0000-4000-8000-000000000001'$q$, 'a sealed extraction cannot be edited');

-- ---------------------------------------------------------------- factors
SELECT pg_temp.expect_error($q$INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, status, created_by, approved_by, approved_at)
  VALUES ('TEST_STEEL', '1', 1, 'hsn:7208', 'IN', 'tonne', 2000, 'secondary_factor', 'cradle-to-gate', 'AR6 GWP100', 'Test', 'T1', 2025, '2025-01-01', 'approved', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', now())$q$, 'the author cannot approve their own factor');
SELECT pg_temp.expect_error($q$INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
  VALUES ('TEST_STEEL', '1', 1, 'hsn:72', 'IN', 'tonne', 2000, 'secondary_factor', 'cradle-to-gate', 'AR6 GWP100', 'Test', 'T1', 2025, '2025-01-01', '00000000-0000-4000-8000-0000000000a1')$q$, 'a 2-digit chapter is too generic to be a material');
SELECT pg_temp.expect_error($q$INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
  VALUES ('TEST_STEEL', '1', 1, 'hsn:7208', 'IN', 'INR', 0.5, 'secondary_factor', 'cradle-to-gate', 'AR6 GWP100', 'Test', 'T1', 2025, '2025-01-01', '00000000-0000-4000-8000-0000000000a1')$q$, 'a spend-based (per rupee) factor is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
  VALUES ('TEST_SUP', '1', 1, 'hsn:7208', 'SUPPLIER:27AAPFU0939F1ZV', 'tonne', 1500, 'secondary_factor', 'cradle-to-gate', 'AR6 GWP100', 'Test', 'T1', 2025, '2025-01-01', '00000000-0000-4000-8000-0000000000a1')$q$, 'a supplier geography must carry a supplier data class');
SELECT pg_temp.expect_error($q$INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
  VALUES ('TEST_SUP', '1', 1, 'hsn:7208', 'SUPPLIER:27AAPFU0939F1ZV', 'tonne', 1500, 'supplier_specific_factor', 'cradle-to-gate', 'AR6 GWP100', 'Test', 'T1', 2025, '2025-01-01', '00000000-0000-4000-8000-0000000000a1')$q$, 'a supplier figure needs its evidence document');
SELECT pg_temp.expect_error($q$INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
  VALUES ('TEST_STEEL', '1', 1, 'hsn:7208', 'IN', 'tonne', 2000, 'secondary_factor', 'cradle-to-gate', 'AR6 GWP100', '  ', 'T1', 2025, '2025-01-01', '00000000-0000-4000-8000-0000000000a1')$q$, 'a factor without a source is refused');

INSERT INTO public.scope3_factors (id, factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
VALUES ('f0000000-0000-4000-8000-000000000001', 'TEST_STEEL', '1', 1, 'hsn:7208', 'IN', 'tonne', 2000, 'secondary_factor', 'cradle-to-gate', 'AR6 GWP100', 'Test source', 'Table 1', 2025, '2025-01-01', '00000000-0000-4000-8000-0000000000a1');
UPDATE public.scope3_factors SET kg_co2e_per_unit = 2100 WHERE id = 'f0000000-0000-4000-8000-000000000001';
SELECT pg_temp.check((SELECT kg_co2e_per_unit FROM public.scope3_factors WHERE factor_key = 'TEST_STEEL') = 2100, 'a draft can still be corrected');
UPDATE public.scope3_factors SET kg_co2e_per_unit = 2000, status = 'approved', approved_by = '00000000-0000-4000-8000-0000000000c3', approved_at = now() WHERE id = 'f0000000-0000-4000-8000-000000000001';
SELECT pg_temp.check((SELECT status FROM public.scope3_factors WHERE factor_key = 'TEST_STEEL') = 'approved', 'a second person approves');
SELECT pg_temp.expect_error($q$UPDATE public.scope3_factors SET kg_co2e_per_unit = 1 WHERE id = 'f0000000-0000-4000-8000-000000000001'$q$, 'an approved factor cannot be edited');
SELECT pg_temp.expect_error($q$UPDATE public.scope3_factors SET status = 'draft' WHERE id = 'f0000000-0000-4000-8000-000000000001'$q$, 'an approved factor cannot return to draft');
SELECT pg_temp.expect_error($q$DELETE FROM public.scope3_factors WHERE id = 'f0000000-0000-4000-8000-000000000001'$q$, 'an approved factor cannot be deleted');

-- ---------------------------------------------------------------- recording
-- A verified steel line: 2 tonnes x 2000 kg/t = 4000 kg.
CREATE OR REPLACE FUNCTION pg_temp.steel_line(p_status text, p_kg numeric, p_reasons text[] DEFAULT '{}', p_hash text DEFAULT repeat('b', 64)) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'line_index', 0, 'inputs_sha256', p_hash, 'supplier_gstin', '27AAPFU0939F1ZV', 'supplier_name', 'Steel Co', 'invoice_number', 'INV-42',
    'invoice_date', '2026-04-10', 'description', 'HR coil', 'hsn_code', '720810', 'quantity', 2, 'unit', 'MT', 'line_total', 100000,
    'source_page', 1, 'source_text', 'HR Coil 2 MT', 'scope', 3, 'scope3_category', 1, 'classification_method', 'HSN',
    'classification_basis', 'HSN 7208: purchased goods', 'material_key', 'hsn:7208',
    'factor_id', 'f0000000-0000-4000-8000-000000000001', 'factor_key', 'TEST_STEEL', 'factor_version', '1', 'factor_value', 2000,
    'factor_unit', 'tonne', 'factor_source', 'Test source, Table 1 (2025)', 'factor_geography', 'IN', 'factor_material', 'hsn:7208',
    'data_class', 'secondary_factor', 'activity_qty', 2, 'activity_unit', 'tonne',
    'formula', '2 MT = 2000 kg = 2 tonne x 2000 kgCO2e/tonne (TEST_STEEL v1) = 4000 kgCO2e',
    'kg_co2e', p_kg, 'status', p_status, 'reasons', to_jsonb(p_reasons), 'checks', '{"invoice_totals": "pass"}'::jsonb, 'confidence', 'low')
$$;
CREATE OR REPLACE FUNCTION pg_temp.record(p_doc int, p_key text, p_lines jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.scope3_record_document(jsonb_build_object(
    'document_id', 'd0000000-0000-4000-8000-00000000000' || p_doc, 'extraction_id', 'e0000000-0000-4000-8000-00000000000' || p_doc,
    'user_id', '00000000-0000-4000-8000-0000000000a1', 'invoice_key', p_key, 'reconciliation', '{"invoice_totals": "pass"}'::jsonb,
    'method_version', 'SENSEIBLE-SCOPE3-LINES_v1.0', 'lines', p_lines))
$$;

SELECT pg_temp.check((pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('verified', 4000))))->>'status' = 'counted', 'invoice 1 is counted');
SELECT pg_temp.check((SELECT status = 'verified' AND kg_co2e = 4000 AND reasons = '{}' FROM public.scope3_lines WHERE document_id = 'd0000000-0000-4000-8000-000000000001' AND is_current), 'its line is verified with 4000 kg');

-- The re-scan of the same invoice: counted once, its line marked duplicate.
SELECT pg_temp.check((pg_temp.record(2, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('verified', 4000))))->>'status' = 'duplicate', 'the re-scan is a duplicate');
SELECT pg_temp.check((SELECT status = 'duplicate' AND reasons @> ARRAY['duplicate_invoice'] FROM public.scope3_lines WHERE document_id = 'd0000000-0000-4000-8000-000000000002' AND is_current), 'its line does not count');
SELECT pg_temp.check((SELECT duplicate_of FROM public.scope3_documents WHERE document_id = 'd0000000-0000-4000-8000-000000000002') = (SELECT id FROM public.scope3_documents WHERE document_id = 'd0000000-0000-4000-8000-000000000001'), 'it points to the counted invoice');
SELECT pg_temp.expect_error($q$INSERT INTO public.scope3_documents (document_id, extraction_id, user_id, invoice_key, status, reconciliation, method_version) VALUES ('d0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a1', repeat('c', 64), 'counted', '{}', 'x')$q$, 'the unique index refuses a second counted copy');

-- No invoice key: a verified line is refused, a held one is kept.
SELECT pg_temp.expect_error($q$SELECT pg_temp.record(3, NULL, jsonb_build_array(pg_temp.steel_line('verified', 4000)))$q$, 'an unidentified invoice cannot have verified lines');
SELECT pg_temp.check((pg_temp.record(3, NULL, jsonb_build_array(pg_temp.steel_line('needs_review', 4000, ARRAY['invoice_identity']))))->>'status' = 'unidentified', 'it is stored for review instead');

-- Database rules behind the method.
SELECT pg_temp.expect_error($q$SELECT pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('verified', 5000, '{}', repeat('d', 64))))$q$, 'kgCO2e must equal activity x factor');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('verified', 4000, ARRAY['line_math'], repeat('d', 64))))$q$, 'a verified line cannot carry open reasons');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('verified', 4000, '{}', repeat('d', 64)) || '{"factor_value": 1000, "activity_qty": 4}'::jsonb))$q$, 'a factor value that differs from the approved factor is refused');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('verified', 4000, '{}', repeat('d', 64)) || '{"scope3_category": 2}'::jsonb))$q$, 'a factor from another category is refused');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('verified', 4000, '{}', repeat('d', 64)) || '{"factor_id": null}'::jsonb))$q$, 'no number without a factor');
SELECT pg_temp.expect_error($q$SELECT pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('needs_data', NULL, '{}', repeat('d', 64))))$q$, 'a line that is not verified must say why');
SELECT pg_temp.expect_error($q$UPDATE public.scope3_lines SET kg_co2e = 1 WHERE document_id = 'd0000000-0000-4000-8000-000000000001'$q$, 'a line is append-only');

-- Recalculation: same inputs keep the row; new inputs replace it and keep history.
SELECT pg_temp.check((pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('verified', 4000))))->>'kept' = '1', 'same inputs: nothing rewritten');
SELECT pg_temp.check((pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('needs_review', 4000, ARRAY['invoice_totals'], repeat('e', 64)))))->>'written' = '1', 'changed inputs: a new row');
SELECT pg_temp.check((SELECT count(*) FROM public.scope3_lines WHERE document_id = 'd0000000-0000-4000-8000-000000000001') = 2
  AND (SELECT count(*) FROM public.scope3_lines WHERE document_id = 'd0000000-0000-4000-8000-000000000001' AND is_current) = 1, 'the earlier row stays as history');
SELECT pg_temp.check((pg_temp.record(1, repeat('c', 64), jsonb_build_array(pg_temp.steel_line('verified', 4000))))->>'written' = '1', 'and back to verified');

-- ---------------------------------------------------------------- read side
SELECT pg_temp.check((SELECT sum(verified_kg) FROM public.scope3_category_totals) = 4000, 'category totals count the verified line once');
SELECT pg_temp.check((SELECT verified_kg = 4000 AND verified_lines = 1 AND scope3_lines = 1 AND secondary_lines = 1 FROM public.scope3_supplier_ledger WHERE supplier_key = '27AAPFU0939F1ZV'), 'supplier ledger by GSTIN, duplicates and unidentified invoices left out');
SELECT pg_temp.check((SELECT count(*) FROM public.scope3_trail) = 3, 'the trail shows every current line with its invoice status');
SELECT pg_temp.check((SELECT extraction_sha256 FROM public.scope3_trail WHERE document_id = 'd0000000-0000-4000-8000-000000000001') = repeat('a', 64), 'the trail reaches the sealed extraction');

-- ---------------------------------------------------------------- access
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
SELECT pg_temp.check((SELECT count(*) FROM public.scope3_trail) = 3, 'the owner reads their trail');
SELECT pg_temp.check((SELECT sum(verified_kg) FROM public.scope3_category_totals) = 4000, 'the owner reads their totals');
SELECT pg_temp.check((SELECT count(*) FROM public.scope3_factors) = 1, 'approved factors are readable');
SELECT pg_temp.expect_error($q$INSERT INTO public.scope3_lines (scope3_document_id, document_id, extraction_id, user_id, line_index, inputs_sha256, description, classification_method, classification_basis, data_class, status, reasons, method_version) SELECT scope3_document_id, document_id, extraction_id, user_id, 9, repeat('f', 64), 'x', 'NONE', 'x', 'unverified', 'needs_data', ARRAY['unclassified'], 'x' FROM public.scope3_lines LIMIT 1$q$, 'the browser cannot write lines');
SELECT pg_temp.expect_error($q$UPDATE public.document_extractions SET model = 'x'$q$, 'the browser cannot touch extractions');
SELECT pg_temp.expect_error($q$SELECT public.scope3_record_document('{}'::jsonb)$q$, 'the browser cannot call the write function');
SELECT pg_temp.expect_error($q$INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by) VALUES ('X_X', '1', 1, 'hsn:7208', 'IN', 'tonne', 1, 'secondary_factor', 'b', 'g', 's', 'r', 2025, '2025-01-01', '00000000-0000-4000-8000-0000000000a1')$q$, 'the browser cannot add factors');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
SELECT pg_temp.check((SELECT count(*) FROM public.scope3_trail) = 0 AND (SELECT count(*) FROM public.scope3_category_totals) = 0 AND (SELECT count(*) FROM public.document_extractions) = 0, 'another user sees nothing');
RESET ROLE;
SET ROLE anon;
SELECT pg_temp.expect_error($q$SELECT count(*) FROM public.scope3_lines$q$, 'anonymous visitors have no access');
RESET ROLE;

-- Retiring a factor keeps the lines that used it.
UPDATE public.scope3_factors SET status = 'retired' WHERE id = 'f0000000-0000-4000-8000-000000000001';
SELECT pg_temp.check((SELECT count(*) FROM public.scope3_lines WHERE factor_id = 'f0000000-0000-4000-8000-000000000001') >= 1, 'retired factor still explains its lines');
-- Deleting an invoice removes its trail with it (cascade), nothing else.
DELETE FROM public.documents WHERE id = 'd0000000-0000-4000-8000-000000000003';
SELECT pg_temp.check(NOT EXISTS (SELECT 1 FROM public.scope3_lines WHERE document_id = 'd0000000-0000-4000-8000-000000000003'), 'deleting an invoice removes its trail');

DO $$ BEGIN RAISE NOTICE 'ALL SCOPE3 TRAIL TESTS PASSED'; END $$;
