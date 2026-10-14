-- Rollback for 20261022100000_emissions_write_guard. Removes the trigger and
-- its function only; no data was changed by the migration.
BEGIN;
DROP TRIGGER IF EXISTS guard_emissions_browser_writes ON public.emissions;
DROP FUNCTION IF EXISTS public.guard_emissions_browser_writes();
COMMIT;
