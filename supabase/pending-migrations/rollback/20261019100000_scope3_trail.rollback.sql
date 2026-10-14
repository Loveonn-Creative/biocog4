-- Rollback for 20261019100000_scope3_trail.sql. Drops the Scope 3 trail:
-- views, write function, triggers and the four tables. Nothing else changes;
-- documents, emissions and the compliance ledger are untouched.
-- Refuses while any sealed extraction, factor or Scope 3 line exists unless
--   SET LOCAL scope3.rollback_confirm = 'drop scope3 trail';
-- is run in the same transaction (export the tables first if needed).
BEGIN;
DO $$
BEGIN
  IF (EXISTS (SELECT 1 FROM public.document_extractions) OR EXISTS (SELECT 1 FROM public.scope3_factors) OR EXISTS (SELECT 1 FROM public.scope3_lines))
     AND coalesce(current_setting('scope3.rollback_confirm', true), '') <> 'drop scope3 trail' THEN
    RAISE EXCEPTION 'Scope 3 trail data exists. Export it, then SET LOCAL scope3.rollback_confirm = ''drop scope3 trail'' to roll back.';
  END IF;
END $$;
DROP VIEW IF EXISTS public.scope3_supplier_ledger;
DROP VIEW IF EXISTS public.scope3_category_totals;
DROP VIEW IF EXISTS public.scope3_trail;
DROP FUNCTION IF EXISTS public.scope3_record_document(jsonb);
DROP TABLE IF EXISTS public.scope3_lines;
DROP TABLE IF EXISTS public.scope3_documents;
DROP TABLE IF EXISTS public.scope3_factors;
DROP TABLE IF EXISTS public.document_extractions;
DROP FUNCTION IF EXISTS public.scope3_guard_line();
DROP FUNCTION IF EXISTS public.scope3_guard_factor();
DROP FUNCTION IF EXISTS public.scope3_immutable_extraction();
COMMIT;
