-- Rollback for 20261021100000_electricity_engine.sql. Drops the Scope 2
-- engine: view, write function, triggers and its seven tables. The existing
-- electricity rows in public.emissions are untouched.
-- Refuses while any factor, framework, activity or instrument exists unless
--   SET LOCAL scope2.rollback_confirm = 'drop scope2 engine';
-- is run in the same transaction (export the tables first if needed).
BEGIN;
DO $$
BEGIN
  IF (EXISTS (SELECT 1 FROM public.electricity_factors) OR EXISTS (SELECT 1 FROM public.reporting_frameworks)
      OR EXISTS (SELECT 1 FROM public.electricity_activities) OR EXISTS (SELECT 1 FROM public.electricity_instruments))
     AND coalesce(current_setting('scope2.rollback_confirm', true), '') <> 'drop scope2 engine' THEN
    RAISE EXCEPTION 'Scope 2 engine data exists. Export it, then SET LOCAL scope2.rollback_confirm = ''drop scope2 engine'' to roll back.';
  END IF;
END $$;
DROP VIEW IF EXISTS public.scope2_totals;
DROP FUNCTION IF EXISTS public.scope2_record(jsonb);
DROP TABLE IF EXISTS public.electricity_calculations;
DROP TABLE IF EXISTS public.electricity_allocations;
DROP TABLE IF EXISTS public.electricity_instruments;
DROP TABLE IF EXISTS public.electricity_activities;
DROP TABLE IF EXISTS public.reporting_frameworks;
DROP TABLE IF EXISTS public.electricity_factors;
DROP FUNCTION IF EXISTS public.scope2_guard_calculation();
DROP FUNCTION IF EXISTS public.scope2_guard_allocation();
DROP FUNCTION IF EXISTS public.scope2_guard_registry();
COMMIT;
