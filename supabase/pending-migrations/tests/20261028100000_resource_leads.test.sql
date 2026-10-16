-- Behaviour tests for 20261028100000_resource_leads.sql (run after it).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;

SET ROLE service_role;
INSERT INTO public.resource_leads (resource, email, email_hash, name, company, industry, role, primary_need, source, notice_version)
VALUES ('esg-report-sample-2026', 'asha@acme.in', repeat('a', 64), 'Asha Rao', 'Acme Forgings', 'metals', 'founder', 'buyer_request', 'form', 'resource-lead-2026-10-16');
RESET ROLE;
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.resource_leads), 'the edge function (service role) stores a lead');
SELECT pg_temp.check((SELECT expires_at BETWEEN now() + interval '89 days' AND now() + interval '91 days' FROM public.resource_leads), 'a visitor lead expires in 90 days by default');
SELECT pg_temp.check((SELECT NOT marketing_consent FROM public.resource_leads), 'marketing consent is off unless given');
SELECT pg_temp.expect_error($q$INSERT INTO public.resource_leads (resource, email, email_hash, name, company, industry, role, primary_need, source, notice_version) VALUES ('esg-report-sample-2026', 'asha@acme.in', repeat('b', 64), 'A R', 'Acme', 'metals', 'founder', 'brsr', 'form', 'v')$q$, 'one row per person per resource');
SELECT pg_temp.expect_error($q$INSERT INTO public.resource_leads (resource, email, email_hash, source, notice_version) VALUES ('esg-report-sample-2026', 'b@acme.in', repeat('c', 64), 'form', 'v')$q$, 'a form lead needs all six answers');
SELECT pg_temp.expect_error($q$INSERT INTO public.resource_leads (resource, email, email_hash, name, company, industry, role, primary_need, source, notice_version) VALUES ('esg-report-sample-2026', 'Upper@Acme.in', repeat('d', 64), 'Up Per', 'Acme', 'metals', 'founder', 'brsr', 'form', 'v')$q$, 'emails are stored in lower case');
SELECT pg_temp.expect_error($q$INSERT INTO public.resource_leads (resource, email, email_hash, source, notice_version) VALUES ('esg-report-sample-2026', 'c@acme.in', 'not-a-hash', 'account', 'v')$q$, 'the link hash must be a SHA-256');
INSERT INTO public.resource_leads (resource, email, email_hash, source, notice_version, mx_status) VALUES ('esg-report-sample-2026', 'member@acme.in', repeat('e', 64), 'account', 'v', 'account');
SELECT pg_temp.check((SELECT count(*) = 2 FROM public.resource_leads), 'a signed-in download needs no form answers');
SELECT pg_temp.check((SELECT relrowsecurity FROM pg_class WHERE relname = 'resource_leads'), 'row level security is on');
SELECT pg_temp.check(NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid WHERE c.relname = 'resource_leads'), 'no policy lets any browser role in');
SELECT pg_temp.check(NOT has_table_privilege('anon', 'public.resource_leads', 'SELECT') AND NOT has_table_privilege('anon', 'public.resource_leads', 'INSERT'), 'anonymous visitors cannot read or write leads');
SELECT pg_temp.check(NOT has_table_privilege('authenticated', 'public.resource_leads', 'SELECT') AND NOT has_table_privilege('authenticated', 'public.resource_leads', 'INSERT'), 'signed-in browsers cannot read or write leads');
SET ROLE anon;
SELECT pg_temp.expect_error($q$SELECT * FROM public.resource_leads$q$, 'an anonymous session is refused');
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$INSERT INTO public.resource_leads (resource, email, email_hash, source, notice_version) VALUES ('esg-report-sample-2026', 'x@acme.in', repeat('f', 64), 'account', 'v')$q$, 'a signed-in session cannot insert');
RESET ROLE;
-- Expired rows are what the function deletes on each request.
UPDATE public.resource_leads SET expires_at = now() - interval '1 day' WHERE email = 'asha@acme.in';
SET ROLE service_role;
DELETE FROM public.resource_leads WHERE expires_at < now();
RESET ROLE;
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.resource_leads), 'the service role purges expired leads');
SELECT pg_temp.check((SELECT NOT public FROM storage.buckets WHERE id = 'gated-resources'), 'the report bucket is private');
SELECT pg_temp.check(NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid WHERE c.relname = 'objects' AND (pg_get_expr(p.polqual, p.polrelid) ILIKE '%gated-resources%' OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%gated-resources%')), 'no storage policy opens the report bucket');
DO $$ BEGIN RAISE NOTICE 'ALL RESOURCE LEAD TESTS PASSED'; END $$;
