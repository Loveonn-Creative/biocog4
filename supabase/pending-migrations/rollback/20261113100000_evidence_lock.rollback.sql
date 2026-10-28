-- Rollback for 20261113100000_evidence_lock. Removes the evidence lock, the
-- history triggers and record_events, restoring the catalog exactly.
--
-- It refuses while record_events holds rows, because dropping the table
-- deletes that history. Export it first, then confirm in the same session:
--   SELECT * FROM public.record_events ORDER BY id;   -- download as CSV, keep it
--   SET senseible.confirm_record_events_rollback = 'yes';
--   \i rollback/20261113100000_evidence_lock.rollback.sql
-- The append-only trigger is dropped with the table (DROP TABLE fires no row
-- or truncate triggers), so no row is ever updated or deleted on the way out.
--
-- is_trusted_db_writer() is dropped only when this migration created it (its
-- comment says so) and no other function still calls it.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.record_events') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.record_events)
     AND coalesce(current_setting('senseible.confirm_record_events_rollback', true), '') <> 'yes' THEN
    RAISE EXCEPTION 'record_events holds change history; export it, then SET senseible.confirm_record_events_rollback = ''yes'' to drop it';
  END IF;
END $$;

DROP TRIGGER IF EXISTS lock_documents_evidence ON public.documents;
DROP TRIGGER IF EXISTS log_documents_change ON public.documents;
DROP TRIGGER IF EXISTS log_emissions_change ON public.emissions;
DROP FUNCTION IF EXISTS public.lock_documents_evidence();
DROP FUNCTION IF EXISTS public.log_documents_change();
DROP FUNCTION IF EXISTS public.log_emissions_change();
DROP TABLE IF EXISTS public.record_events;
DROP FUNCTION IF EXISTS public.record_events_append_only();

DO $$
BEGIN
  IF to_regprocedure('public.is_trusted_db_writer()') IS NOT NULL
     AND obj_description('public.is_trusted_db_writer()'::regprocedure, 'pg_proc') = 'created by 20261113100000_evidence_lock'
     AND NOT EXISTS (
       SELECT 1 FROM pg_proc p
       WHERE p.prosrc LIKE '%is_trusted_db_writer%' AND p.proname <> 'is_trusted_db_writer') THEN
    DROP FUNCTION public.is_trusted_db_writer();
  END IF;
END $$;
COMMIT;
