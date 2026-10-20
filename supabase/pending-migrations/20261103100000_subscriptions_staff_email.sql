-- Staff tracking of subscriptions by email (owner request, 20 October 2026).
--
-- * subscriptions_with_email: every subscription row with the account's
--   current sign-in email, read live from auth.users (so it never goes stale
--   and no copy of the email is stored). Service role only: the SQL editor
--   and server code. Browsers cannot read it.
-- * reconcile_subscription_by_email: the same as reconcile_subscription_manual,
--   looked up by email. Refuses when no account, or more than one, has it.
-- Requires 20261101100000_reconcile_subscription_manual.sql.

CREATE OR REPLACE VIEW public.subscriptions_with_email AS
SELECT u.email, s.*
FROM public.subscriptions s
LEFT JOIN auth.users u ON u.id = s.user_id;

REVOKE ALL ON public.subscriptions_with_email FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subscriptions_with_email TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_subscription_by_email(
  p_email text,
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
  v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids FROM auth.users WHERE lower(email) = lower(trim(p_email));
  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RAISE EXCEPTION 'reconcile_subscription_by_email: no account with that email' USING ERRCODE = 'P0002';
  END IF;
  IF array_length(v_ids, 1) > 1 THEN
    RAISE EXCEPTION 'reconcile_subscription_by_email: more than one account has that email; use the user id' USING ERRCODE = '22023';
  END IF;
  RETURN public.reconcile_subscription_manual(v_ids[1], p_tier, p_billing_cycle, p_starts_at, p_expires_at, p_base_price, p_payment_mode, p_discount_note, p_reconciled_by);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_subscription_by_email(text, text, text, timestamptz, timestamptz, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_subscription_by_email(text, text, text, timestamptz, timestamptz, numeric, text, text, text) TO service_role;
