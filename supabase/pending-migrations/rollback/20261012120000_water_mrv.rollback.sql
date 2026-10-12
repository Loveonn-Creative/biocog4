-- =============================================
-- ROLLBACK for pending-migrations/20261012120000_water_mrv.sql
-- Drops only the water_* objects that migration created. Nothing else is touched.
-- Safety: refuses to run while water bills exist, unless the operator first runs
--   SET LOCAL water.rollback_confirm = 'drop water data';
-- inside the same transaction (export the tables first if the data is needed).
-- =============================================
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.water_bill') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.water_bill)
     AND coalesce(current_setting('water.rollback_confirm', true), '') <> 'drop water data' THEN
    RAISE EXCEPTION 'water_bill has rows; export them, then SET LOCAL water.rollback_confirm = ''drop water data''';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.water_transition_flag(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.water_apply_recalc(jsonb);
DROP FUNCTION IF EXISTS public.water_persist_run(jsonb);

-- Tables in dependency order; dropping a table drops its triggers and policies.
DROP TABLE IF EXISTS public.water_audit_event;
DROP TABLE IF EXISTS public.water_data_gap_flag;
DROP TABLE IF EXISTS public.water_emission_result;
DROP TABLE IF EXISTS public.water_locked_period;
DROP TABLE IF EXISTS public.water_calc_run;
DROP TABLE IF EXISTS public.water_bill;
DROP TABLE IF EXISTS public.water_category_mapping_rule;
DROP TABLE IF EXISTS public.water_emission_factor;
DROP TABLE IF EXISTS public.water_mrv_role;
DROP TABLE IF EXISTS public.water_mrv_settings;

DROP FUNCTION IF EXISTS public.water_audit_immutable();
DROP FUNCTION IF EXISTS public.water_flag_guard();
DROP FUNCTION IF EXISTS public.water_result_guard();
DROP FUNCTION IF EXISTS public.water_factor_guard();

COMMIT;
