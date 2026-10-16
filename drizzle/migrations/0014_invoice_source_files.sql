DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    RAISE EXCEPTION 'The private documents bucket is missing';
  END IF;
END $$;

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
