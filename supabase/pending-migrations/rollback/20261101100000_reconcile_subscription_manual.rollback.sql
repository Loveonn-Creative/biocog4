-- Rollback for 20261101100000_reconcile_subscription_manual. Removes the function
-- and the added columns. Reconciled rows stay as ordinary subscription rows;
-- their invoices stay in public.invoices.
DROP FUNCTION IF EXISTS public.reconcile_subscription_manual(uuid, text, text, timestamptz, timestamptz, numeric, text, text, text);
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_mode_check;
ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS reconciled_at,
  DROP COLUMN IF EXISTS reconciled_by,
  DROP COLUMN IF EXISTS discount_note,
  DROP COLUMN IF EXISTS gst_amount,
  DROP COLUMN IF EXISTS billed_base_amount,
  DROP COLUMN IF EXISTS payment_mode;
