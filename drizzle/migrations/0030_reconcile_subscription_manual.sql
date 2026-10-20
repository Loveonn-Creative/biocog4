-- Staff-controlled subscription reconciliation (owner request, 20 October 2026).
--
-- Some plans are agreed outside checkout: a discounted price, a bank transfer,
-- a custom start or end date. Until now staff could only edit profiles by
-- hand, which left the subscription record, the profile and the tax invoice
-- disagreeing. reconcile_subscription_manual writes all three in one
-- transaction, so the plan, its dates and the billed price have one record.
--
-- * subscriptions gains how a row was paid (payment_mode, default 'razorpay'
--   so every existing and webhook-written row reads as before), the exact
--   billed base price, the GST on it, a discount note and who reconciled it.
--   Razorpay handlers are unchanged and keep writing the same columns.
-- * The function is callable only with the service role (server code or the
--   SQL editor). Browsers, signed-in or not, cannot execute it.
-- * It locks the account's profile row, ends the account's other active
--   subscription rows, inserts the reconciled row as the one active plan,
--   copies tier and expiry to the profile and stores a tax invoice row
--   (base + 18% GST) for the Billing page. Nothing is deleted.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS billed_base_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS gst_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_note text,
  ADD COLUMN IF NOT EXISTS reconciled_by text,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_payment_mode_check
  CHECK (payment_mode IN ('razorpay', 'manual', 'bank_transfer', 'discount'));

CREATE OR REPLACE FUNCTION public.reconcile_subscription_manual(
  p_user_id uuid,
  p_tier text,
  p_billing_cycle text,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_base_price numeric,
  p_payment_mode text,
  p_discount_note text DEFAULT NULL,
  p_reconciled_by text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text := lower(trim(p_tier));
  v_base numeric(12,2);
  v_gst numeric(12,2);
  v_sub_id uuid;
BEGIN
  -- The table stores Essential as 'basic'.
  IF v_tier = 'essential' THEN v_tier := 'basic'; END IF;
  IF v_tier NOT IN ('basic', 'pro', 'scale') THEN
    RAISE EXCEPTION 'reconcile_subscription_manual: tier must be essential, pro or scale' USING ERRCODE = '22023';
  END IF;
  IF p_billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'reconcile_subscription_manual: billing cycle must be monthly or yearly' USING ERRCODE = '22023';
  END IF;
  IF p_payment_mode NOT IN ('manual', 'bank_transfer', 'discount') THEN
    RAISE EXCEPTION 'reconcile_subscription_manual: payment mode must be manual, bank_transfer or discount' USING ERRCODE = '22023';
  END IF;
  IF p_starts_at IS NULL OR p_expires_at IS NULL OR p_expires_at <= p_starts_at THEN
    RAISE EXCEPTION 'reconcile_subscription_manual: expiry must be after start' USING ERRCODE = '22023';
  END IF;
  IF p_base_price IS NULL OR p_base_price < 0 THEN
    RAISE EXCEPTION 'reconcile_subscription_manual: base price must be zero or more' USING ERRCODE = '22023';
  END IF;
  IF p_base_price = 0 AND p_payment_mode <> 'discount' THEN
    RAISE EXCEPTION 'reconcile_subscription_manual: a zero price is only valid as a discount' USING ERRCODE = '22023';
  END IF;
  IF p_payment_mode = 'discount' AND nullif(trim(coalesce(p_discount_note, '')), '') IS NULL THEN
    RAISE EXCEPTION 'reconcile_subscription_manual: a discount needs a note saying why' USING ERRCODE = '22023';
  END IF;

  v_base := round(p_base_price, 2);
  v_gst := round(v_base * 0.18, 2);

  -- One reconciliation per account at a time.
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconcile_subscription_manual: no profile for that user' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.subscriptions SET status = 'cancelled', updated_at = now()
  WHERE user_id = p_user_id AND status = 'active';

  INSERT INTO public.subscriptions (
    user_id, tier, billing_cycle, amount, currency, status, starts_at, expires_at,
    payment_mode, billed_base_amount, gst_amount, discount_note, reconciled_by, reconciled_at
  ) VALUES (
    p_user_id, v_tier, p_billing_cycle, round(v_base)::integer, 'INR', 'active', p_starts_at, p_expires_at,
    p_payment_mode, v_base, v_gst, nullif(trim(coalesce(p_discount_note, '')), ''), p_reconciled_by, now()
  ) RETURNING id INTO v_sub_id;

  UPDATE public.profiles
  SET subscription_tier = v_tier, subscription_expires_at = p_expires_at
  WHERE id = p_user_id;

  -- The tax invoice the Billing page lists, at the reconciled price.
  IF v_base > 0 THEN
    INSERT INTO public.invoices (
      user_id, subscription_id, invoice_number, amount, tax_amount, total_amount, currency, status, paid_at
    ) VALUES (
      p_user_id, v_sub_id,
      'INV-' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYYMM') || '-M' || upper(substr(replace(v_sub_id::text, '-', ''), 1, 10)),
      v_base, v_gst, v_base + v_gst, 'INR', 'paid', now()
    );
  END IF;

  RETURN v_sub_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_subscription_manual(uuid, text, text, timestamptz, timestamptz, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_subscription_manual(uuid, text, text, timestamptz, timestamptz, numeric, text, text, text) TO service_role;