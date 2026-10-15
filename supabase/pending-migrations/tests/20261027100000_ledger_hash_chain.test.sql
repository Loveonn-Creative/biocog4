-- Behaviour tests for 20261027100000_ledger_hash_chain.sql (run after it).
-- run_ledger_chain.sh inserts two ledger rows for account ...c0 before the
-- migration, so they must arrive as baseline events.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.add_row(p_user uuid, p_id uuid, p_co2 numeric) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.compliance_ledger (id, user_id, document_hash, emission_category, co2_kg, methodology_version, scope, verification_status)
  VALUES (p_id, p_user, repeat('d', 64), 'FUEL', p_co2, 'BIOCOG_MVR_IN_v1.1', 1, 'pending') $$;
CREATE OR REPLACE FUNCTION pg_temp.chain_ok(p_key uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT ok FROM public.verify_ledger_chain(p_key) $$;
CREATE OR REPLACE FUNCTION pg_temp.problem(p_key uuid) RETURNS text LANGUAGE sql AS $$ SELECT problem FROM public.verify_ledger_chain(p_key) $$;

-- Baseline
SELECT pg_temp.check((SELECT count(*) = 2 AND bool_and(event_type = 'baseline') FROM public.ledger_chain_events WHERE chain_key = '00000000-0000-4000-8000-0000000000c0'), 'existing rows get one baseline event each');
SELECT pg_temp.check((SELECT prev_hash = repeat('0', 64) FROM public.ledger_chain_events WHERE chain_key = '00000000-0000-4000-8000-0000000000c0' AND chain_seq = 1), 'a chain starts from the zero hash');
SELECT pg_temp.check(pg_temp.chain_ok('00000000-0000-4000-8000-0000000000c0'), 'baseline chain verifies');

-- Normal life of a row: insert, promote, no-op update, delete
SELECT pg_temp.add_row('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000001a1', 268);
SELECT pg_temp.add_row('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000001a2', 100);
SELECT pg_temp.check((SELECT count(*) = 2 FROM public.ledger_chain_events WHERE chain_key = '00000000-0000-4000-8000-0000000000c1' AND event_type = 'insert'), 'each insert appends an event');
UPDATE public.compliance_ledger SET verification_status = 'verified', verified_at = now() WHERE id = '00000000-0000-4000-8000-0000000001a1';
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.ledger_chain_events WHERE ledger_id = '00000000-0000-4000-8000-0000000001a1' AND event_type = 'update'), 'promotion to verified appends an update');
UPDATE public.compliance_ledger SET vendor = 'Display name only', fiscal_year = 'FY26' WHERE id = '00000000-0000-4000-8000-0000000001a1';
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.ledger_chain_events WHERE ledger_id = '00000000-0000-4000-8000-0000000001a1' AND event_type = 'update'), 'a display-only update adds nothing');
DELETE FROM public.compliance_ledger WHERE id = '00000000-0000-4000-8000-0000000001a2';
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.ledger_chain_events WHERE ledger_id = '00000000-0000-4000-8000-0000000001a2' AND event_type = 'delete'), 'deleting with the invoice appends a delete');
SELECT pg_temp.check((SELECT array_agg(chain_seq ORDER BY seq) = ARRAY[1,2,3,4]::bigint[] FROM public.ledger_chain_events WHERE chain_key = '00000000-0000-4000-8000-0000000000c1'), 'chain sequence has no gaps');
SELECT pg_temp.check(pg_temp.chain_ok('00000000-0000-4000-8000-0000000000c1'), 'a normal history verifies');
SELECT pg_temp.check(pg_temp.chain_ok('00000000-0000-4000-8000-0000000000c0'), 'other accounts are separate chains');
SELECT pg_temp.check((SELECT event_hash = public.ledger_event_hash(chain_key, chain_seq, event_type, ledger_id, row_digest, prev_hash, recorded_at) FROM public.ledger_chain_events WHERE chain_key = '00000000-0000-4000-8000-0000000000c1' AND chain_seq = 2), 'event hash recomputes');
SET TIME ZONE 'Asia/Kolkata';
SELECT pg_temp.check(pg_temp.chain_ok('00000000-0000-4000-8000-0000000000c1'), 'session time zone does not change hashes');
RESET TIME ZONE;

