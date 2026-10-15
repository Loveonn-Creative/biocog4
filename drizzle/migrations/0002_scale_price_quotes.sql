CREATE TABLE IF NOT EXISTS public.scale_price_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_inr numeric NOT NULL CHECK (amount_inr > 0),
  billing_cycle text NOT NULL DEFAULT 'yearly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  seats integer CHECK (seats IS NULL OR seats > 0),
  notes text,
  valid_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'revoked')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  consumed_order_id text
);
CREATE INDEX IF NOT EXISTS scale_price_quotes_user_status_idx ON public.scale_price_quotes (user_id, status);
GRANT SELECT ON public.scale_price_quotes TO authenticated;
GRANT ALL ON public.scale_price_quotes TO service_role;
ALTER TABLE public.scale_price_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own active scale quotes" ON public.scale_price_quotes;
CREATE POLICY "Users can view their own active scale quotes" ON public.scale_price_quotes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND status = 'active' AND valid_until > now());