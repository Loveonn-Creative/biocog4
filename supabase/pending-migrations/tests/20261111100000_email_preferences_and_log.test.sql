-- Behaviour tests for email_preferences and email_log.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000e1', 'owner@x.in'),
  ('00000000-0000-4000-8000-0000000000e2', 'other@x.in') ON CONFLICT DO NOTHING;

-- Signed in as e1.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', false);

DO $$
DECLARE failed boolean; n int;
BEGIN
  INSERT INTO public.email_preferences (user_id, record_tips) VALUES ('00000000-0000-4000-8000-0000000000e1', false);
  UPDATE public.email_preferences SET supplier_summary = false, updated_at = now() WHERE user_id = '00000000-0000-4000-8000-0000000000e1';
  SELECT count(*) INTO n FROM public.email_preferences WHERE record_tips = false AND supplier_summary = false;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: own preferences not saved'; END IF;
  RAISE NOTICE 'ok: an account creates and changes its own preferences';

  failed := false;
  BEGIN INSERT INTO public.email_preferences (user_id) VALUES ('00000000-0000-4000-8000-0000000000e2'); EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: wrote another account''s preferences'; END IF;
  RAISE NOTICE 'ok: an account cannot create preferences for someone else';

  failed := false;
  BEGIN UPDATE public.email_preferences SET user_id = '00000000-0000-4000-8000-0000000000e2'; EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: user_id could be changed'; END IF;
  RAISE NOTICE 'ok: the owner column cannot be changed';

  failed := false;
  BEGIN DELETE FROM public.email_preferences; EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: preferences could be deleted from the browser'; END IF;
  RAISE NOTICE 'ok: preferences cannot be deleted from the browser';

  failed := false;
  BEGIN PERFORM 1 FROM public.email_log; EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: browser read the send log'; END IF;
  RAISE NOTICE 'ok: browsers cannot read the send log';
END $$;

-- Signed in as e2: cannot see e1's row.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e2', false);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.email_preferences) THEN RAISE EXCEPTION 'FAIL: saw another account''s preferences'; END IF;
  RAISE NOTICE 'ok: an account sees only its own preferences';
END $$;

RESET ROLE;
SET ROLE anon;
DO $$
DECLARE failed boolean := false;
BEGIN
  BEGIN PERFORM 1 FROM public.email_preferences; EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: signed-out read preferences'; END IF;
  RAISE NOTICE 'ok: signed-out visitors cannot read preferences';
END $$;
RESET ROLE;

-- Server: one row per dedupe key.
SET ROLE service_role;
DO $$
DECLARE n int;
BEGIN
  INSERT INTO public.email_log (user_id, kind, dedupe_key) VALUES ('00000000-0000-4000-8000-0000000000e1', 'plan_ending', 'plan_ending_7d:e1:2026-11-03');
  INSERT INTO public.email_log (user_id, kind, dedupe_key) VALUES ('00000000-0000-4000-8000-0000000000e1', 'plan_ending', 'plan_ending_7d:e1:2026-11-03') ON CONFLICT (dedupe_key) DO NOTHING;
  SELECT count(*) INTO n FROM public.email_log;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: same email logged twice'; END IF;
  RAISE NOTICE 'ok: the same email key is kept once';
END $$;
RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'ALL EMAIL PREFERENCE TESTS PASSED'; END $$;
