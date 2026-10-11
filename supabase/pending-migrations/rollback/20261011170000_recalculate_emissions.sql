-- Reverts 20261011170000_recalculate_emissions.sql.
-- Restores co2_kg, emission_factor and verification_notes exactly from
-- public.emissions_recalc_backup_20261011, then drops the backup table.
-- Rows deleted since the recalculation are simply skipped.

BEGIN;

UPDATE public.emissions e
   SET co2_kg = b.old_co2_kg,
       emission_factor = b.old_emission_factor,
       verification_notes = b.old_verification_notes
  FROM public.emissions_recalc_backup_20261011 b
 WHERE b.emission_id = e.id;

DROP TABLE public.emissions_recalc_backup_20261011;

COMMIT;
