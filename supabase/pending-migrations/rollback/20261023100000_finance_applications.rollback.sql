-- Rollback for 20261023100000_finance_applications. Refuses while any
-- application exists unless run with
--   SET LOCAL finance.rollback_confirm = 'drop finance applications';
-- in the same transaction. Stored files must be removed from the
-- finance-documents bucket through the Storage API first (the bucket row is
-- dropped only when empty).
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.finance_applications') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.finance_applications)
     AND coalesce(current_setting('finance.rollback_confirm', true), '') <> 'drop finance applications' THEN
    RAISE EXCEPTION 'finance_applications holds applications; confirm with SET LOCAL finance.rollback_confirm';
  END IF;
END $$;
DROP TABLE IF EXISTS public.finance_application_reviews;
DROP TABLE IF EXISTS public.finance_application_documents;
DROP TABLE IF EXISTS public.finance_application_events;
DROP TABLE IF EXISTS public.finance_applications;
DROP FUNCTION IF EXISTS public.finance_events_append_only();
DELETE FROM storage.buckets b WHERE b.id = 'finance-documents' AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'finance-documents');
COMMIT;
