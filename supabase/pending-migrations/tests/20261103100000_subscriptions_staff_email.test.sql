-- Behaviour tests for subscriptions_with_email and reconcile_subscription_by_email.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000d1', 'Staff.Track@x.in'),
  ('00000000-0000-4000-8000-0000000000d2', 'other@x.in') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) VALUES
  ('00000000-0000-4000-8000-0000000000d1'),
  ('00000000-0000-4000-8000-0000000000d2') ON CONFLICT DO NOTHING;

DO $$
DECLARE s uuid; r record; failed boolean;
BEGIN
  s := public.reconcile_subscription_by_email('  staff.track@X.IN ', 'pro', 'yearly', '2026-10-20', '2027-10-20', 50000, 'bank_transfer', NULL, 'staff');
  SELECT * INTO r FROM public.subscriptions_with_email WHERE id = s;
  IF r.email <> 'Staff.Track@x.in' OR r.tier <> 'pro' OR r.user_id <> '00000000-0000-4000-8000-0000000000d1' THEN RAISE EXCEPTION 'FAIL: view or lookup %', row_to_json(r); END IF;
  RAISE NOTICE 'ok: reconcile by email (case and spaces ignored) and the view shows the email';

  failed := false;
  BEGIN PERFORM public.reconcile_subscription_by_email('nobody@x.in', 'pro', 'yearly', '2026-10-20', '2027-10-20', 100, 'manual'); EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: unknown email accepted'; END IF;
  RAISE NOTICE 'ok: an unknown email is refused';

  IF EXISTS (SELECT 1 FROM public.subscriptions_with_email WHERE user_id = '00000000-0000-4000-8000-0000000000d2') THEN RAISE EXCEPTION 'FAIL: rows invented'; END IF;
  RAISE NOTICE 'ok: the view lists only real subscription rows';
END $$;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.subscriptions_with_email', 'SELECT') OR has_table_privilege('authenticated', 'public.subscriptions_with_email', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: browsers can read emails';
  END IF;
  IF has_function_privilege('authenticated', 'public.reconcile_subscription_by_email(text, text, text, timestamptz, timestamptz, numeric, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: browsers can reconcile';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.subscriptions_with_email', 'SELECT') THEN RAISE EXCEPTION 'FAIL: service role cannot read'; END IF;
  RAISE NOTICE 'ok: only the service role can read emails or reconcile';
END $$;

SELECT 'ALL STAFF EMAIL TESTS PASSED';
