-- Rollback for 20261028100000_resource_leads.sql: removes the table and every
-- lead in it. The gated-resources bucket is removed only once it is empty
-- (delete the report file in Storage first if you want the bucket gone too).
BEGIN;
DROP TABLE IF EXISTS public.resource_leads;
DELETE FROM storage.buckets WHERE id = 'gated-resources' AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'gated-resources');
COMMIT;
