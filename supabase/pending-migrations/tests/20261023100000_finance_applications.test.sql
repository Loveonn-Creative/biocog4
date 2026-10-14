-- Behaviour tests for 20261023100000_finance_applications. Run by run_finance_applications.sh.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.ok(label text, cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'ok %', label; END $$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000a1', 'a@example.in'), ('00000000-0000-4000-8000-0000000000b2', 'b@example.in') ON CONFLICT DO NOTHING;
-- Service role (edge function) writes.
INSERT INTO public.finance_applications (id, user_id, kind, application, consent_version, consented_at)
VALUES ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'green_loan', '{"businessName":"A Ltd"}', 'finance-2026-10', now());
INSERT INTO public.finance_application_events (application_id, user_id, status, note) VALUES ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'draft', 'Application started');
INSERT INTO public.finance_application_documents (application_id, user_id, doc_type, file_name, mime_type, size_bytes, sha256, storage_path)
VALUES ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'itr', 'itr.pdf', 'application/pdf', 1000, repeat('a', 64), 'a1/f1/aaa.pdf');
INSERT INTO public.finance_application_reviews (application_id, summary) VALUES ('00000000-0000-4000-8000-0000000000f1', '{"label":"CONFIDENTIAL"}');

DO $$ BEGIN
  INSERT INTO public.finance_applications (user_id, kind, application, consent_version, consented_at) VALUES ('00000000-0000-4000-8000-0000000000a1', 'green_loan', '{}', 'finance-2026-10', now());
  RAISE EXCEPTION 'FAIL: second draft';
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'ok one open draft per applicant and kind'; END $$;
DO $$ BEGIN
  UPDATE public.finance_applications SET status = 'submitted' WHERE id = '00000000-0000-4000-8000-0000000000f1';
  RAISE EXCEPTION 'FAIL: submitted without submitted_at';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok a submitted application must carry its submission time'; END $$;
DO $$ BEGIN
  INSERT INTO public.finance_application_documents (application_id, user_id, doc_type, file_name, mime_type, size_bytes, sha256, storage_path)
  VALUES ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'itr', 'big.pdf', 'application/pdf', 2097153, repeat('b', 64), 'a1/f1/bbb.pdf');
  RAISE EXCEPTION 'FAIL: file over 2 MB stored';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok files over 2 MB are refused by the database'; END $$;
DO $$ BEGIN
  INSERT INTO public.finance_application_documents (application_id, user_id, doc_type, file_name, mime_type, size_bytes, sha256, storage_path)
  VALUES ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'itr', 'x.exe', 'application/x-msdownload', 10, repeat('c', 64), 'a1/f1/ccc.exe');
  RAISE EXCEPTION 'FAIL: exe stored';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok only PDF, JPEG and PNG are stored'; END $$;
DO $$ BEGIN
  UPDATE public.finance_application_events SET note = 'edited' WHERE application_id = '00000000-0000-4000-8000-0000000000f1';
  RAISE EXCEPTION 'FAIL: timeline edited';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok the status timeline is append-only'; END $$;

-- Applicant A (browser).
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
SET ROLE authenticated;
SELECT pg_temp.ok('owner reads their application', (SELECT count(*) FROM public.finance_applications) = 1);
SELECT pg_temp.ok('owner reads their timeline and document list', (SELECT count(*) FROM public.finance_application_events) = 1 AND (SELECT count(*) FROM public.finance_application_documents) = 1);
DO $$ BEGIN PERFORM 1 FROM public.finance_application_reviews; RAISE EXCEPTION 'FAIL: review readable';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok the internal review is not readable from the app'; END $$;
DO $$ BEGIN UPDATE public.finance_applications SET status = 'closed'; RAISE EXCEPTION 'FAIL: browser update';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok the browser cannot change an application'; END $$;
DO $$ BEGIN INSERT INTO public.finance_application_documents (application_id, user_id, doc_type, file_name, mime_type, size_bytes, sha256, storage_path) VALUES ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'itr', 'y.pdf', 'application/pdf', 10, repeat('d', 64), 'a1/f1/ddd.pdf'); RAISE EXCEPTION 'FAIL: browser insert';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok the browser cannot attach documents directly'; END $$;
RESET ROLE;

-- Applicant B sees nothing of A.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
SET ROLE authenticated;
SELECT pg_temp.ok('another applicant sees no application, timeline or document', (SELECT count(*) FROM public.finance_applications) = 0 AND (SELECT count(*) FROM public.finance_application_events) = 0 AND (SELECT count(*) FROM public.finance_application_documents) = 0);
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN PERFORM 1 FROM public.finance_applications; RAISE EXCEPTION 'FAIL: anon read';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok anonymous visitors have no access'; END $$;
RESET ROLE;

SELECT pg_temp.ok('documents bucket is private with a 2 MB limit', (SELECT NOT public AND file_size_limit = 2097152 FROM storage.buckets WHERE id = 'finance-documents'));

-- Erasure: deleting the application removes its timeline, documents list and review.
DELETE FROM public.finance_applications WHERE id = '00000000-0000-4000-8000-0000000000f1';
SELECT pg_temp.ok('erasure removes timeline, documents and review with the application', (SELECT count(*) FROM public.finance_application_events) = 0 AND (SELECT count(*) FROM public.finance_application_documents) = 0 AND (SELECT count(*) FROM public.finance_application_reviews) = 0);

INSERT INTO public.finance_applications (user_id, kind, application, consent_version, consented_at) VALUES ('00000000-0000-4000-8000-0000000000a1', 'green_loan', '{}', 'finance-2026-10', now());
SELECT 'ALL FINANCE APPLICATION TESTS PASSED';
