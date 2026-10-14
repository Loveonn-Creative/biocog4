-- Behaviour tests for 20261022100000_emissions_write_guard and the verified-row
-- hold in 20261011170000_recalculate_emissions. Run by run_emissions_guard.sh.
\set ON_ERROR_STOP on
SET client_min_messages = notice;

CREATE OR REPLACE FUNCTION pg_temp.ok(label text, cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok %', label;
END $$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000a1', 'a@example.in') ON CONFLICT DO NOTHING;
INSERT INTO public.documents (id, user_id, document_type) VALUES ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000000a1', 'invoice');

-- Browser session: authenticated JWT.
CREATE OR REPLACE FUNCTION pg_temp.as_browser() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000a1"}', false),
         set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
$$;
CREATE OR REPLACE FUNCTION pg_temp.as_service() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false);
$$;

SELECT pg_temp.as_browser();
SET ROLE authenticated;
INSERT INTO public.emissions (id, user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg, verified)
VALUES ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d001', 2, 'electricity', 342, 'kWh', 0.71, 242.82, true);
RESET ROLE;
SELECT pg_temp.ok('browser insert of a consistent row is stored', EXISTS (SELECT 1 FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000e001'));
SELECT pg_temp.ok('browser insert cannot mark a row verified', (SELECT verified FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000e001') = false);

DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  INSERT INTO public.emissions (user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg)
  VALUES ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d001', 2, 'electricity', 342, 'kWh', 0.71, 1);
  RAISE EXCEPTION 'FAIL: inconsistent insert was stored';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok browser insert whose kgCO2e does not equal activity x factor is refused';
END $$;

DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  INSERT INTO public.emissions (user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg)
  VALUES ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d001', 1, 'diesel', 100, 'L', -2.68, -268);
  RAISE EXCEPTION 'FAIL: negative insert was stored';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok browser insert with a negative factor or kgCO2e is refused';
END $$;

DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  UPDATE public.emissions SET co2_kg = 1, emission_factor = 0.0029 WHERE id = '00000000-0000-4000-8000-00000000e001';
  RAISE EXCEPTION 'FAIL: browser update went through';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok browser cannot edit a stored row (even consistently)';
END $$;

DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  UPDATE public.emissions SET verified = true WHERE id = '00000000-0000-4000-8000-00000000e001';
  RAISE EXCEPTION 'FAIL: browser verified a row';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok browser cannot mark a row verified';
END $$;
SELECT pg_temp.ok('the stored row is unchanged', (SELECT co2_kg FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000e001') = 242.82);

SELECT pg_temp.as_service();
UPDATE public.emissions SET verified = true WHERE id = '00000000-0000-4000-8000-00000000e001';
SELECT pg_temp.ok('service role (verify-carbon) can still verify', (SELECT verified FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000e001'));

SELECT set_config('request.jwt.claims', '', false);
SELECT pg_temp.ok('migration context (no JWT) is trusted', public.is_trusted_db_writer());

-- Recalculation hold: seed one verified and one unverified grid row at the old 0.708.
INSERT INTO public.emissions (id, user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg, verified, verification_notes)
VALUES ('00000000-0000-4000-8000-00000000e0a1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d001', 2, 'electricity', 1000, 'kWh', 0.708, 708, true, '{"factorSource":"BIOCOG_MVR_INDIA_v1.0:INDIA_GRID_AVG"}'),
       ('00000000-0000-4000-8000-00000000e0a2', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d001', 2, 'electricity', 1000, 'kWh', 0.708, 708, false, '{"factorSource":"BIOCOG_MVR_INDIA_v1.0:INDIA_GRID_AVG"}');
\o /dev/null
\i :recalc
\o
SELECT pg_temp.ok('recalculation leaves the verified row exactly as verified', (SELECT (emission_factor, co2_kg) = (0.708::numeric, 708::numeric) FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000e0a1'));
SELECT pg_temp.ok('recalculation corrects the unverified row to 0.710', (SELECT (emission_factor, co2_kg) = (0.71::numeric, 710::numeric) FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000e0a2'));
SELECT pg_temp.ok('only the unverified row is in the backup', (SELECT array_agg(emission_id) FROM public.emissions_recalc_backup_20261011) = ARRAY['00000000-0000-4000-8000-00000000e0a2'::uuid]);

SELECT 'ALL EMISSIONS GUARD TESTS PASSED';
