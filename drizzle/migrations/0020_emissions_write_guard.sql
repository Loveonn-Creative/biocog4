-- Applied through Lovable (drizzle). Source: supabase/pending-migrations/20261022100000_emissions_write_guard.sql
-- Rollback: supabase/pending-migrations/rollback/20261022100000_emissions_write_guard.rollback.sql
-- =============================================
-- PENDING, NOT APPLIED. Requires 20261011120000_protect_privileged_columns
-- (is_trusted_db_writer and the verified-column guard).
--
-- Browser writes to public.emissions are limited to what the app does:
--  - INSERT of a newly extracted row: verified is forced false, and the row
--    must be internally consistent (activity > 0, factor >= 0, co2_kg =
--    activity x factor within 0.1% or 0.01 kg, the tolerance verify-carbon
--    uses). A row whose numbers do not add up is refused, not stored.
--  - No UPDATE: the app never edits a stored row. Any update from a browser
--    session is refused, so activity data, factor, kgCO2e, scope, category,
--    verification and ownership can only change through service-role edge
--    functions (verify-carbon) or a reviewed migration.
-- DELETE is unchanged (governed by RLS and delete_document_atomic).
-- No data is changed by this migration.
-- =============================================

DO $$
BEGIN
  IF to_regprocedure('public.is_trusted_db_writer()') IS NULL THEN
    RAISE EXCEPTION 'Apply 20261011120000_protect_privileged_columns.sql first (is_trusted_db_writer is missing)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guard_emissions_browser_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Emission records cannot be edited from the app; they change only through verification'
      USING ERRCODE = '42501';
  END IF;

  NEW.verified := false;
  IF NEW.activity_data IS NULL OR NEW.activity_data <= 0
     OR NEW.emission_factor IS NULL OR NEW.emission_factor < 0
     OR NEW.co2_kg IS NULL OR NEW.co2_kg < 0
     OR abs(NEW.activity_data * NEW.emission_factor - NEW.co2_kg) > greatest(0.01, NEW.co2_kg * 0.001) THEN
    RAISE EXCEPTION 'Emission record refused: kgCO2e must equal activity data x emission factor'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_emissions_browser_writes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_emissions_browser_writes ON public.emissions;
CREATE TRIGGER guard_emissions_browser_writes
  BEFORE INSERT OR UPDATE ON public.emissions
  FOR EACH ROW EXECUTE FUNCTION public.guard_emissions_browser_writes();

