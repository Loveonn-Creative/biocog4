-- Applied through Lovable (drizzle). Source: supabase/pending-migrations/20261020100000_scope3_global_freight.sql
-- Rollback: supabase/pending-migrations/rollback/20261020100000_scope3_global_freight.rollback.sql
-- =============================================
-- Global default factors for air and sea freight.
-- Requires 20261019100000_scope3_trail.sql. Rollback:
-- rollback/20261020100000_scope3_global_freight.rollback.sql
--
-- Aircraft and ships serve international routes, so the published freight
-- defaults for them are global (GLEC Framework, UK DESNZ) rather than
-- national. This lets public.scope3_factors hold:
-- - geography 'GLOBAL', but ONLY for air and sea freight material keys; every
--   other material still needs a country or the supplier itself;
-- - air freight distance bands 'freight:air:short' (< 1,500 km) and
--   'freight:air:long' (>= 1,500 km), chosen from the printed distance.
-- The method resolves the supplier's own factor first, then its country, and
-- only then GLOBAL, for these two modes alone. Constraint changes only; no
-- data is written.
-- =============================================

ALTER TABLE public.scope3_factors DROP CONSTRAINT scope3_factors_material_key_check;
ALTER TABLE public.scope3_factors ADD CONSTRAINT scope3_factors_material_key_check CHECK (material_key ~ '^(hsn:[0-9]{4}([0-9]{2})?|sac:99[0-9]{2}([0-9]{2})?|freight:(road|rail|air|sea)|freight:air:(short|long)|travel:(road|rail|air)|waste:(landfill|recycling|incineration|composting|co_processing)|stay:hotel)$');

ALTER TABLE public.scope3_factors DROP CONSTRAINT scope3_factors_geography_check;
ALTER TABLE public.scope3_factors ADD CONSTRAINT scope3_factors_geography_check CHECK (geography ~ '^([A-Z]{2}|SUPPLIER:[0-9]{2}[A-Z0-9]{13}|GLOBAL)$');
ALTER TABLE public.scope3_factors ADD CONSTRAINT scope3_factors_global_only_air_sea CHECK (geography <> 'GLOBAL' OR material_key ~ '^freight:(air|sea)(:|$)');
