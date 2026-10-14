-- Behaviour tests for 20261020100000_scope3_global_freight.sql (run after it).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: % (%)', p_label, SQLERRM; END $$;
CREATE OR REPLACE FUNCTION pg_temp.factor(p_key text, p_material text, p_geo text) RETURNS text LANGUAGE sql AS $$
  SELECT format($f$INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit, data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
    VALUES (%L, '1', 4, %L, %L, 'tkm', 0.5, 'secondary_factor', 'WTW', 'AR5', 'Test', 'T', 2024, '2024-01-01', '00000000-0000-4000-8000-0000000000a1')$f$, p_key, p_material, p_geo)
$$;

DO $$ BEGIN EXECUTE pg_temp.factor('T_AIR_LONG', 'freight:air:long', 'GLOBAL'); EXECUTE pg_temp.factor('T_AIR_SHORT', 'freight:air:short', 'GLOBAL');
  EXECUTE pg_temp.factor('T_AIR', 'freight:air', 'GLOBAL'); EXECUTE pg_temp.factor('T_SEA', 'freight:sea', 'GLOBAL'); EXECUTE pg_temp.factor('T_AIR_IN', 'freight:air:long', 'IN'); END $$;
SELECT pg_temp.check((SELECT count(*) FROM public.scope3_factors WHERE geography = 'GLOBAL') = 4, 'GLOBAL air (by band) and sea factors are accepted');
SELECT pg_temp.check((SELECT count(*) FROM public.scope3_factors WHERE factor_key = 'T_AIR_IN') = 1, 'a country air-band factor is accepted');
SELECT pg_temp.expect_error(pg_temp.factor('T_ROAD_G', 'freight:road', 'GLOBAL'), 'GLOBAL road freight is refused');
SELECT pg_temp.expect_error(pg_temp.factor('T_RAIL_G', 'freight:rail', 'GLOBAL'), 'GLOBAL rail freight is refused');
SELECT pg_temp.expect_error(replace(pg_temp.factor('T_STEEL_G', 'hsn:7208', 'GLOBAL'), '4, ''hsn', '1, ''hsn'), 'a GLOBAL material factor is refused');
SELECT pg_temp.expect_error(pg_temp.factor('T_AIR_MID', 'freight:air:medium', 'GLOBAL'), 'only the short and long air bands exist');
SELECT pg_temp.expect_error(pg_temp.factor('T_SEA_EU', 'freight:sea', 'EUROPE'), 'region names other than GLOBAL are refused');
DO $$ BEGIN RAISE NOTICE 'ALL SCOPE3 GLOBAL FREIGHT TESTS PASSED'; END $$;
