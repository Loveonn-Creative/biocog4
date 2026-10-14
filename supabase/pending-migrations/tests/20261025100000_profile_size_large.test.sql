-- Behaviour tests for 20261025100000_profile_size_large. Run by run_profile_size.sh.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.ok(label text, cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'ok %', label; END $$;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000a1', 'a@example.in') ON CONFLICT DO NOTHING;
UPDATE public.profiles SET size = 'large' WHERE id = '00000000-0000-4000-8000-0000000000a1';
SELECT pg_temp.ok('large is accepted', (SELECT size FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000a1') = 'large');
UPDATE public.profiles SET size = NULL WHERE id = '00000000-0000-4000-8000-0000000000a1';
SELECT pg_temp.ok('not set (NULL) is accepted', (SELECT size FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000a1') IS NULL);
DO $$ BEGIN
  UPDATE public.profiles SET size = '' WHERE id = '00000000-0000-4000-8000-0000000000a1';
  RAISE EXCEPTION 'FAIL: empty size stored';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok empty text is still refused (the app sends NULL)'; END $$;
DO $$ BEGIN
  UPDATE public.profiles SET size = '10-50 employees' WHERE id = '00000000-0000-4000-8000-0000000000a1';
  RAISE EXCEPTION 'FAIL: free text stored';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok free text is still refused'; END $$;
UPDATE public.profiles SET size = 'large' WHERE id = '00000000-0000-4000-8000-0000000000a1';
DO $$ BEGIN RAISE NOTICE 'ALL PROFILE SIZE TESTS PASSED'; END $$;
