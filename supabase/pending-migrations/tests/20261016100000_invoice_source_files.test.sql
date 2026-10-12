-- Behaviour tests for 20261016100000_invoice_source_files.sql (run after it).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
-- A file the server stored for user a1.
INSERT INTO storage.objects (bucket_id, name) VALUES ('documents', '00000000-0000-4000-8000-0000000000a1/abc123.pdf');

SELECT pg_temp.check((SELECT public FROM storage.buckets WHERE id = 'documents') = false, 'bucket stays private');
SELECT pg_temp.check(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd IN ('INSERT', 'UPDATE', 'DELETE') AND qual::text || coalesce(with_check::text, '') LIKE '%documents%'),
  'no browser write policy left on the documents bucket');
SELECT pg_temp.check(public.invoice_source_storage_ready(), 'readiness function present');

-- The owner may read their folder, but cannot plant, replace or delete files.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
SELECT pg_temp.check((SELECT count(*) FROM storage.objects WHERE bucket_id = 'documents') = 1, 'owner reads own file');
SELECT pg_temp.expect_error($q$INSERT INTO storage.objects (bucket_id, name) VALUES ('documents', '00000000-0000-4000-8000-0000000000a1/planted.pdf')$q$, 'owner cannot plant a file');
UPDATE storage.objects SET metadata = '{"x":1}' WHERE bucket_id = 'documents';
DELETE FROM storage.objects WHERE bucket_id = 'documents';
RESET ROLE;
SELECT pg_temp.check((SELECT count(*) FROM storage.objects WHERE bucket_id = 'documents' AND metadata IS NULL) = 1, 'owner update and delete change nothing');

-- Another user sees nothing; guests cannot write.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
SELECT pg_temp.check((SELECT count(*) FROM storage.objects WHERE bucket_id = 'documents') = 0, 'other users read nothing');
RESET ROLE;
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT pg_temp.expect_error($q$INSERT INTO storage.objects (bucket_id, name) VALUES ('documents', 'guest/x.pdf')$q$, 'guests cannot upload');
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.invoice_source_storage_ready()$q$, 'browsers cannot call the readiness function');
RESET ROLE;
DELETE FROM storage.objects WHERE bucket_id = 'documents';
SELECT 'ALL SOURCE FILE TESTS PASSED' AS result;
