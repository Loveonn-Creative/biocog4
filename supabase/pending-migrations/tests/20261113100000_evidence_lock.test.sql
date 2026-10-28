-- Behaviour tests for 20261113100000_evidence_lock. Run by run_evidence_lock.sh.
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

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000a1', 'a@example.in') ON CONFLICT DO NOTHING;
INSERT INTO public.sessions (id, device_fingerprint, is_active) VALUES ('00000000-0000-4000-8000-00000000f001', 'ua-guest-test', true);

-- 1. Insert by a signed-in browser still works.
SELECT pg_temp.as_browser();
SET ROLE authenticated;
INSERT INTO public.documents (id, user_id, document_type, vendor, amount, cached_result, document_hash)
VALUES ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000000a1', 'invoice', 'Tata Power', 4210.50,
        '{"read":1,"vendor":"Tata Power"}', 'hash-1');
RESET ROLE;
SELECT pg_temp.ok('signed-in browser can still insert a document', EXISTS (SELECT 1 FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d001'));
SELECT pg_temp.ok('an insert writes no history', NOT EXISTS (SELECT 1 FROM public.record_events));

-- 2. Browser cannot rewrite evidence.
SELECT pg_temp.as_browser();
DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  UPDATE public.documents SET cached_result = '{"read":"forged"}' WHERE id = '00000000-0000-4000-8000-00000000d001';
  RAISE EXCEPTION 'FAIL: browser rewrote cached_result';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok browser update of cached_result is refused';
END $$;
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['document_hash = ''x''', 'invoice_date = ''2026-01-01''', 'invoice_number = ''X1''', 'vendor = ''Other''',
                           'amount = 1', 'currency = ''USD''', 'confidence = 1', 'file_url = ''x''', 'document_type = ''receipt'''] LOOP
    BEGIN
      SET LOCAL ROLE authenticated;
      EXECUTE format('UPDATE public.documents SET %s WHERE id = %L', c, '00000000-0000-4000-8000-00000000d001');
      RAISE EXCEPTION 'FAIL: browser changed %', c;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  RAISE NOTICE 'ok browser cannot change any of the nine other evidence fields';
END $$;
RESET ROLE;
SELECT pg_temp.ok('the stored read is unchanged', (SELECT cached_result FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d001') = '{"read":1,"vendor":"Tata Power"}');
SELECT pg_temp.ok('refused updates leave no history', NOT EXISTS (SELECT 1 FROM public.record_events));

-- 3. Service role (extract-document read again) works and keeps the earlier read.
SELECT pg_temp.as_service();
SELECT set_config('app.change_reason', 'read again', false);
UPDATE public.documents SET cached_result = '{"read":2,"vendor":"Tata Power Ltd"}', vendor = 'Tata Power Ltd', confidence = 92
WHERE id = '00000000-0000-4000-8000-00000000d001';
SELECT set_config('app.change_reason', '', false);
SELECT pg_temp.ok('service role can update the stored read', (SELECT vendor FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d001') = 'Tata Power Ltd');
SELECT pg_temp.ok('one update event, only the changed fields',
  (SELECT count(*) = 1 AND bool_and(action = 'update' AND table_name = 'documents' AND changed_fields = ARRAY['vendor','confidence','cached_result'])
   FROM public.record_events));
SELECT pg_temp.ok('the earlier read is kept in old_values',
  (SELECT old_values -> 'cached_result' = '{"read":1,"vendor":"Tata Power"}'::jsonb AND old_values ->> 'vendor' = 'Tata Power'
          AND new_values ->> 'vendor' = 'Tata Power Ltd' AND NOT new_values ? 'cached_result'
   FROM public.record_events));
SELECT pg_temp.ok('actor is system for the service role, reason is recorded',
  (SELECT actor_kind = 'system' AND actor_id IS NULL AND reason = 'read again' FROM public.record_events));

-- 4. Non-evidence columns: a browser may still change them (as before); logged by name only.
SELECT pg_temp.as_browser();
SET ROLE authenticated;
UPDATE public.documents SET tax_amount = 642.31, raw_ocr_data = '{"text":"private"}' WHERE id = '00000000-0000-4000-8000-00000000d001';
RESET ROLE;
SELECT pg_temp.ok('non-evidence columns logged by name only, actor is the user',
  (SELECT changed_fields = ARRAY['tax_amount','raw_ocr_data'] AND old_values = '{}'::jsonb AND new_values = '{}'::jsonb
          AND actor_kind = 'user' AND actor_id = '00000000-0000-4000-8000-0000000000a1'
   FROM public.record_events ORDER BY id DESC LIMIT 1));
SELECT pg_temp.as_service();
UPDATE public.documents SET vendor = vendor WHERE id = '00000000-0000-4000-8000-00000000d001';
SELECT pg_temp.ok('an update that changes nothing writes no event', (SELECT count(*) FROM public.record_events) = 2);

-- 5. Emissions update by the service role (verify-carbon) logs changed fields.
INSERT INTO public.emissions (id, user_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg, verified)
VALUES ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000d001', 2, 'electricity', 342, 'kWh', 0.71, 242.82, false);
UPDATE public.emissions SET verified = true, verification_notes = 'checked' WHERE id = '00000000-0000-4000-8000-00000000e001';
SELECT pg_temp.ok('emissions update logs only verified and verification_notes',
  (SELECT changed_fields = ARRAY['verified','verification_notes'] AND old_values = '{"verified":false,"verification_notes":null}'::jsonb
          AND new_values = '{"verified":true,"verification_notes":"checked"}'::jsonb AND actor_kind = 'system'
   FROM public.record_events WHERE table_name = 'emissions'));
UPDATE public.emissions SET data_quality = 'high' WHERE id = '00000000-0000-4000-8000-00000000e001';
SELECT pg_temp.ok('emissions non-business column logged by name only',
  (SELECT changed_fields = ARRAY['data_quality'] AND old_values = '{}'::jsonb FROM public.record_events WHERE table_name = 'emissions' ORDER BY id DESC LIMIT 1));

-- 6. Guest insert and delete by session still work; the delete is logged.
-- The replayed schema has no DELETE policy on documents, so a browser delete
-- removes nothing under RLS (unchanged by this migration). A test-only policy
-- stands in for any live one, to prove the triggers let a guest delete through.
CREATE POLICY "test only guest delete" ON public.documents FOR DELETE TO anon
  USING (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND owns_guest_session(session_id));
SELECT pg_temp.as_guest();
SET ROLE anon;
INSERT INTO public.documents (id, session_id, document_type, vendor, cached_result)
VALUES ('00000000-0000-4000-8000-00000000d0b1', '00000000-0000-4000-8000-00000000f001', 'invoice', 'BPCL', '{"read":"guest"}');
RESET ROLE;
SELECT pg_temp.as_service();
INSERT INTO public.emissions (id, session_id, document_id, scope, category, activity_data, activity_unit, emission_factor, co2_kg)
VALUES ('00000000-0000-4000-8000-00000000e0b1', '00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-00000000d0b1', 1, 'diesel', 10, 'L', 2.68, 26.8);
SELECT pg_temp.as_guest();
SET ROLE anon;
DELETE FROM public.documents WHERE session_id = '00000000-0000-4000-8000-00000000f001';
RESET ROLE;
SELECT pg_temp.ok('guest delete by session removes the guest document', NOT EXISTS (SELECT 1 FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d0b1'));
SELECT pg_temp.ok('the guest delete is logged with the read it removed',
  (SELECT action = 'delete' AND new_values IS NULL AND old_values -> 'cached_result' = '{"read":"guest"}'::jsonb AND old_values ->> 'vendor' = 'BPCL'
          AND actor_kind = 'system'
   FROM public.record_events WHERE table_name = 'documents' AND record_id = '00000000-0000-4000-8000-00000000d0b1'));
SELECT pg_temp.ok('the cascaded emission delete is logged too',
  (SELECT action = 'delete' AND (old_values ->> 'co2_kg')::numeric = 26.8
   FROM public.record_events WHERE table_name = 'emissions' AND record_id = '00000000-0000-4000-8000-00000000e0b1'));
DROP POLICY "test only guest delete" ON public.documents;

-- 7. Server delete (delete-document) still works.
SELECT pg_temp.as_service();
DELETE FROM public.emissions WHERE document_id = '00000000-0000-4000-8000-00000000d001';
DELETE FROM public.documents WHERE id = '00000000-0000-4000-8000-00000000d001';
SELECT pg_temp.ok('service role delete works and is logged',
  EXISTS (SELECT 1 FROM public.record_events WHERE record_id = '00000000-0000-4000-8000-00000000d001' AND action = 'delete'));

-- 8. Browser roles have no access to record_events.
DO $$
DECLARE r text; stmt text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH stmt IN ARRAY ARRAY[
      'SELECT count(*) FROM public.record_events',
      'INSERT INTO public.record_events (table_name, record_id, action, changed_fields, actor_kind) VALUES (''documents'', gen_random_uuid(), ''update'', ''{x}'', ''user'')',
      'UPDATE public.record_events SET reason = ''x''',
      'DELETE FROM public.record_events'] LOOP
      BEGIN
        EXECUTE format('SET LOCAL ROLE %I', r);
        EXECUTE stmt;
        RAISE EXCEPTION 'FAIL: % ran %', r, stmt;
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END LOOP;
  END LOOP;
  RESET ROLE;
  RAISE NOTICE 'ok anon and authenticated cannot select, insert, update or delete record_events';
END $$;

-- 9. Append-only for everyone, including the owner and the service role.
DO $$ BEGIN
  UPDATE public.record_events SET reason = 'edited';
  RAISE EXCEPTION 'FAIL: record_events row updated';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok record_events rows cannot be updated (owner)';
END $$;
DO $$ BEGIN
  DELETE FROM public.record_events;
  RAISE EXCEPTION 'FAIL: record_events row deleted';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok record_events rows cannot be deleted (owner)';
END $$;
DO $$ BEGIN
  TRUNCATE public.record_events;
  RAISE EXCEPTION 'FAIL: record_events truncated';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok record_events cannot be truncated';
END $$;
SELECT pg_temp.ok('history is intact', (SELECT count(*) FROM public.record_events) >= 8);

-- 10. Nothing is logged from financial_documents.
SELECT pg_temp.ok('no history trigger on financial_documents',
  to_regclass('public.financial_documents') IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.financial_documents') AND tgname LIKE 'log_%'));

SELECT set_config('request.jwt.claims', '', false);
SELECT pg_temp.ok('migration context (no JWT) is trusted', public.is_trusted_db_writer());

\echo ALL EVIDENCE LOCK TESTS PASSED
