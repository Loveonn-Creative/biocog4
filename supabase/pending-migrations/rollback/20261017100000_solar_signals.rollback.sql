-- Rollback for 20261017100000_solar_signals.sql. Drops the four tables.
-- Refuses while any solar asset, reading or signal exists unless
--   SET LOCAL solar.rollback_confirm = 'drop solar data';
-- is run in the same transaction (export the tables first if needed).
BEGIN;
DO $$
BEGIN
  IF (EXISTS (SELECT 1 FROM public.solar_assets) OR EXISTS (SELECT 1 FROM public.credit_signals))
     AND coalesce(current_setting('solar.rollback_confirm', true), '') <> 'drop solar data' THEN
    RAISE EXCEPTION 'Solar data exists. Export it, then SET LOCAL solar.rollback_confirm = ''drop solar data'' to roll back.';
  END IF;
END $$;
DROP TABLE IF EXISTS public.credit_signals;
DROP TABLE IF EXISTS public.solar_readings;
DROP TABLE IF EXISTS public.solar_assets;
DROP TABLE IF EXISTS public.grid_emission_factors;
COMMIT;
