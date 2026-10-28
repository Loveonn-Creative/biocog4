-- Rollback for 20261114100000_server_only_records. Removes the insert guard on
-- documents and emissions, restoring the catalog exactly. No data is touched:
-- the trigger stores nothing, and the insert policies were never changed.
--
-- is_trusted_db_writer() is dropped only when this migration created it (its
-- comment says so) and no other function still calls it.
BEGIN;
DROP TRIGGER IF EXISTS refuse_browser_record_insert ON public.documents;
DROP TRIGGER IF EXISTS refuse_browser_record_insert ON public.emissions;
DROP FUNCTION IF EXISTS public.refuse_browser_record_insert();

DO $$
BEGIN
  IF to_regprocedure('public.is_trusted_db_writer()') IS NOT NULL
     AND obj_description('public.is_trusted_db_writer()'::regprocedure, 'pg_proc') = 'created by 20261114100000_server_only_records'
     AND NOT EXISTS (
       SELECT 1 FROM pg_proc p
       WHERE p.prosrc LIKE '%is_trusted_db_writer%' AND p.proname <> 'is_trusted_db_writer') THEN
    DROP FUNCTION public.is_trusted_db_writer();
  END IF;
END $$;
COMMIT;
