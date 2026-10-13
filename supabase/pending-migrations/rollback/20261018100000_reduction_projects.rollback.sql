-- Rollback for 20261018100000_reduction_projects.sql. Run it before rolling
-- back 20261017100000_solar_signals.sql. Drops the two project tables and
-- returns credit_signals to its solar-only shape (solar rows are untouched).
-- Refuses while any reduction project or project signal exists unless
--   SET LOCAL reduction.rollback_confirm = 'drop reduction data';
-- is run in the same transaction (export the tables first if needed).
BEGIN;
DO $$
BEGIN
  IF (EXISTS (SELECT 1 FROM public.reduction_projects) OR EXISTS (SELECT 1 FROM public.credit_signals WHERE project_id IS NOT NULL))
     AND coalesce(current_setting('reduction.rollback_confirm', true), '') <> 'drop reduction data' THEN
    RAISE EXCEPTION 'Reduction project data exists. Export it, then SET LOCAL reduction.rollback_confirm = ''drop reduction data'' to roll back.';
  END IF;
END $$;
DELETE FROM public.credit_signals WHERE project_id IS NOT NULL;
DROP POLICY IF EXISTS "Owners read their project signals" ON public.credit_signals;
DROP INDEX IF EXISTS public.credit_signals_project_idx;
ALTER TABLE public.credit_signals DROP CONSTRAINT IF EXISTS credit_signals_one_subject;
ALTER TABLE public.credit_signals DROP COLUMN IF EXISTS details;
ALTER TABLE public.credit_signals DROP COLUMN IF EXISTS project_tco2e;
ALTER TABLE public.credit_signals DROP COLUMN IF EXISTS baseline_tco2e;
ALTER TABLE public.credit_signals DROP COLUMN IF EXISTS project_id;
ALTER TABLE public.credit_signals ALTER COLUMN asset_id SET NOT NULL;
DROP TABLE IF EXISTS public.reduction_periods;
DROP TABLE IF EXISTS public.reduction_projects;
COMMIT;
