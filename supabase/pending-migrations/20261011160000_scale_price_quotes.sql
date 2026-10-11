-- =============================================
-- Scale price quotes (NOT APPLIED; awaiting approval).
--
-- Scale is custom priced. create-razorpay-order refuses Scale checkout unless
-- the caller holds an active, unexpired quote from this table, and charges the
-- quote's amount_inr (never a client-supplied amount). verify-razorpay-payment
-- marks the quote 'consumed' after the subscription activates.
--
-- Writes are service-role only. Migration 20260613142133 revoked EXECUTE on
-- public.has_role from authenticated, so an RLS policy calling
-- has_role(auth.uid(), 'admin') would fail for browser sessions. Until an admin
-- UI/edge function exists, admins create and revoke quotes via SQL (Lovable
-- Cloud SQL editor) or a service-role client.
--
-- Not related to the India scope estimate in
-- supabase/functions/_shared/customScopeEstimate.ts.
-- =============================================

CREATE TABLE IF NOT EXISTS public.scale_price_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_inr numeric NOT NULL CHECK (amount_inr > 0),
  billing_cycle text NOT NULL DEFAULT 'yearly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  seats integer CHECK (seats IS NULL OR seats > 0),
  notes text,
  valid_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'revoked')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  consumed_order_id text
);

CREATE INDEX IF NOT EXISTS scale_price_quotes_user_status_idx
  ON public.scale_price_quotes (user_id, status);

ALTER TABLE public.scale_price_quotes ENABLE ROW LEVEL SECURITY;

-- Users can see their own quotes that are still usable. No INSERT/UPDATE/DELETE
-- policies exist, so only service_role (which bypasses RLS) can write.
DROP POLICY IF EXISTS "Users can view their own active scale quotes" ON public.scale_price_quotes;
CREATE POLICY "Users can view their own active scale quotes"
  ON public.scale_price_quotes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND status = 'active' AND valid_until > now());

REVOKE ALL ON public.scale_price_quotes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.scale_price_quotes FROM authenticated;
GRANT SELECT ON public.scale_price_quotes TO authenticated;
GRANT ALL ON public.scale_price_quotes TO service_role;

-- Example (run as service role / SQL editor, replace values):
-- INSERT INTO public.scale_price_quotes (user_id, amount_inr, billing_cycle, seats, valid_until, notes, created_by)
-- VALUES ('<customer auth uid>', <agreed amount in INR incl. GST>, 'yearly', <seats>, now() + interval '30 days', '<reference>', '<admin auth uid>');
