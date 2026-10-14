-- PENDING, NOT APPLIED. Review, run the dry-run section on its own first,
-- then apply on staging before production.
--
-- Recalculates co2_kg and emission_factor on stored emissions whose factor
-- changed in BIOCOG_MVR_INDIA v1.1 (supabase/functions/_shared/emissionFactors.ts):
--
--   change_key   old factor        new factor       unit stored
--   LPG          1.51 /kg          2.98 /kg         kg
--   PNG          2.30 /scm         2.05 /scm        scm
--   FURNACE_OIL  3.15 /litre       2.97 /litre      litre | liter
--   GRID         0.708 /kWh        0.710 /kWh       kwh | kw.h
--   KEROSENE     2.68 /litre (was  2.52 /litre      litre | liter
--                diesel's factor)
--   NAPHTHA      3.00 /litre       3.26 /kg         NOT recalculated: the new
--                factor is per kg and no density is assumed. These rows are
--                listed by the dry run for manual review and left unchanged.
--
-- Rows are matched on category + old factor + stored unit. When the row's
-- verification_notes JSON names a factorSource, it must agree. Kerosene rows
-- were stored with factorSource ...:DIESEL, so they are identified by
-- sourceDescription mentioning kerosene/SKO and not diesel/HSD.
-- Negative (avoided) green rows are not touched.
--
-- Before any change, the old co2_kg, emission_factor and verification_notes
-- are copied to public.emissions_recalc_backup_20261011, and the rollback
-- (rollback/20261011170000_recalculate_emissions.sql) restores them exactly.
--
-- Not changed here, by design: verified emissions, compliance_ledger rows and
-- carbon_verifications.total_co2_kg are records of what was verified at the
-- time. Only unverified rows are recalculated. The dry run reports how many
-- verified rows still carry an earlier factor (left as they are).
--
-- Runs as the migration/DB owner. The pending trigger
-- protect_emissions_verification_columns (20261011120000) lets trusted DB
-- writers through; if that trigger is applied and this runs under another
-- role, co2_kg changes would be silently reverted.

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.try_jsonb(t text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN t::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE TEMP VIEW emissions_recalc_plan AS
WITH src AS (
  SELECT e.id, e.category, e.activity_data, e.activity_unit, e.emission_factor,
         e.co2_kg, e.verification_notes, e.verified,
         lower(trim(coalesce(e.activity_unit, ''))) AS unit_l,
         pg_temp.try_jsonb(e.verification_notes) AS notes
    FROM public.emissions e
   WHERE e.co2_kg >= 0
     AND e.activity_data > 0
     -- Verified rows are never rewritten: they must keep matching their
     -- compliance_ledger and carbon_verifications snapshots. They keep the
     -- factor they were verified with; a correction is a new, re-verified
     -- record, not an edit (owner decision, October 2026).
     AND NOT coalesce(e.verified, false)
), keyed AS (
  SELECT s.*,
         nullif(split_part(coalesce(s.notes ->> 'factorSource', ''), ':', 2), '') AS src_key,
         coalesce(s.notes ->> 'sourceDescription', '') AS src_desc
    FROM src s
), classified AS (
  SELECT k.*,
         CASE
           WHEN k.category = 'fuel' AND k.emission_factor = 1.51 AND k.unit_l = 'kg'
                AND coalesce(k.src_key, 'LPG') = 'LPG' THEN 'LPG'
           WHEN k.category = 'fuel' AND k.emission_factor = 2.30 AND k.unit_l = 'scm'
                AND coalesce(k.src_key, 'PNG') = 'PNG' THEN 'PNG'
           WHEN k.category = 'fuel' AND k.emission_factor = 3.15 AND k.unit_l IN ('litre', 'liter')
                AND coalesce(k.src_key, 'FURNACE_OIL') = 'FURNACE_OIL' THEN 'FURNACE_OIL'
           WHEN k.category = 'electricity' AND k.emission_factor = 0.708 AND k.unit_l IN ('kwh', 'kw.h')
                AND coalesce(k.src_key, 'INDIA_GRID_AVG') = 'INDIA_GRID_AVG' THEN 'GRID'
           WHEN k.category = 'fuel' AND k.emission_factor = 2.68 AND k.unit_l IN ('litre', 'liter')
                AND k.src_key = 'DIESEL'
                AND k.src_desc ~* '(^|[^a-z])(kerosene|sko)([^a-z]|$)'
                AND k.src_desc !~* '(diesel|hsd)' THEN 'KEROSENE'
           WHEN k.category = 'fuel' AND k.emission_factor = 3.00 AND k.unit_l IN ('litre', 'liter')
                AND coalesce(k.src_key, 'NAPHTHA') = 'NAPHTHA' THEN 'NAPHTHA_MANUAL_REVIEW'
         END AS change_key
    FROM keyed k
)
SELECT c.id, c.change_key, c.verified, c.activity_data, c.activity_unit,
       c.emission_factor AS old_factor, c.co2_kg AS old_co2_kg, c.verification_notes AS old_notes, c.notes,
       f.new_factor,
       CASE WHEN f.new_factor IS NULL THEN NULL ELSE round(c.activity_data * f.new_factor, 2) END AS new_co2_kg
  FROM classified c
  LEFT JOIN (VALUES
    ('LPG', 2.98::numeric), ('PNG', 2.05), ('FURNACE_OIL', 2.97), ('GRID', 0.710), ('KEROSENE', 2.52)
  ) AS f(change_key, new_factor) ON f.change_key = c.change_key
 WHERE c.change_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- DRY RUN. Safe to run alone (everything above plus these SELECTs, then
-- ROLLBACK). Shows counts and kgCO2e deltas per change_key.
-- ---------------------------------------------------------------------------
SELECT change_key,
       count(*)                                          AS rows_matched,
       count(*) FILTER (WHERE verified)                  AS verified_rows,
       round(sum(old_co2_kg), 2)                         AS old_total_kg,
       round(sum(new_co2_kg), 2)                         AS new_total_kg,
       round(sum(new_co2_kg) - sum(old_co2_kg), 2)       AS delta_kg
  FROM emissions_recalc_plan
 GROUP BY change_key
 ORDER BY change_key;

SELECT count(*) AS verified_rows_left_unchanged
  FROM public.emissions e
 WHERE e.verified
   AND (e.emission_factor IN (1.51, 2.30, 3.15, 0.708, 3.00)
        OR (lower(trim(coalesce(e.activity_unit, ''))) IN ('litre', 'liter') AND e.emission_factor = 2.68
            AND coalesce(e.verification_notes, '') ~* '(kerosene|\msko\M)'));

SELECT count(DISTINCT l.id)                    AS ledger_rows_referencing_changed_emissions,
       count(DISTINCT v.id)                    AS verifications_referencing_changed_emissions
  FROM emissions_recalc_plan p
  LEFT JOIN public.compliance_ledger l ON l.emission_id = p.id
  LEFT JOIN public.carbon_verifications v ON p.id = ANY (v.emission_ids)
 WHERE p.new_factor IS NOT NULL;

-- ---------------------------------------------------------------------------
-- APPLY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emissions_recalc_backup_20261011 (
  emission_id        uuid PRIMARY KEY,
  change_key         text NOT NULL,
  old_co2_kg         numeric(15,4) NOT NULL,
  old_emission_factor numeric(10,6),
  old_verification_notes text,
  new_co2_kg         numeric(15,4) NOT NULL,
  new_emission_factor numeric(10,6) NOT NULL,
  was_verified       boolean,
  backed_up_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emissions_recalc_backup_20261011 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.emissions_recalc_backup_20261011 FROM PUBLIC, anon, authenticated;
-- No policies: only service_role / direct DB access can read it.

INSERT INTO public.emissions_recalc_backup_20261011
  (emission_id, change_key, old_co2_kg, old_emission_factor, old_verification_notes,
   new_co2_kg, new_emission_factor, was_verified)
SELECT p.id, p.change_key, p.old_co2_kg, p.old_factor, p.old_notes,
       p.new_co2_kg, p.new_factor, p.verified
  FROM emissions_recalc_plan p
 WHERE p.new_factor IS NOT NULL
ON CONFLICT (emission_id) DO NOTHING;

-- Update only rows backed up in this run and still holding the old values,
-- so a re-run changes nothing.
UPDATE public.emissions e
   SET emission_factor = b.new_emission_factor,
       co2_kg = b.new_co2_kg,
       verification_notes = CASE
         WHEN pg_temp.try_jsonb(e.verification_notes) IS NULL THEN e.verification_notes
         ELSE (
           jsonb_set(
             pg_temp.try_jsonb(e.verification_notes),
             '{factorSource}',
             to_jsonb('BIOCOG_MVR_INDIA_v1.1:' || CASE b.change_key WHEN 'GRID' THEN 'INDIA_GRID_AVG' ELSE b.change_key END)
           ) || jsonb_build_object(
             'factorCorrection', jsonb_build_object(
               'migration', '20261011170000_recalculate_emissions',
               'previousFactor', b.old_emission_factor,
               'previousCo2Kg', b.old_co2_kg
             )
           )
         )::text
       END
  FROM public.emissions_recalc_backup_20261011 b
 WHERE b.emission_id = e.id
   AND e.co2_kg = b.old_co2_kg
   AND e.emission_factor IS NOT DISTINCT FROM b.old_emission_factor;

COMMIT;
