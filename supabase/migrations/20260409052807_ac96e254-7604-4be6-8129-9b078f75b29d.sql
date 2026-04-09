
-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;

-- Remove the overly permissive public upload policy
DROP POLICY IF EXISTS "Anyone can upload documents" ON storage.objects;

-- Add a guest upload policy scoped to session folder
CREATE POLICY "Guest users can upload to session folder"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'documents' AND auth.uid() IS NULL AND (storage.foldername(name))[1] = 'guest'
);

-- Add a guest read policy scoped to session folder
CREATE POLICY "Guest users can read from session folder"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'documents' AND auth.uid() IS NULL AND (storage.foldername(name))[1] = 'guest'
);
