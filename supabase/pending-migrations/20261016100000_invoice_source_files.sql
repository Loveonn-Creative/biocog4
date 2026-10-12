-- =============================================
-- PENDING (NOT APPLIED). Original invoice files kept as evidence.
-- Rollback: rollback/20261016100000_invoice_source_files.rollback.sql
--
-- Uses the existing private 'documents' bucket (no new bucket). Files are
-- stored by extract-document (service role) at <user id>/<document hash>.<ext>
-- after a successful read, for signed-in users only. Guests' files are never
-- stored. Files open only through short-lived links from document-source-url,
-- which checks the uploader, or an organisation member's role (records.view).
--
-- This migration makes the bucket server-write-only, so a stored file cannot
-- be replaced, planted in advance or deleted from the browser:
--   - drops the owner INSERT, UPDATE and DELETE policies
--   - drops the unused anonymous upload policy on the shared guest/ folder
--   - keeps "Authenticated users can view their own documents" (owner read)
-- and adds public.invoice_source_storage_ready(), which extract-document
-- checks: until it exists, no file is stored.
-- No table or row is changed; existing objects are untouched.
-- =============================================
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    RAISE EXCEPTION 'The private documents bucket is missing';
  END IF;
END $$;

-- Already private since 20260122104318; restated so the file store never becomes public.
UPDATE storage.buckets SET public = false WHERE id = 'documents' AND public IS DISTINCT FROM false;

DROP POLICY IF EXISTS "Authenticated users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Guests can upload to documents bucket" ON storage.objects;

CREATE OR REPLACE FUNCTION public.invoice_source_storage_ready()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$ SELECT true $$;

REVOKE ALL ON FUNCTION public.invoice_source_storage_ready() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoice_source_storage_ready() TO service_role;

COMMIT;
