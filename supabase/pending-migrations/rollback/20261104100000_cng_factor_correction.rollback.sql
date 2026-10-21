-- Reverts 20261104100000_cng_factor_correction.sql.
-- Restores co2_kg, emission_factor and verification_notes exactly from the
-- backup, only where the row still holds the corrected values, then drops the
-- backup table. Rows deleted since are skipped.

BEGIN;

UPDATE public.emissions e
   SET co2_kg = b.old_co2_kg,
       emission_factor = b.old_emission_factor,
       verification_notes = b.old_verification_notes
  FROM public.emissions_cng_backup_20261104 b
 WHERE b.emission_id = e.id
   AND e.emission_factor = 2.69
   AND e.co2_kg = b.new_co2_kg;

DROP TABLE public.emissions_cng_backup_20261104;

COMMIT;
