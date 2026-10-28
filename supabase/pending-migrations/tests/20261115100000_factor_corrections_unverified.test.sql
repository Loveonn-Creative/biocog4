-- Behaviour tests for 20261115100000_factor_corrections_unverified. Run by
-- run_factor_corrections.sh, which passes the migration, rollback and dry run
-- paths as :mig, :rb and :dry.
\set ON_ERROR_STOP on
SET client_min_messages = notice;

CREATE OR REPLACE FUNCTION pg_temp.ok(label text, cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok %', label;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.row_of(rid text) RETURNS public.emissions LANGUAGE sql AS $$
  SELECT * FROM public.emissions WHERE id = ('00000000-0000-4000-8000-00000000f' || rid)::uuid
$$;
CREATE OR REPLACE FUNCTION pg_temp.notes_of(rid text) RETURNS jsonb LANGUAGE sql AS $$
  SELECT verification_notes::jsonb FROM public.emissions WHERE id = ('00000000-0000-4000-8000-00000000f' || rid)::uuid
$$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000f1', 'f@example.in') ON CONFLICT DO NOTHING;
-- Documents by invoice date: 31 Mar 2025 (FY 2024-25), 1 Apr 2025 (FY 2025-26),
-- 10 Jul 2023 (FY 2023-24), none (uploaded 20 Oct 2026, FY 2026-27), 1 Jun 2010.
INSERT INTO public.documents (id, user_id, document_type, invoice_date, created_at) VALUES
 ('00000000-0000-4000-8000-00000000df0a', '00000000-0000-4000-8000-0000000000f1', 'invoice', '2025-03-31', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000df0b', '00000000-0000-4000-8000-0000000000f1', 'invoice', '2025-04-01', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000df0c', '00000000-0000-4000-8000-0000000000f1', 'invoice', '2023-07-10', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000df0d', '00000000-0000-4000-8000-0000000000f1', 'invoice', NULL, '2026-10-20T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000df0e', '00000000-0000-4000-8000-0000000000f1', 'invoice', '2010-06-01', '2025-04-03T10:00:00Z');

INSERT INTO public.emissions (id, user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg, verified, verification_notes, created_at) VALUES
 -- corrected
 ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 100, 'litre', 2.68, 268, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:DIESEL","classificationMethod":"HSN","sourceDescription":"HSD","factorSetVersion":"IND_EF_2026_10","factorCitation":"BIOCOG_MVR_INDIA v1.0 (unchanged)","assumptions":[]}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f003', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 50, 'litre', 2.31, 115.5, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:PETROL","sourceDescription":"Petrol"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f004', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 1000, 'kg', 2.42, 2420, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:COAL","sourceDescription":"Coal","assumptions":["Converted 1 t to 1000 kg"]}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f007', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 2, 'electricity', 1000, 'kWh', 0.71, 710, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG","sourceDescription":"Units consumed","assumptions":["Grid factor for IN"]}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f008', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0b', 2, 'electricity', 1000, 'kWh', 0.71, 710, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG","sourceDescription":"Units consumed"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f009', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0c', 2, 'electricity', 1000, 'kWh', 0.71, 710, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG","sourceDescription":"Units consumed"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f010', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0d', 2, 'electricity', 1000, 'kWh', 0.71, 710, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG","sourceDescription":"Units consumed"}', '2026-10-20T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f011', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0e', 2, 'electricity', 1000, 'kWh', 0.71, 710, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG","sourceDescription":"Units consumed"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f020', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 2000, 'kg', 2.42, 4840, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:COAL","sourceDescription":"Non-coking coal ROM"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f012', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0b', 2, 'electricity', 342, 'kWh', 0.708, 242.14, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.0:INDIA_GRID_AVG","sourceDescription":"Energy charges"}', '2025-04-03T10:00:00Z'),
 -- untouched
 ('00000000-0000-4000-8000-00000000f002', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 100, 'litre', 2.68, 268, true, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:DIESEL","sourceDescription":"HSD"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f005', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 1000, 'kg', 2.42, 2420, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:COAL","sourceDescription":"Coal GCV 5500 kcal/kg"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f006', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 1000, 'kg', 2.42, 2420, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:COAL","sourceDescription":"Imported steam coal"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f013', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 10, 'litre', 2.68, 26.8, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:DIESEL","sourceDescription":"HSD"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f014', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 10, 'litre', 2.645, 26.45, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.2:DIESEL","sourceDescription":"HSD"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f015', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 19, 'kg', 2.98, 56.62, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:LPG","sourceDescription":"LPG"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f016', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 10, 'litre', 2.68, 26.8, false, 'diesel, plain text note', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f017', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 10, 'litre', 2.7, 27, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:DIESEL","sourceDescription":"HSD"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f018', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 10, 'kg', 2.75, 27.5, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:CNG","sourceDescription":"CNG"}', '2025-04-03T10:00:00Z'),
 ('00000000-0000-4000-8000-00000000f019', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000df0a', 1, 'fuel', 1000, 'kg', 2.42, 2420, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:COAL","sourceDescription":"Lignite"}', '2025-04-03T10:00:00Z');

-- f013 already has a ledger row (failed an earlier verification): kept.
INSERT INTO public.compliance_ledger (id, user_id, emission_id, document_hash, emission_category, co2_kg, emission_factor, activity_data, methodology_version, scope, verification_status)
VALUES ('00000000-0000-4000-8000-00000000fe13', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000f013', 'h', 'fuel', 26.8, 2.68, 10, 'BIOCOG_MVR_IN_v1.1', 1, 'needs_review');

CREATE TEMP TABLE before_rows AS SELECT id, co2_kg, emission_factor, verification_notes, verified FROM public.emissions WHERE user_id = '00000000-0000-4000-8000-0000000000f1';
CREATE TEMP TABLE events_before AS SELECT CASE WHEN to_regclass('public.record_events') IS NULL THEN -1 ELSE 0 END AS n;
DO $$ BEGIN IF to_regclass('public.record_events') IS NOT NULL THEN EXECUTE 'UPDATE events_before SET n = (SELECT count(*) FROM public.record_events)'; END IF; END $$;

\echo DRY RUN START
\i :dry
\echo DRY RUN END
SELECT pg_temp.ok('dry run changed no row', NOT EXISTS (
  SELECT 1 FROM before_rows b JOIN public.emissions e USING (id)
   WHERE e.co2_kg IS DISTINCT FROM b.co2_kg OR e.emission_factor IS DISTINCT FROM b.emission_factor OR e.verification_notes IS DISTINCT FROM b.verification_notes));

\i :mig

-- Fuels
SELECT pg_temp.ok('diesel 100 L: 2.645 and 264.5 kg', (SELECT emission_factor = 2.645 AND co2_kg = 264.5 FROM pg_temp.row_of('001')));
SELECT pg_temp.ok('diesel notes: v1.2 key, citation with the arithmetic, IND_EF_2026_11, previous values',
  (SELECT n ->> 'factorSource' = 'BIOCOG_MVR_INDIA_v1.2:DIESEL'
      AND n ->> 'factorCitation' = 'IPCC 2006 Vol 2 Ch 1, Table 1.2 NCV 43.0 TJ/Gg x Table 1.4 74,100 kgCO2/TJ = 3.186 kgCO2/kg x 0.83 kg/L (CEA CO2 Baseline Database v22.0, Appendix B) = 2.645 kgCO2/L'
      AND n ->> 'factorSetVersion' = 'IND_EF_2026_11'
      AND (n -> 'factorCorrection' ->> 'previousFactor')::numeric = 2.68
      AND (n -> 'factorCorrection' ->> 'previousCo2Kg')::numeric = 268
      AND n -> 'factorCorrection' ->> 'previousFactorSource' = 'BIOCOG_MVR_INDIA_v1.1:DIESEL'
      AND n -> 'factorCorrection' ->> 'previousFactorSetVersion' = 'IND_EF_2026_10'
      AND n ->> 'classificationMethod' = 'HSN' AND n ->> 'sourceDescription' = 'HSD'
      AND n -> 'assumptions' = '[]'::jsonb
     FROM pg_temp.notes_of('001') n));
SELECT pg_temp.ok('petrol 50 L: 2.176 and 108.8 kg, PPAC citation', (SELECT emission_factor = 2.176 AND co2_kg = 108.8 FROM pg_temp.row_of('003'))
  AND (SELECT n ->> 'factorCitation' LIKE '%1.411 kL per tonne (PPAC Ready Reckoner FY 2025-26, Table 9.2) = 2.176 kgCO2/L' FROM pg_temp.notes_of('003') n));
SELECT pg_temp.ok('coal with no calorific value or grade: Indian default 1.76, rule recorded', (SELECT emission_factor = 1.76 AND co2_kg = 1760 FROM pg_temp.row_of('004'))
  AND (SELECT n ->> 'factorSource' = 'BIOCOG_MVR_INDIA_v1.2:COAL'
          AND n -> 'assumptions' = '["Converted 1 t to 1000 kg", "Indian coal average"]'::jsonb FROM pg_temp.notes_of('004') n));
SELECT pg_temp.ok('non-coking coal is ordinary Indian coal: 1.76', (SELECT emission_factor = 1.76 AND co2_kg = 3520 FROM pg_temp.row_of('020')));
SELECT pg_temp.ok('coal naming a calorific value left as it is', (SELECT emission_factor = 2.42 AND co2_kg = 2420 FROM pg_temp.row_of('005')));
SELECT pg_temp.ok('coal named imported or steam left as it is', (SELECT emission_factor = 2.42 FROM pg_temp.row_of('006')));
SELECT pg_temp.ok('lignite under a coal key left as it is', (SELECT emission_factor = 2.42 FROM pg_temp.row_of('019')));

-- Grid by financial year
SELECT pg_temp.ok('grid, invoice 31 Mar 2025: FY 2024-25, 0.710, v21 Table S citation',
  (SELECT emission_factor = 0.71 AND co2_kg = 710 FROM pg_temp.row_of('007'))
  AND (SELECT n ->> 'factorSource' = 'BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2024_25'
          AND n ->> 'factorCitation' = 'CEA CO2 Baseline Database v21.0 (Nov 2025), Table S, FY 2024-25 weighted average'
          AND n -> 'assumptions' = '["Grid factor for IN", "CEA FY 2024-25 factor"]'::jsonb FROM pg_temp.notes_of('007') n));
SELECT pg_temp.ok('grid, invoice 1 Apr 2025: FY 2025-26, 0.675, v22 Table S citation',
  (SELECT emission_factor = 0.675 AND co2_kg = 675 FROM pg_temp.row_of('008'))
  AND (SELECT n ->> 'factorSource' = 'BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2025_26'
          AND n ->> 'factorCitation' = 'CEA CO2 Baseline Database v22.0 (Aug 2026), Table S, FY 2025-26 weighted average' FROM pg_temp.notes_of('008') n));
SELECT pg_temp.ok('grid, invoice in FY 2023-24: that year''s 0.727 from v21 Annexure-I',
  (SELECT emission_factor = 0.727 AND co2_kg = 727 FROM pg_temp.row_of('009'))
  AND (SELECT n ->> 'factorCitation' = 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2023-24 weighted average' FROM pg_temp.notes_of('009') n));
SELECT pg_temp.ok('grid, no invoice date: upload date (FY 2026-27), latest 0.675, said so',
  (SELECT emission_factor = 0.675 AND co2_kg = 675 FROM pg_temp.row_of('010'))
  AND (SELECT n -> 'assumptions' = '["CEA FY 2025-26 factor · Dated by upload"]'::jsonb FROM pg_temp.notes_of('010') n));
SELECT pg_temp.ok('grid, invoice in 2010: no CEA year, 0.710 (FY 2024-25)',
  (SELECT emission_factor = 0.71 AND co2_kg = 710 FROM pg_temp.row_of('011'))
  AND (SELECT n ->> 'factorSource' = 'BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2024_25'
          AND n -> 'assumptions' = '["FY 2024-25 factor used"]'::jsonb FROM pg_temp.notes_of('011') n));
SELECT pg_temp.ok('grid v1.0 row at 0.708, FY 2025-26: 342 kWh x 0.675 = 230.85', (SELECT emission_factor = 0.675 AND co2_kg = 230.85 FROM pg_temp.row_of('012')));

-- Not touched
SELECT pg_temp.ok('verified diesel left as verified', (SELECT verified AND emission_factor = 2.68 AND co2_kg = 268 FROM pg_temp.row_of('002')));
SELECT pg_temp.ok('row with a compliance_ledger row left as it is (ledger and emission stay together)', (SELECT emission_factor = 2.68 AND co2_kg = 26.8 FROM pg_temp.row_of('013')));
SELECT pg_temp.ok('row already on v1.2 left as it is', (SELECT emission_factor = 2.645 AND co2_kg = 26.45 FROM pg_temp.row_of('014')));
SELECT pg_temp.ok('LPG, CNG, plain-text notes and an unexpected diesel factor left as they are', NOT EXISTS (
  SELECT 1 FROM before_rows b JOIN public.emissions e USING (id)
   WHERE b.id IN ('00000000-0000-4000-8000-00000000f015', '00000000-0000-4000-8000-00000000f016', '00000000-0000-4000-8000-00000000f017', '00000000-0000-4000-8000-00000000f018')
     AND (e.co2_kg IS DISTINCT FROM b.co2_kg OR e.emission_factor IS DISTINCT FROM b.emission_factor OR e.verification_notes IS DISTINCT FROM b.verification_notes)));
SELECT pg_temp.ok('no verified row changed', NOT EXISTS (
  SELECT 1 FROM before_rows b JOIN public.emissions e USING (id)
   WHERE b.verified AND (e.co2_kg IS DISTINCT FROM b.co2_kg OR e.emission_factor IS DISTINCT FROM b.emission_factor OR e.verification_notes IS DISTINCT FROM b.verification_notes)));
SELECT pg_temp.ok('compliance_ledger row unchanged', (SELECT co2_kg = 26.8 AND emission_factor = 2.68 FROM public.compliance_ledger WHERE id = '00000000-0000-4000-8000-00000000fe13'));
SELECT pg_temp.ok('every row still equals activity x factor (emissions write guard rule)', NOT EXISTS (
  SELECT 1 FROM public.emissions WHERE user_id = '00000000-0000-4000-8000-0000000000f1' AND abs(activity_data * emission_factor - co2_kg) > greatest(0.01, co2_kg * 0.001)));
SELECT pg_temp.ok('backup holds exactly the ten corrected rows', (SELECT count(*) = 10 FROM public.emissions_factor_backup_20261115));
SELECT pg_temp.ok('browsers cannot read the backup', NOT has_table_privilege('authenticated', 'public.emissions_factor_backup_20261115', 'SELECT') AND NOT has_table_privilege('anon', 'public.emissions_factor_backup_20261115', 'SELECT'));
SELECT pg_temp.ok('no temporary objects left behind', to_regclass('pg_temp._fc_plan') IS NULL AND to_regclass('pg_temp._fc_grid') IS NULL);

-- record_events (evidence lock, live): one event per corrected row, with the reason.
DO $$
DECLARE before bigint := (SELECT n FROM events_before);
BEGIN
  IF before < 0 THEN RAISE NOTICE 'ok record_events not present in this state (evidence lock not applied)'; RETURN; END IF;
  PERFORM pg_temp.ok('record_events logs the ten corrections as ''factor correction IND_EF_2026_11''',
    (SELECT count(*) = 10 FROM public.record_events WHERE table_name = 'emissions' AND reason = 'factor correction IND_EF_2026_11'
        AND record_id IN (SELECT emission_id FROM public.emissions_factor_backup_20261115)));
  PERFORM pg_temp.ok('the logged change names factor, kgCO2e and notes',
    (SELECT changed_fields @> ARRAY['emission_factor','co2_kg','verification_notes'] FROM public.record_events
      WHERE record_id = '00000000-0000-4000-8000-00000000f001' AND reason = 'factor correction IND_EF_2026_11'));
END $$;

CREATE TEMP TABLE after_first AS SELECT id, co2_kg, emission_factor, verification_notes FROM public.emissions WHERE user_id = '00000000-0000-4000-8000-0000000000f1';
\i :mig
SELECT pg_temp.ok('re-running changes nothing', NOT EXISTS (
  SELECT 1 FROM after_first a JOIN public.emissions e USING (id)
   WHERE e.co2_kg IS DISTINCT FROM a.co2_kg OR e.emission_factor IS DISTINCT FROM a.emission_factor OR e.verification_notes IS DISTINCT FROM a.verification_notes));
SELECT pg_temp.ok('re-running backs up nothing new', (SELECT count(*) = 10 FROM public.emissions_factor_backup_20261115));

\i :rb
SELECT pg_temp.ok('rollback restores every row exactly', NOT EXISTS (
  SELECT 1 FROM before_rows b JOIN public.emissions e USING (id)
   WHERE e.co2_kg IS DISTINCT FROM b.co2_kg OR e.emission_factor IS DISTINCT FROM b.emission_factor OR e.verification_notes IS DISTINCT FROM b.verification_notes));
SELECT pg_temp.ok('rollback drops the backup table', to_regclass('public.emissions_factor_backup_20261115') IS NULL);
DO $$
BEGIN
  IF to_regclass('public.record_events') IS NULL THEN RETURN; END IF;
  PERFORM pg_temp.ok('record_events logs the rollback with its reason',
    (SELECT count(*) = 10 FROM public.record_events WHERE reason = 'factor correction IND_EF_2026_11 rolled back'));
END $$;

-- Clean up the seed rows (record_events keeps its append-only history).
DELETE FROM public.compliance_ledger WHERE user_id = '00000000-0000-4000-8000-0000000000f1';
DELETE FROM public.emissions WHERE user_id = '00000000-0000-4000-8000-0000000000f1';
DELETE FROM public.documents WHERE user_id = '00000000-0000-4000-8000-0000000000f1';
SELECT 'ALL FACTOR CORRECTION TESTS PASSED';