-- Edge functions write as service_role; the trigger must still record
SET ROLE service_role;
INSERT INTO public.compliance_ledger (id, user_id, document_hash, emission_category, co2_kg, methodology_version, scope)
VALUES ('00000000-0000-4000-8000-0000000006a1', '00000000-0000-4000-8000-0000000000c6', repeat('d', 64), 'FUEL', 12, 'BIOCOG_MVR_IN_v1.1', 1);
RESET ROLE;
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.ledger_chain_events WHERE ledger_id = '00000000-0000-4000-8000-0000000006a1'), 'service role writes are recorded');
SELECT pg_temp.check(pg_temp.chain_ok('00000000-0000-4000-8000-0000000000c6'), 'service role chain verifies');

-- Append only, and server only
SELECT pg_temp.expect_error($q$UPDATE public.ledger_chain_events SET row_digest = repeat('e', 64) WHERE chain_key = '00000000-0000-4000-8000-0000000000c1'$q$, 'events cannot be edited');
SELECT pg_temp.expect_error($q$DELETE FROM public.ledger_chain_events WHERE chain_key = '00000000-0000-4000-8000-0000000000c1'$q$, 'events cannot be deleted');
SELECT pg_temp.expect_error($q$TRUNCATE public.ledger_chain_events$q$, 'events cannot be truncated');
SELECT pg_temp.check((SELECT relrowsecurity FROM pg_class WHERE relname = 'ledger_chain_events'), 'row level security is on');
SELECT pg_temp.check(NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid WHERE c.relname = 'ledger_chain_events'), 'no policy lets any browser role in');
SELECT pg_temp.check(NOT has_table_privilege('authenticated', 'public.ledger_chain_events', 'SELECT') AND NOT has_table_privilege('anon', 'public.ledger_chain_events', 'SELECT'), 'browsers cannot read events');
SELECT pg_temp.check(NOT has_function_privilege('authenticated', 'public.verify_ledger_chain(uuid)', 'EXECUTE') AND has_function_privilege('service_role', 'public.verify_ledger_chain(uuid)', 'EXECUTE'), 'only the server can run the check');
SELECT pg_temp.check(NOT has_function_privilege('authenticated', 'public.ledger_chain_append(uuid, text, uuid, uuid, text)', 'EXECUTE'), 'browsers cannot append events directly');

-- Tampering, simulated by a superuser switching triggers off
SELECT pg_temp.add_row('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000002a1', 50);
SELECT pg_temp.add_row('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000003a1', 50);
SELECT pg_temp.add_row('00000000-0000-4000-8000-0000000000c4', '00000000-0000-4000-8000-0000000004a1', 50);
SELECT pg_temp.add_row('00000000-0000-4000-8000-0000000000c5', '00000000-0000-4000-8000-0000000005a1', 50);
SELECT pg_temp.add_row('00000000-0000-4000-8000-0000000000c5', '00000000-0000-4000-8000-0000000005a2', 60);
SET session_replication_role = replica;
UPDATE public.compliance_ledger SET co2_kg = 5 WHERE id = '00000000-0000-4000-8000-0000000002a1';
DELETE FROM public.compliance_ledger WHERE id = '00000000-0000-4000-8000-0000000003a1';
UPDATE public.ledger_chain_events SET row_digest = repeat('e', 64) WHERE ledger_id = '00000000-0000-4000-8000-0000000004a1';
DELETE FROM public.ledger_chain_events WHERE ledger_id = '00000000-0000-4000-8000-0000000005a1';
SET session_replication_role = origin;
SELECT pg_temp.check(pg_temp.problem('00000000-0000-4000-8000-0000000000c2') = 'ledger row changed outside the chain', 'a silent edit to a ledger row is caught');
SELECT pg_temp.check(pg_temp.problem('00000000-0000-4000-8000-0000000000c3') = 'ledger row removed outside the chain', 'a silent delete of a ledger row is caught');
SELECT pg_temp.check(pg_temp.problem('00000000-0000-4000-8000-0000000000c4') = 'event altered', 'an edited event is caught');
SELECT pg_temp.check(pg_temp.problem('00000000-0000-4000-8000-0000000000c5') = 'missing event', 'a removed event is caught');
SELECT pg_temp.check(pg_temp.chain_ok('00000000-0000-4000-8000-0000000000c1'), 'tampering elsewhere leaves other chains intact');

DO $$ BEGIN RAISE NOTICE 'ALL LEDGER CHAIN TESTS PASSED'; END $$;
