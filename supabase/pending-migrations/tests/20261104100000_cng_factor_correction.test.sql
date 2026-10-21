-- Behaviour tests for 20261104100000_cng_factor_correction. Run by run_cng.sh,
-- which passes the migration and rollback paths as :mig and :rb.
\set ON_ERROR_STOP on
SET client_min_messages = notice;

CREATE OR REPLACE FUNCTION pg_temp.ok(label text, cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok %', label;
END $$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000c1', 'c@example.in') ON CONFLICT DO NOTHING;
INSERT INTO public.documents (id, user_id, document_type) VALUES ('00000000-0000-4000-8000-00000000dc01', '00000000-0000-4000-8000-0000000000c1', 'invoice');

-- c001 unverified CNG (factorSource) -> corrected
-- c002 verified CNG -> untouched
-- c003 unverified, no factorSource, description names CNG -> corrected
-- c004 unverified 2.75 kg row from another fuel key -> untouched
-- c005 unverified CNG already at 2.69 -> untouched
-- c006 unverified, notes not JSON, no CNG evidence -> untouched
INSERT INTO public.emissions (id, user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg, verified, verification_notes) VALUES
 ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000dc01', 1, 'fuel', 100, 'kg', 2.75, 275, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:CNG","sourceDescription":"CNG refill"}'),
 ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000dc01', 1, 'fuel', 40, 'kg', 2.75, 110, true, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:CNG"}'),
 ('00000000-0000-4000-8000-00000000c003', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000dc01', 1, 'fuel', 12.5, 'KG', 2.75, 34.38, false, '{"sourceDescription":"Compressed natural gas (CNG) 12.5 kg"}'),
 ('00000000-0000-4000-8000-00000000c004', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000dc01', 1, 'fuel', 10, 'kg', 2.75, 27.5, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:OTHER"}'),
 ('00000000-0000-4000-8000-00000000c005', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000dc01', 1, 'fuel', 10, 'kg', 2.69, 26.9, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.1:CNG"}'),
 ('00000000-0000-4000-8000-00000000c006', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000dc01', 1, 'fuel', 10, 'kg', 2.75, 27.5, false, 'plain text note');

CREATE TEMP TABLE before_rows AS SELECT id, co2_kg, emission_factor, verification_notes FROM public.emissions WHERE user_id = '00000000-0000-4000-8000-0000000000c1';

\i :mig
SELECT pg_temp.ok('unverified CNG row corrected to 2.69 and 269 kg', (SELECT emission_factor = 2.69 AND co2_kg = 269 FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000c001'));
SELECT pg_temp.ok('correction keeps the previous values in the notes', (SELECT (verification_notes::jsonb -> 'factorCorrection' ->> 'previousFactor')::numeric = 2.75 AND verification_notes::jsonb ->> 'factorSource' = 'BIOCOG_MVR_INDIA_v1.1:CNG' FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000c001'));
SELECT pg_temp.ok('verified CNG row left as verified', (SELECT emission_factor = 2.75 AND co2_kg = 110 FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000c002'));
SELECT pg_temp.ok('row identified by its CNG description corrected', (SELECT emission_factor = 2.69 AND co2_kg = 33.63 FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000c003'));
SELECT pg_temp.ok('other fuel key at 2.75 untouched', (SELECT emission_factor = 2.75 AND co2_kg = 27.5 FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000c004'));
SELECT pg_temp.ok('row already at 2.69 untouched', (SELECT co2_kg = 26.9 FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000c005'));
SELECT pg_temp.ok('row with no CNG evidence untouched', (SELECT emission_factor = 2.75 FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000c006'));
SELECT pg_temp.ok('every corrected row still equals activity x factor', NOT EXISTS (SELECT 1 FROM public.emissions WHERE user_id = '00000000-0000-4000-8000-0000000000c1' AND abs(activity_data * emission_factor - co2_kg) > greatest(0.01, co2_kg * 0.001)));
SELECT pg_temp.ok('backup holds exactly the two corrected rows', (SELECT count(*) = 2 FROM public.emissions_cng_backup_20261104));
SELECT pg_temp.ok('browsers cannot read the backup', NOT has_table_privilege('authenticated', 'public.emissions_cng_backup_20261104', 'SELECT') AND NOT has_table_privilege('anon', 'public.emissions_cng_backup_20261104', 'SELECT'));

CREATE TEMP TABLE after_first AS SELECT id, co2_kg, emission_factor, verification_notes FROM public.emissions WHERE user_id = '00000000-0000-4000-8000-0000000000c1';
\i :mig
SELECT pg_temp.ok('re-running changes nothing', NOT EXISTS (
  SELECT 1 FROM after_first a JOIN public.emissions e USING (id)
   WHERE e.co2_kg IS DISTINCT FROM a.co2_kg OR e.emission_factor IS DISTINCT FROM a.emission_factor OR e.verification_notes IS DISTINCT FROM a.verification_notes));

\i :rb
SELECT pg_temp.ok('rollback restores every row exactly', NOT EXISTS (
  SELECT 1 FROM before_rows b JOIN public.emissions e USING (id)
   WHERE e.co2_kg IS DISTINCT FROM b.co2_kg OR e.emission_factor IS DISTINCT FROM b.emission_factor OR e.verification_notes IS DISTINCT FROM b.verification_notes));
SELECT pg_temp.ok('rollback drops the backup table', to_regclass('public.emissions_cng_backup_20261104') IS NULL);

DELETE FROM public.emissions WHERE user_id = '00000000-0000-4000-8000-0000000000c1';
DELETE FROM public.documents WHERE user_id = '00000000-0000-4000-8000-0000000000c1';
SELECT 'ALL CNG TESTS PASSED';
