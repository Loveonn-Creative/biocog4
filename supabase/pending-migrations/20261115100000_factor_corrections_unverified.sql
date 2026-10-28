-- =============================================
-- PENDING, NOT APPLIED. Run factor_corrections_dry_run.sql (read-only) first.
--
-- Factor set IND_EF_2026_11 (methodology v1.2) on UNVERIFIED rows only.
-- New rows already use these values (supabase/functions/_shared/emissionFactors.ts);
-- this brings unverified rows saved by v1.0/v1.1 onto the same published,
-- cited factors. Owner approved, November 2026 (GHG Protocol; every factor
-- verified against a primary source and cited on the record).
--
--   Diesel  2.68 -> 2.645 kgCO2/L: IPCC 2006 Vol 2 Ch 1, NCV 43.0 TJ/Gg (Table 1.2)
--           x 74,100 kgCO2/TJ (Table 1.4) = 3.186 kgCO2/kg x 0.83 kg/L (CEA CO2
--           Baseline Database v22.0, Appendix B).
--   Petrol  2.31 -> 2.176 kgCO2/L: IPCC 2006 Vol 2 Ch 1, NCV 44.3 TJ/Gg x
--           69,300 kgCO2/TJ = 3.070 kgCO2/kg, at 1.411 kL per tonne (PPAC Ready
--           Reckoner FY 2025-26, Table 9.2, Ministry of Petroleum and Natural Gas).
--   Coal    2.42 -> 1.76 kgCO2/kg, Indian coal default only: India BUR-2
--           (2018) Table 2.3, non-coking coal 18.26 TJ/kt x 26.28 tC/TJ x 44/12. A coal
--           row whose line text names a calorific value or a grade (GCV, NCV,
--           kcal, MJ/kg, imported, bituminous, steam, lignite, anthracite,
--           coking) is left as it is: its rule cannot be settled here.
--   Grid    INDIA_GRID_AVG (0.708 or 0.710) -> the CEA weighted average for the
--           financial year of the record (invoice date, else upload date in
--           UTC, as record periods are dated): FY 2025-26 and later 0.675 (CEA
--           v22.0 Table S); FY 2024-25 0.710 (v21.0 Table S); FY 2013-14 to
--           FY 2023-24 that year's value (v21.0 Annexure-I); earlier 0.710.
--
-- Rows matched: not verified; positive activity and kgCO2e; verification
-- notes are JSON whose factorSource is BIOCOG_MVR_INDIA_v1.0 or _v1.1 with key
-- DIESEL, PETROL or COAL (category fuel, unit litre/litre/kg, factor at the old
-- value) or INDIA_GRID_AVG (category electricity, unit kWh, factor 0.708 or
-- 0.710); and NO compliance_ledger row for the emission (a ledger row keeps
-- the values it was written with and is promoted in place on verification, so
-- correcting the emission under it would split the two; such rows keep their
-- saved factor, which still verifies because v1.1 rows are not re-derived).
--
-- Each corrected row: emission_factor and co2_kg = round(activity x factor, 2)
-- (so the emissions write guard's co2 = activity x factor holds), and in the
-- notes factorSource BIOCOG_MVR_INDIA_v1.2:<key>, factorCitation,
-- factorSetVersion IND_EF_2026_11, the rule applied in assumptions and the
-- previous values under factorCorrection.
--
-- Not changed, by design: verified rows, compliance_ledger, carbon_verifications.
-- Old values go to public.emissions_factor_backup_20261115 first (RLS on, no
-- policies, no browser grants); the rollback restores them exactly.
-- app.change_reason is set so record_events (evidence lock) logs each change
-- as 'factor correction IND_EF_2026_11'. Re-running changes nothing. Runs as
-- the migration owner (trusted writer).
-- =============================================

BEGIN;

SET LOCAL app.change_reason = 'factor correction IND_EF_2026_11';

CREATE OR REPLACE FUNCTION pg_temp.try_jsonb(t text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN t::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- CEA weighted average emission factor of the Indian grid, by financial year
-- (start year). Same values and citations as INDIA_GRID_BY_FY in emissionFactors.ts.
CREATE TEMP TABLE _fc_grid (fy_start int PRIMARY KEY, factor_key text NOT NULL, factor numeric NOT NULL, citation text NOT NULL);
INSERT INTO _fc_grid VALUES
  (2013, 'INDIA_GRID_FY2013_14', 0.774, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2013-14 weighted average'),
  (2014, 'INDIA_GRID_FY2014_15', 0.779, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2014-15 weighted average'),
  (2015, 'INDIA_GRID_FY2015_16', 0.774, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2015-16 weighted average'),
  (2016, 'INDIA_GRID_FY2016_17', 0.770, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2016-17 weighted average'),
  (2017, 'INDIA_GRID_FY2017_18', 0.754, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2017-18 weighted average'),
  (2018, 'INDIA_GRID_FY2018_19', 0.744, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2018-19 weighted average'),
  (2019, 'INDIA_GRID_FY2019_20', 0.713, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2019-20 weighted average'),
  (2020, 'INDIA_GRID_FY2020_21', 0.703, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2020-21 weighted average'),
  (2021, 'INDIA_GRID_FY2021_22', 0.715, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2021-22 weighted average'),
  (2022, 'INDIA_GRID_FY2022_23', 0.716, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2022-23 weighted average'),
  (2023, 'INDIA_GRID_FY2023_24', 0.727, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2023-24 weighted average'),
  (2024, 'INDIA_GRID_FY2024_25', 0.710, 'CEA CO2 Baseline Database v21.0 (Nov 2025), Table S, FY 2024-25 weighted average'),
  (2025, 'INDIA_GRID_FY2025_26', 0.675, 'CEA CO2 Baseline Database v22.0 (Aug 2026), Table S, FY 2025-26 weighted average');

-- Fuels: old value(s), stored unit, new value and citation (FUEL_FACTORS in emissionFactors.ts).
CREATE TEMP TABLE _fc_fuel (factor_key text PRIMARY KEY, old_factors numeric[] NOT NULL, unit text NOT NULL, factor numeric NOT NULL, citation text NOT NULL, assumption text);
INSERT INTO _fc_fuel VALUES
  ('DIESEL', '{2.68}', 'litre', 2.645, 'IPCC 2006 Vol 2 Ch 1, Table 1.2 NCV 43.0 TJ/Gg x Table 1.4 74,100 kgCO2/TJ = 3.186 kgCO2/kg x 0.83 kg/L (CEA CO2 Baseline Database v22.0, Appendix B) = 2.645 kgCO2/L', NULL),
  ('PETROL', '{2.31}', 'litre', 2.176, 'IPCC 2006 Vol 2 Ch 1, Table 1.2 NCV 44.3 TJ/Gg x Table 1.4 69,300 kgCO2/TJ = 3.070 kgCO2/kg, at 1.411 kL per tonne (PPAC Ready Reckoner FY 2025-26, Table 9.2) = 2.176 kgCO2/L', NULL),
  ('COAL', '{2.42}', 'kg', 1.76, 'India Second Biennial Update Report to the UNFCCC (MoEFCC, 2018), Table 2.3, non-coking coal NCV 18.26 TJ/kt x 26.28 tC/TJ x 44/12 = 1.76 kgCO2/kg', 'Indian coal average');

-- One planned correction per matching row (the dry run builds the same view).
CREATE TEMP VIEW _fc_plan AS
WITH base AS (
  SELECT e.id, e.category, e.activity_data, lower(trim(coalesce(e.activity_unit, ''))) AS unit,
         e.emission_factor, e.co2_kg, e.verification_notes,
         pg_temp.try_jsonb(e.verification_notes) AS notes,
         coalesce(d.invoice_date, (e.created_at AT TIME ZONE 'UTC')::date) AS act_date,
         d.invoice_date IS NOT NULL AS by_invoice
    FROM public.emissions e
    LEFT JOIN public.documents d ON d.id = e.document_id
   WHERE NOT coalesce(e.verified, false)
     AND e.activity_data > 0
     AND e.co2_kg > 0
     AND NOT EXISTS (SELECT 1 FROM public.compliance_ledger l WHERE l.emission_id = e.id)
), keyed AS (
  SELECT b.*,
         split_part(b.notes ->> 'factorSource', ':', 1) AS src,
         split_part(b.notes ->> 'factorSource', ':', 2) AS old_key,
         coalesce(b.notes ->> 'sourceDescription', '') AS line_text,
         CASE WHEN extract(month FROM b.act_date) >= 4 THEN extract(year FROM b.act_date)::int ELSE extract(year FROM b.act_date)::int - 1 END AS fy
    FROM base b
   WHERE jsonb_typeof(b.notes) = 'object'
), fuel AS (
  SELECT k.*, f.factor_key AS new_key, f.factor AS new_factor, f.citation, f.assumption,
         'fuel ' || lower(f.factor_key) AS rule
    FROM keyed k JOIN _fc_fuel f ON f.factor_key = k.old_key
   WHERE k.src IN ('BIOCOG_MVR_INDIA_v1.0', 'BIOCOG_MVR_INDIA_v1.1')
     AND k.category = 'fuel'
     AND k.unit = f.unit
     AND k.emission_factor = ANY (f.old_factors)
     AND (f.factor_key <> 'COAL' OR regexp_replace(k.line_text, 'non[ -]?coking', '', 'gi') !~* '(\m(gcv|gar|gad|adb|ncv|nar|calorific|imported|bituminous|steam|lignite|anthracite|coking)\M|kcal|k\.cal|mj)')
), grid AS (
  SELECT k.*, g.factor_key AS new_key, g.factor AS new_factor, g.citation,
         CASE WHEN k.fy < 2013 THEN 'FY 2024-25 factor used'
              ELSE 'CEA FY ' || g.fy_start || '-' || lpad(((g.fy_start + 1) % 100)::text, 2, '0') || ' factor' END
           || CASE WHEN k.by_invoice THEN '' ELSE ' · Dated by upload' END AS assumption,
         'grid ' || g.factor_key AS rule
    FROM keyed k
    JOIN _fc_grid g ON g.fy_start = CASE WHEN k.fy >= 2025 THEN 2025 WHEN k.fy >= 2013 THEN k.fy ELSE 2024 END
   WHERE k.src IN ('BIOCOG_MVR_INDIA_v1.0', 'BIOCOG_MVR_INDIA_v1.1')
     AND k.old_key = 'INDIA_GRID_AVG'
     AND k.category = 'electricity'
     AND k.unit = 'kwh'
     AND k.emission_factor IN (0.708, 0.71)
), planned AS (
  SELECT id, activity_data, emission_factor, co2_kg, verification_notes, notes, new_key, new_factor, citation, assumption, rule FROM fuel
  UNION ALL
  SELECT id, activity_data, emission_factor, co2_kg, verification_notes, notes, new_key, new_factor, citation, assumption, rule FROM grid
)
SELECT p.id AS emission_id, p.rule, p.emission_factor AS old_emission_factor, p.co2_kg AS old_co2_kg,
       p.verification_notes AS old_verification_notes,
       p.new_factor AS new_emission_factor,
       round(p.activity_data * p.new_factor, 2) AS new_co2_kg,
       (p.notes
         || jsonb_build_object(
              'factorSource', 'BIOCOG_MVR_INDIA_v1.2:' || p.new_key,
              'factorCitation', p.citation,
              'factorSetVersion', 'IND_EF_2026_11',
              'factorCorrection', jsonb_build_object(
                'migration', '20261115100000_factor_corrections_unverified',
                'previousFactor', p.emission_factor,
                'previousCo2Kg', p.co2_kg,
                'previousFactorSource', p.notes ->> 'factorSource',
                'previousFactorSetVersion', p.notes -> 'factorSetVersion'))
         || CASE WHEN p.assumption IS NULL THEN '{}'::jsonb
                 WHEN jsonb_typeof(p.notes -> 'assumptions') = 'array' THEN jsonb_build_object('assumptions', (p.notes -> 'assumptions') || to_jsonb(p.assumption))
                 WHEN p.notes ? 'assumptions' THEN '{}'::jsonb
                 ELSE jsonb_build_object('assumptions', jsonb_build_array(p.assumption)) END
       )::text AS new_verification_notes
  FROM planned p;

CREATE TABLE IF NOT EXISTS public.emissions_factor_backup_20261115 (
  emission_id            uuid PRIMARY KEY,
  rule                   text NOT NULL,
  old_co2_kg             numeric NOT NULL,
  old_emission_factor    numeric NOT NULL,
  old_verification_notes text,
  new_co2_kg             numeric NOT NULL,
  new_emission_factor    numeric NOT NULL,
  new_verification_notes text NOT NULL,
  backed_up_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emissions_factor_backup_20261115 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.emissions_factor_backup_20261115 FROM PUBLIC, anon, authenticated;

INSERT INTO public.emissions_factor_backup_20261115
  (emission_id, rule, old_co2_kg, old_emission_factor, old_verification_notes, new_co2_kg, new_emission_factor, new_verification_notes)
SELECT emission_id, rule, old_co2_kg, old_emission_factor, old_verification_notes, new_co2_kg, new_emission_factor, new_verification_notes
  FROM _fc_plan
ON CONFLICT (emission_id) DO NOTHING;

-- Only rows backed up and still holding the old values, so a re-run is a no-op.
UPDATE public.emissions e
   SET emission_factor = b.new_emission_factor,
       co2_kg = b.new_co2_kg,
       verification_notes = b.new_verification_notes
  FROM public.emissions_factor_backup_20261115 b
 WHERE b.emission_id = e.id
   AND NOT coalesce(e.verified, false)
   AND e.emission_factor = b.old_emission_factor
   AND e.co2_kg = b.old_co2_kg
   AND e.verification_notes IS NOT DISTINCT FROM b.old_verification_notes;

-- The emissions write guard's rule: kgCO2e = activity x factor (0.1% or 0.01 kg).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.emissions e JOIN public.emissions_factor_backup_20261115 b ON b.emission_id = e.id
     WHERE e.emission_factor = b.new_emission_factor AND e.co2_kg = b.new_co2_kg
       AND abs(e.activity_data * e.emission_factor - e.co2_kg) > greatest(0.01, e.co2_kg * 0.001)
  ) THEN
    RAISE EXCEPTION 'factor correction refused: a corrected row does not equal activity x factor';
  END IF;
END $$;

DROP VIEW _fc_plan;
DROP TABLE _fc_fuel;
DROP TABLE _fc_grid;

COMMIT;
