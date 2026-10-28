-- Behaviour tests for 20261114100000_server_only_records. Run by run_server_only_records.sh.
\set ON_ERROR_STOP on
SET client_min_messages = notice;

CREATE OR REPLACE FUNCTION pg_temp.ok(label text, cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_browser() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000a1"}', false),
         set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
$$;
CREATE OR REPLACE FUNCTION pg_temp.as_guest() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '{"role":"anon"}', false),
         set_config('request.jwt.claim.sub', '', false),
         set_config('request.headers', '{"user-agent":"ua-guest-test"}', false);
$$;
CREATE OR REPLACE FUNCTION pg_temp.as_service() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false),
         set_config('request.jwt.claim.sub', '', false);
$$;
CREATE OR REPLACE FUNCTION pg_temp.as_migration() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '', false),
         set_config('request.jwt.claim.sub', '', false);
$$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000a1', 'a@example.in') ON CONFLICT DO NOTHING;
INSERT INTO public.sessions (id, device_fingerprint, is_active) VALUES ('00000000-0000-4000-8000-00000000f001', 'ua-guest-test', true);

-- 0. The guard is in place on both tables; the insert policies are unchanged.
SELECT pg_temp.ok('trigger on documents and emissions',
  (SELECT count(*) = 2 FROM pg_trigger WHERE tgname = 'refuse_browser_record_insert' AND NOT tgisinternal
     AND tgrelid IN ('public.documents'::regclass, 'public.emissions'::regclass)));
SELECT pg_temp.ok('the existing insert policies are kept',
  (SELECT count(*) = 2 FROM pg_policies WHERE schemaname = 'public'
     AND policyname IN ('Owners can insert documents', 'Owners can insert emissions')));
SELECT pg_temp.ok('browser roles cannot call the trigger function',
  NOT has_function_privilege('anon', 'public.refuse_browser_record_insert()', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.refuse_browser_record_insert()', 'EXECUTE'));

-- 1. The reported gap: a signed-in session stores a made-up document and a
--    consistent emission row without any file being read. Both are refused.
SELECT pg_temp.as_browser();
DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  INSERT INTO public.documents (id, user_id, document_type, vendor, amount, cached_result, document_hash)
  VALUES ('00000000-0000-4000-8000-00000000d0f1', '00000000-0000-4000-8000-0000000000a1', 'invoice', 'Made Up Fuels', 9000,
          '{"vendor":"Made Up Fuels"}', 'made-up-hash');
  RAISE EXCEPTION 'FAIL: signed-in browser inserted a document';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok signed-in browser cannot insert a document';
END $$;
DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  INSERT INTO public.documents (user_id, document_type, document_hash)
  VALUES ('00000000-0000-4000-8000-0000000000a1', 'invoice', 'made-up-hash-2')
  ON CONFLICT DO NOTHING;
  RAISE EXCEPTION 'FAIL: signed-in browser upserted a document';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok signed-in browser cannot upsert a document';
END $$;
RESET ROLE;

-- A document saved by the server, for the emission attempts below.
SELECT pg_temp.as_service();
INSERT INTO public.documents (id, user_id, document_type, vendor, amount, cached_result, document_hash, file_url)
VALUES ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000000a1', 'invoice', 'Shree Fuels', 9000,
        '{"vendor":"Shree Fuels","evidence":{}}', 'hash-1', '00000000-0000-4000-8000-0000000000a1/hash-1.pdf');
SELECT pg_temp.ok('service role (extract-document) can insert a document',
  EXISTS (SELECT 1 FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d001'));

SELECT pg_temp.as_browser();
DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  INSERT INTO public.emissions (user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg)
  VALUES ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d001', 1, 'fuel', 100, 'litre', 2.68, 268);
  RAISE EXCEPTION 'FAIL: signed-in browser inserted an emission';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok signed-in browser cannot insert a consistent emission row, even on its own server-read document';
END $$;
RESET ROLE;
SELECT pg_temp.ok('nothing was stored by the refused inserts',
  NOT EXISTS (SELECT 1 FROM public.documents WHERE document_hash LIKE 'made-up%')
  AND NOT EXISTS (SELECT 1 FROM public.emissions));

-- 2. Guests (anon with their own session) cannot insert either table.
SELECT pg_temp.as_service();
INSERT INTO public.documents (id, session_id, document_type, vendor, cached_result)
VALUES ('00000000-0000-4000-8000-00000000d0b1', '00000000-0000-4000-8000-00000000f001', 'invoice', 'BPCL', '{"read":"legacy guest"}');
SELECT pg_temp.as_guest();
DO $$ BEGIN
  SET LOCAL ROLE anon;
  INSERT INTO public.documents (session_id, document_type, vendor, cached_result)
  VALUES ('00000000-0000-4000-8000-00000000f001', 'invoice', 'BPCL', '{"read":"guest"}');
  RAISE EXCEPTION 'FAIL: guest inserted a document';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok guest cannot insert a document';
END $$;
DO $$ BEGIN
  SET LOCAL ROLE anon;
  INSERT INTO public.emissions (session_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg)
  VALUES ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-00000000d0b1', 1, 'diesel', 10, 'L', 2.68, 26.8);
  RAISE EXCEPTION 'FAIL: guest inserted an emission';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok guest cannot insert an emission';
END $$;
RESET ROLE;

-- 3. Server writers pass: service role (edge functions) and no JWT (migrations).
SELECT pg_temp.as_service();
INSERT INTO public.emissions (id, user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg)
VALUES ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d001', 1, 'fuel', 100, 'litre', 2.68, 268);
SELECT pg_temp.ok('service role can insert emissions', EXISTS (SELECT 1 FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000e001'));
SELECT pg_temp.as_migration();
INSERT INTO public.documents (id, user_id, document_type, document_hash)
VALUES ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-0000000000a1', 'invoice', 'hash-2');
INSERT INTO public.emissions (id, user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg)
VALUES ('00000000-0000-4000-8000-00000000e002', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d002', 2, 'electricity', 342, 'kWh', 0.71, 242.82);
SELECT pg_temp.ok('a direct database session (no JWT) can insert both', public.is_trusted_db_writer()
  AND EXISTS (SELECT 1 FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d002')
  AND EXISTS (SELECT 1 FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000e002'));

-- 4. Reads, updates and deletes are untouched.
SELECT pg_temp.as_browser();
SET ROLE authenticated;
SELECT pg_temp.ok('signed-in browser still reads its own documents and emissions',
  (SELECT count(*) = 2 FROM public.documents) AND (SELECT count(*) = 2 FROM public.emissions));
UPDATE public.documents SET tax_amount = 642.31 WHERE id = '00000000-0000-4000-8000-00000000d001';
RESET ROLE;
SELECT pg_temp.ok('a browser update the policies allow still works',
  (SELECT tax_amount FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d001') = 642.31);
SELECT pg_temp.as_service();
UPDATE public.emissions SET verified = true, verification_notes = 'checked' WHERE id = '00000000-0000-4000-8000-00000000e001';
SELECT pg_temp.ok('service role verification update still works',
  (SELECT verified FROM public.emissions WHERE id = '00000000-0000-4000-8000-00000000e001'));
DELETE FROM public.emissions WHERE document_id = '00000000-0000-4000-8000-00000000d002';
DELETE FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d002';
SELECT pg_temp.ok('service role delete still works',
  NOT EXISTS (SELECT 1 FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d002'));

SELECT pg_temp.as_migration();
\echo ALL SERVER ONLY RECORDS TESTS PASSED
