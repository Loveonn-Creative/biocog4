-- Behaviour tests for 20261024100000_intelligence_usage. Run by run_intelligence_usage.sh.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.ok(label text, cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'ok %', label; END $$;

SET ROLE service_role;
DO $$
DECLARE r record; u text := 'u:00000000-0000-4000-8000-0000000000a1';
BEGIN
  SELECT * INTO r FROM public.intelligence_take(u, 'message', '2026-10-14', '2026-10-14', 2);
  PERFORM pg_temp.ok('first message counted', r.allowed AND r.used = 1);
  SELECT * INTO r FROM public.intelligence_take(u, 'message', '2026-10-14', '2026-10-14', 2);
  PERFORM pg_temp.ok('second message counted', r.allowed AND r.used = 2);
  SELECT * INTO r FROM public.intelligence_take(u, 'message', '2026-10-14', '2026-10-14', 2);
  PERFORM pg_temp.ok('third message refused at a limit of 2, not counted', NOT r.allowed AND r.used = 2);
  PERFORM pg_temp.ok('a refused message is not stored', (SELECT count FROM public.intelligence_usage WHERE subject = u AND day = '2026-10-14' AND kind = 'message') = 2);
  SELECT * INTO r FROM public.intelligence_take(u, 'message', '2026-10-15', '2026-10-15', 2);
  PERFORM pg_temp.ok('a new day starts a new daily count', r.allowed AND r.used = 1);
  -- Monthly voice window: counts across days in the month.
  PERFORM public.intelligence_take(u, 'voice_session', '2026-10-01', '2026-10-01', 2);
  SELECT * INTO r FROM public.intelligence_take(u, 'voice_session', '2026-10-20', '2026-10-01', 2);
  PERFORM pg_temp.ok('monthly window adds days together', r.allowed AND r.used = 2);
  SELECT * INTO r FROM public.intelligence_take(u, 'voice_session', '2026-10-28', '2026-10-01', 2);
  PERFORM pg_temp.ok('monthly voice limit refuses the third session', NOT r.allowed);
  SELECT * INTO r FROM public.intelligence_take(u, 'voice_session', '2026-11-02', '2026-11-01', 2);
  PERFORM pg_temp.ok('a new month starts a new voice count', r.allowed AND r.used = 1);
  PERFORM pg_temp.ok('messages and voice are counted apart', public.intelligence_used(u, 'message', '2026-10-14', '2026-10-14') = 2);
  SELECT * INTO r FROM public.intelligence_take(u, 'message', '2026-10-16', '2026-10-16', 0);
  PERFORM pg_temp.ok('a limit of 0 refuses', NOT r.allowed);
  SELECT * INTO r FROM public.intelligence_take('g:0123456789abcdef0123456789abcdef', 'message', '2026-10-14', '2026-10-14', 1);
  PERFORM pg_temp.ok('guest subjects are hashed keys', r.allowed);
END $$;
DO $$ BEGIN
  PERFORM public.intelligence_take('192.168.1.1', 'message', '2026-10-14', '2026-10-14', 5);
  RAISE EXCEPTION 'FAIL: raw address stored';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok a raw network address cannot be stored as a subject'; END $$;
DO $$ BEGIN
  PERFORM public.intelligence_take('u:00000000-0000-4000-8000-0000000000a1', 'other', '2026-10-14', '2026-10-14', 5);
  RAISE EXCEPTION 'FAIL: unknown kind';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok only messages and voice sessions are counted'; END $$;
DO $$ BEGIN
  INSERT INTO public.intelligence_usage (subject, kind, day, count) VALUES ('u:00000000-0000-4000-8000-0000000000b2', 'message', current_date - 401, 3);
  PERFORM pg_temp.ok('purge removes rows older than 400 days', public.intelligence_usage_purge() = 1);
END $$;
RESET ROLE;

SET ROLE authenticated;
DO $$ BEGIN PERFORM 1 FROM public.intelligence_usage; RAISE EXCEPTION 'FAIL: browser read';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok signed-in browsers cannot read usage'; END $$;
DO $$ BEGIN PERFORM public.intelligence_take('u:00000000-0000-4000-8000-0000000000a1', 'message', '2026-10-14', '2026-10-14', 1000); RAISE EXCEPTION 'FAIL: browser take';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok signed-in browsers cannot change their own count'; END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN PERFORM public.intelligence_used('u:00000000-0000-4000-8000-0000000000a1', 'message', '2026-10-14', '2026-10-14'); RAISE EXCEPTION 'FAIL: anon read';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok anonymous visitors have no access'; END $$;
RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'ALL INTELLIGENCE USAGE TESTS PASSED'; END $$;
