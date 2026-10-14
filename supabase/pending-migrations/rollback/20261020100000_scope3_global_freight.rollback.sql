-- Rollback for 20261020100000_scope3_global_freight.sql: restores the original
-- geography and material checks. Refuses while any GLOBAL or air-band factor
-- exists (retire and remove those drafts first; approved factors cannot be
-- deleted, so roll back only before any is approved).
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.scope3_factors WHERE geography = 'GLOBAL' OR material_key LIKE 'freight:air:%') THEN
    RAISE EXCEPTION 'GLOBAL or air-band factors exist; remove those drafts before rolling back.';
  END IF;
END $$;
ALTER TABLE public.scope3_factors DROP CONSTRAINT IF EXISTS scope3_factors_global_only_air_sea;
ALTER TABLE public.scope3_factors DROP CONSTRAINT scope3_factors_geography_check;
ALTER TABLE public.scope3_factors ADD CONSTRAINT scope3_factors_geography_check CHECK (geography ~ '^([A-Z]{2}|SUPPLIER:[0-9]{2}[A-Z0-9]{13})$');
ALTER TABLE public.scope3_factors DROP CONSTRAINT scope3_factors_material_key_check;
ALTER TABLE public.scope3_factors ADD CONSTRAINT scope3_factors_material_key_check CHECK (material_key ~ '^(hsn:[0-9]{4}([0-9]{2})?|sac:99[0-9]{2}([0-9]{2})?|freight:(road|rail|air|sea)|travel:(road|rail|air)|waste:(landfill|recycling|incineration|composting|co_processing)|stay:hotel)$');
COMMIT;
