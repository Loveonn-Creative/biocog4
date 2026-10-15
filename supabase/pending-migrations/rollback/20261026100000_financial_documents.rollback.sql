-- Rollback for 20261026100000_financial_documents.sql. Refuses while rows or
-- stored files exist, unless confirmed with:
--   SET LOCAL financial_documents.rollback_confirm = 'drop financial documents';
BEGIN;
DO $$
BEGIN
  IF (EXISTS (SELECT 1 FROM public.financial_documents) OR EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'financial-documents'))
     AND current_setting('financial_documents.rollback_confirm', true) IS DISTINCT FROM 'drop financial documents' THEN
    RAISE EXCEPTION 'financial_documents holds data; confirm to drop it';
  END IF;
END $$;
DROP TABLE public.financial_documents;
DELETE FROM storage.buckets WHERE id = 'financial-documents' AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'financial-documents');
COMMIT;
