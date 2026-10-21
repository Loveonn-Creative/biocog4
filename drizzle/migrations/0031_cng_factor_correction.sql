CREATE OR REPLACE FUNCTION pg_temp.try_jsonb(t text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN t::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.emissions_cng_backup_20261104 (
  emission_id            uuid PRIMARY KEY,
  old_co2_kg             numeric NOT NULL,
  old_emission_factor    numeric NOT NULL,
  old_verification_notes text,
  new_co2_kg             numeric NOT NULL,
  backed_up_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emissions_cng_backup_20261104 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.emissions_cng_backup_20261104 FROM PUBLIC, anon, authenticated;

INSERT INTO public.emissions_cng_backup_20261104
  (emission_id, old_co2_kg, old_emission_factor, old_verification_notes, new_co2_kg)
SELECT e.id, e.co2_kg, e.emission_factor, e.verification_notes, round(e.activity_data * 2.69, 2)
  FROM public.emissions e
 WHERE e.category = 'fuel'
   AND e.emission_factor = 2.75
   AND lower(trim(coalesce(e.activity_unit, ''))) = 'kg'
   AND NOT coalesce(e.verified, false)
   AND e.activity_data > 0
   AND e.co2_kg > 0
   AND (
     split_part(coalesce(pg_temp.try_jsonb(e.verification_notes) ->> 'factorSource', ''), ':', 2) = 'CNG'
     OR (coalesce(pg_temp.try_jsonb(e.verification_notes) ->> 'factorSource', '') = ''
         AND coalesce(pg_temp.try_jsonb(e.verification_notes) ->> 'sourceDescription', '') ~* '(^|[^a-z])cng([^a-z]|$)')
   )
ON CONFLICT (emission_id) DO NOTHING;

UPDATE public.emissions e
   SET emission_factor = 2.69,
       co2_kg = b.new_co2_kg,
       verification_notes = CASE
         WHEN pg_temp.try_jsonb(e.verification_notes) IS NULL THEN e.verification_notes
         ELSE (pg_temp.try_jsonb(e.verification_notes) || jsonb_build_object(
           'factorCorrection', jsonb_build_object(
             'migration', '20261104100000_cng_factor_correction',
             'previousFactor', b.old_emission_factor,
             'previousCo2Kg', b.old_co2_kg,
             'source', 'IPCC 2006 V2 Ch1 Tables 1.2/1.4: natural gas 56,100 kgCO2/TJ x 48.0 TJ/Gg'
           )))::text
       END
  FROM public.emissions_cng_backup_20261104 b
 WHERE b.emission_id = e.id
   AND NOT coalesce(e.verified, false)
   AND e.emission_factor = b.old_emission_factor
   AND e.co2_kg = b.old_co2_kg;