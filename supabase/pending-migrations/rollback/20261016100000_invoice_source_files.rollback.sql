-- Rollback for 20261016100000_invoice_source_files.sql.
-- Restores the four storage policies exactly as 20260122104318 and
-- 20260613142133 created them and drops the readiness function, so
-- extract-document stops storing files. Stored files are kept (delete them
-- from the bucket separately if wanted). No table or row is changed.
BEGIN;

DROP FUNCTION IF EXISTS public.invoice_source_storage_ready();

DROP POLICY IF EXISTS "Authenticated users can upload their own documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can update their own documents" ON storage.objects;
CREATE POLICY "Authenticated users can update their own documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can delete their own documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete their own documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Guests can upload to documents bucket" ON storage.objects;
CREATE POLICY "Guests can upload to documents bucket"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'guest');

COMMIT;
