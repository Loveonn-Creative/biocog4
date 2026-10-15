-- Behaviour tests for 20261026100000_financial_documents.sql (run after it).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000f1', 'f@x.in') ON CONFLICT DO NOTHING;
INSERT INTO public.financial_documents (user_id, doc_kind, storage_path, sha256, mime_type, size_bytes, figures)
VALUES ('00000000-0000-4000-8000-0000000000f1', 'itr', '00000000-0000-4000-8000-0000000000f1/' || repeat('a', 64) || '.pdf', repeat('a', 64), 'application/pdf', 1000, '{"gross_turnover_inr": 5000000}');
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.financial_documents), 'service role stores a row');
SELECT pg_temp.expect_error($q$INSERT INTO public.financial_documents (user_id, doc_kind, storage_path, sha256, mime_type, size_bytes) VALUES ('00000000-0000-4000-8000-0000000000f1', 'itr', 'other', repeat('a', 64), 'application/pdf', 1)$q$, 'same file twice for one user');
SELECT pg_temp.expect_error($q$INSERT INTO public.financial_documents (user_id, doc_kind, storage_path, sha256, mime_type, size_bytes) VALUES ('00000000-0000-4000-8000-0000000000f1', 'payslip', 'p2', repeat('b', 64), 'application/pdf', 1)$q$, 'unknown document kind');
SELECT pg_temp.expect_error($q$INSERT INTO public.financial_documents (user_id, doc_kind, storage_path, sha256, mime_type, size_bytes, figures) VALUES ('00000000-0000-4000-8000-0000000000f1', 'itr', 'p3', repeat('c', 64), 'application/pdf', 1, '[1]')$q$, 'figures must be an object');
SELECT pg_temp.check((SELECT relrowsecurity FROM pg_class WHERE relname = 'financial_documents'), 'row level security is on');
SELECT pg_temp.check(NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid WHERE c.relname = 'financial_documents'), 'no policy lets any browser role in');
SELECT pg_temp.check(NOT has_table_privilege('authenticated', 'public.financial_documents', 'SELECT'), 'signed-in browsers cannot read');
SELECT pg_temp.check(NOT has_table_privilege('anon', 'public.financial_documents', 'SELECT'), 'anonymous visitors cannot read');
SELECT pg_temp.check(NOT has_table_privilege('authenticated', 'public.financial_documents', 'INSERT'), 'browsers cannot write');
SELECT pg_temp.check((SELECT NOT public FROM storage.buckets WHERE id = 'financial-documents'), 'bucket is private');
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT * FROM public.financial_documents$q$, 'a signed-in session is refused');
RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'ALL FINANCIAL DOCUMENT TESTS PASSED'; END $$;
