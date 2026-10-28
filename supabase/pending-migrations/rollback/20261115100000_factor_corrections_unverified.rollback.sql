-- Reverts 20261115100000_factor_corrections_unverified.sql.
-- Restores co2_kg, emission_factor and verification_notes exactly from the
-- backup, only where the row is still unverified and still holds the
-- corrected values, then drops the backup table. Rows deleted or verified
-- since are left as they are. record_events logs each restore with the
-- reason below (its history is append-only and is kept).

BEGIN;

SET LOCAL app.change_reason = 'factor correction IND_EF_2026_11 rolled back';

UPDATE public.emissions e
   SET co2_kg = b.old_co2_kg,
       emission_factor = b.old_emission_factor,
       verification_notes = b.old_verification_notes
  FROM public.emissions_factor_backup_20261115 b
 WHERE b.emission_id = e.id
   AND NOT coalesce(e.verified, false)
   AND e.emission_factor = b.new_emission_factor
   AND e.co2_kg = b.new_co2_kg
   AND e.verification_notes IS NOT DISTINCT FROM b.new_verification_notes;

DROP TABLE public.emissions_factor_backup_20261115;

COMMIT;
