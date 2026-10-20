-- Behaviour tests for reconcile_subscription_manual.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000c1', 'm1@x.in'),
  ('00000000-0000-4000-8000-0000000000c2', 'm2@x.in') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) VALUES
  ('00000000-0000-4000-8000-0000000000c1'),
  ('00000000-0000-4000-8000-0000000000c2') ON CONFLICT DO NOTHING;

DO $$
DECLARE
  u uuid := '00000000-0000-4000-8000-0000000000c1';
  u2 uuid := '00000000-0000-4000-8000-0000000000c2';
  s1 uuid; s2 uuid; n int; r record; failed boolean;
BEGIN
  -- A Razorpay-style row written the old way keeps working and reads as razorpay.
  INSERT INTO public.subscriptions (user_id, tier, billing_cycle, amount, status, starts_at, expires_at, razorpay_order_id)
  VALUES (u, 'basic', 'monthly', 1999, 'active', '2026-10-01', '2026-11-01', 'order_test_1');
  SELECT payment_mode INTO r FROM public.subscriptions WHERE razorpay_order_id = 'order_test_1';
  IF r.payment_mode <> 'razorpay' THEN RAISE EXCEPTION 'FAIL: webhook row mode %', r.payment_mode; END IF;
  RAISE NOTICE 'ok: rows written as before read as razorpay';

  -- Reconcile to Pro yearly by bank transfer at a custom price.
  s1 := public.reconcile_subscription_manual(u, 'Pro', 'yearly', '2026-10-15', '2027-10-15', 50000, 'bank_transfer', 'Agreed annual price', 'staff@senseible');
  SELECT count(*) INTO n FROM public.subscriptions WHERE user_id = u AND status = 'active';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: % active rows after reconcile', n; END IF;
  SELECT * INTO r FROM public.subscriptions WHERE id = s1;
  IF r.tier <> 'pro' OR r.amount <> 50000 OR r.billed_base_amount <> 50000 OR r.gst_amount <> 9000 OR r.payment_mode <> 'bank_transfer' OR r.expires_at <> '2027-10-15'::timestamptz THEN
    RAISE EXCEPTION 'FAIL: reconciled row %', row_to_json(r);
  END IF;
  RAISE NOTICE 'ok: one active row with exact tier, dates, base price and 18%% GST';
  SELECT status INTO r FROM public.subscriptions WHERE razorpay_order_id = 'order_test_1';
  IF r.status <> 'cancelled' THEN RAISE EXCEPTION 'FAIL: earlier active row not ended'; END IF;
  RAISE NOTICE 'ok: the earlier active row is ended, not deleted';
  SELECT subscription_tier, subscription_expires_at INTO r FROM public.profiles WHERE id = u;
  IF r.subscription_tier <> 'pro' OR r.subscription_expires_at <> '2027-10-15'::timestamptz THEN RAISE EXCEPTION 'FAIL: profile %', row_to_json(r); END IF;
  RAISE NOTICE 'ok: the profile copy matches the subscription';
  SELECT amount, tax_amount, total_amount INTO r FROM public.invoices WHERE subscription_id = s1;
  IF r.amount <> 50000 OR r.tax_amount <> 9000 OR r.total_amount <> 59000 THEN RAISE EXCEPTION 'FAIL: invoice %', row_to_json(r); END IF;
  RAISE NOTICE 'ok: the tax invoice carries the reconciled price';

  -- Paise are kept exactly and GST rounds to the paisa.
  s2 := public.reconcile_subscription_manual(u, 'essential', 'monthly', '2026-10-15', '2026-11-15', 1694.07, 'manual');
  SELECT * INTO r FROM public.subscriptions WHERE id = s2;
  IF r.tier <> 'basic' OR r.billed_base_amount <> 1694.07 OR r.gst_amount <> 304.93 THEN RAISE EXCEPTION 'FAIL: paise %', row_to_json(r); END IF;
  RAISE NOTICE 'ok: Essential is stored as basic and GST rounds to the paisa';

  -- A full discount needs a note and writes no invoice.
  s2 := public.reconcile_subscription_manual(u2, 'pro', 'monthly', '2026-10-15', '2026-11-15', 0, 'discount', 'Pilot partner, owner approved');
  SELECT count(*) INTO n FROM public.invoices WHERE subscription_id = s2;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: zero-price invoice written'; END IF;
  RAISE NOTICE 'ok: a full discount writes no invoice';

  -- Bad input is refused and changes nothing.
  failed := false;
  BEGIN PERFORM public.reconcile_subscription_manual(u2, 'pro', 'monthly', '2026-10-15', '2026-11-15', 0, 'discount', ''); EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: discount without note accepted'; END IF;
  failed := false;
  BEGIN PERFORM public.reconcile_subscription_manual(u2, 'pro', 'monthly', '2026-11-15', '2026-10-15', 100, 'manual'); EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: expiry before start accepted'; END IF;
  failed := false;
  BEGIN PERFORM public.reconcile_subscription_manual(u2, 'gold', 'monthly', '2026-10-15', '2026-11-15', 100, 'manual'); EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: unknown tier accepted'; END IF;
  failed := false;
  BEGIN PERFORM public.reconcile_subscription_manual(u2, 'pro', 'monthly', '2026-10-15', '2026-11-15', 100, 'razorpay'); EXCEPTION WHEN others THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL: razorpay mode accepted for a manual reconcile'; END IF;
  SELECT count(*) INTO n FROM public.subscriptions WHERE user_id = u2 AND status = 'active';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: refused calls changed rows'; END IF;
  RAISE NOTICE 'ok: bad input is refused and changes nothing';
END $$;

-- Browsers cannot execute it.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.reconcile_subscription_manual(uuid, text, text, timestamptz, timestamptz, numeric, text, text, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.reconcile_subscription_manual(uuid, text, text, timestamptz, timestamptz, numeric, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: browser roles can execute the reconcile function';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.reconcile_subscription_manual(uuid, text, text, timestamptz, timestamptz, numeric, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: service role cannot execute it';
  END IF;
  RAISE NOTICE 'ok: only the service role can execute it';
END $$;

SELECT 'ALL RECONCILE TESTS PASSED';
