-- Invoice reads ledger, invoice credit packs and service orders (owner request,
-- 17 October 2026).
--
-- 1. invoice_reads: one append-only row per read. The monthly allowance is
--    counted from here, not from documents, so deleting a document never gives
--    a read back and uploading, deleting and uploading again is counted each
--    time. A read is reserved before the AI reads the file (so parallel
--    uploads cannot pass the limit together), committed when the read produced
--    something, and released (given back) only when it failed, was empty or
--    was a duplicate.
-- 2. Counting: each PDF page and each image is one invoice. Accounts move to
--    page counting from their next period (yearly and free: 1 November 2026,
--    monthly: their next billing date), set once per account in
--    invoice_read_counting; until then a file counts as one, as before.
-- 3. invoice_credit_packs: 100 extra reads per pack, used after the plan's
--    monthly allowance. Valid 12 months when bought on a yearly plan (and no
--    more than 30 days after that plan ends), else 30 days.
-- 4. service_orders: Expert Climate Audit and Fast-track Verification.
--
-- Rows are written only by edge functions (service role). Owners can read
-- their own rows. Nothing here is shown to other accounts.

CREATE TABLE IF NOT EXISTS public.invoice_read_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  ledger_started_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.invoice_read_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.invoice_read_settings ENABLE ROW LEVEL SECURITY;
-- One timestamp, readable by signed-in browsers so usage shown matches the server.
CREATE POLICY invoice_read_settings_read ON public.invoice_read_settings FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.invoice_read_counting (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  page_counting_from timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_read_counting ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_read_counting_own ON public.invoice_read_counting FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.invoice_credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id text NOT NULL UNIQUE,
  razorpay_payment_id text UNIQUE,
  packs integer NOT NULL CHECK (packs BETWEEN 1 AND 50),
  credits integer NOT NULL CHECK (credits > 0),
  used integer NOT NULL DEFAULT 0,
  base_paise integer NOT NULL CHECK (base_paise > 0),
  amount_paise integer NOT NULL CHECK (amount_paise >= base_paise),
  validity text NOT NULL CHECK (validity IN ('yearly', 'monthly')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'refunded')),
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_credit_packs_used_range CHECK (used >= 0 AND used <= credits),
  CONSTRAINT invoice_credit_packs_active_dates CHECK (status = 'pending' OR (paid_at IS NOT NULL AND expires_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS invoice_credit_packs_user_idx ON public.invoice_credit_packs (user_id, status, expires_at);
ALTER TABLE public.invoice_credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_credit_packs_own ON public.invoice_credit_packs FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.invoice_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  document_hash text,
  -- No foreign key: deleting the document keeps the read.
  document_id uuid,
  pages integer NOT NULL CHECK (pages BETWEEN 1 AND 10000),
  counting text NOT NULL CHECK (counting IN ('page', 'document')),
  units integer NOT NULL CHECK (units >= 1),
  plan_units integer NOT NULL DEFAULT 0 CHECK (plan_units >= 0),
  credit_units integer NOT NULL DEFAULT 0 CHECK (credit_units >= 0),
  credit_allocations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'committed', 'released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CONSTRAINT invoice_reads_units_split CHECK (plan_units + credit_units = units)
);
CREATE INDEX IF NOT EXISTS invoice_reads_user_period_idx ON public.invoice_reads (user_id, created_at);
ALTER TABLE public.invoice_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_reads_own ON public.invoice_reads FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('expert_audit', 'fast_track')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 20),
  razorpay_order_id text NOT NULL UNIQUE,
  razorpay_payment_id text UNIQUE,
  base_paise integer NOT NULL CHECK (base_paise > 0),
  amount_paise integer NOT NULL CHECK (amount_paise >= base_paise),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'in_progress', 'delivered', 'refunded')),
  paid_at timestamptz,
  due_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_orders_user_idx ON public.service_orders (user_id, created_at);
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_orders_own ON public.service_orders FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Credits a pack still has right now. Yearly packs stop 30 days after the
-- account's paid plan ends, if that comes first.
CREATE OR REPLACE FUNCTION public.invoice_pack_usable_until(p_pack public.invoice_credit_packs, p_plan_end timestamptz)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_pack.validity = 'yearly' THEN least(p_pack.expires_at, coalesce(p_plan_end, p_pack.paid_at) + interval '30 days')
    ELSE p_pack.expires_at
  END
$$;

-- Reserve one read before the AI reads the file. Returns
-- {ok, id, units, counting, used, limit, credits} or {ok:false, reason:'limit', ...}.
CREATE OR REPLACE FUNCTION public.reserve_invoice_read(
  p_user uuid, p_org uuid, p_hash text, p_pages integer, p_plan_limit integer,
  p_period_start timestamptz, p_page_counting_from timestamptz, p_now timestamptz DEFAULT now()
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_from timestamptz;
  v_counting text;
  v_units integer;
  v_ledger_start timestamptz;
  v_used integer;
  v_plan_left integer;
  v_plan_units integer;
  v_need integer;
  v_plan_end timestamptz;
  v_credits integer;
  v_alloc jsonb := '[]'::jsonb;
  v_pack record;
  v_take integer;
  v_id uuid;
BEGIN
  IF p_user IS NULL OR p_pages IS NULL OR p_pages < 1 OR p_plan_limit IS NULL OR p_plan_limit < 0 THEN
    RAISE EXCEPTION 'invalid read request' USING ERRCODE = '22023';
  END IF;
  -- One reservation at a time per account, so parallel uploads cannot both pass.
  PERFORM pg_advisory_xact_lock(hashtextextended('invoice_reads:' || p_user::text, 0));

  INSERT INTO public.invoice_read_counting (user_id, page_counting_from)
  VALUES (p_user, p_page_counting_from) ON CONFLICT (user_id) DO NOTHING;
  SELECT page_counting_from INTO v_from FROM public.invoice_read_counting WHERE user_id = p_user;
  v_counting := CASE WHEN p_now >= v_from THEN 'page' ELSE 'document' END;
  v_units := CASE WHEN v_counting = 'page' THEN least(p_pages, 10000) ELSE 1 END;

  -- Plan reads used this period: committed reads, recent reservations, and
  -- documents stored this period before the ledger existed.
  SELECT ledger_started_at INTO v_ledger_start FROM public.invoice_read_settings WHERE id;
  SELECT coalesce(sum(plan_units), 0) INTO v_used FROM public.invoice_reads
   WHERE user_id = p_user AND created_at >= p_period_start
     AND (status = 'committed' OR (status = 'reserved' AND created_at > p_now - interval '15 minutes'));
  IF v_ledger_start > p_period_start THEN
    v_used := v_used + (SELECT count(*) FROM public.documents d
      WHERE d.user_id = p_user AND d.created_at >= p_period_start AND d.created_at < v_ledger_start)::integer;
  END IF;

  v_plan_left := greatest(p_plan_limit - v_used, 0);
  v_plan_units := least(v_units, v_plan_left);
  v_need := v_units - v_plan_units;

  SELECT max(s.expires_at) INTO v_plan_end FROM public.subscriptions s
   WHERE s.user_id = p_user AND s.status = 'active' AND s.expires_at IS NOT NULL;
  SELECT coalesce(sum(c.credits - c.used), 0) INTO v_credits FROM public.invoice_credit_packs c
   WHERE c.user_id = p_user AND c.status = 'active' AND public.invoice_pack_usable_until(c, v_plan_end) > p_now;

  IF v_need > v_credits THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'limit', 'units', v_units, 'counting', v_counting,
      'used', v_used, 'limit', p_plan_limit, 'credits', v_credits);
  END IF;

  -- Take credits from the packs that run out first.
  IF v_need > 0 THEN
    FOR v_pack IN
      SELECT c.id, c.credits - c.used AS left_over FROM public.invoice_credit_packs c
       WHERE c.user_id = p_user AND c.status = 'active' AND c.used < c.credits
         AND public.invoice_pack_usable_until(c, v_plan_end) > p_now
       ORDER BY public.invoice_pack_usable_until(c, v_plan_end), c.created_at
       FOR UPDATE
    LOOP
      EXIT WHEN v_need = 0;
      v_take := least(v_need, v_pack.left_over);
      UPDATE public.invoice_credit_packs SET used = used + v_take WHERE id = v_pack.id;
      v_alloc := v_alloc || jsonb_build_array(jsonb_build_object('pack', v_pack.id, 'n', v_take));
      v_need := v_need - v_take;
    END LOOP;
  END IF;

  INSERT INTO public.invoice_reads (user_id, organization_id, document_hash, pages, counting, units, plan_units, credit_units, credit_allocations, created_at)
  VALUES (p_user, p_org, left(p_hash, 128), least(p_pages, 10000), v_counting, v_units, v_plan_units, v_units - v_plan_units, v_alloc, p_now)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'units', v_units, 'counting', v_counting,
    'used', v_used + v_plan_units, 'limit', p_plan_limit, 'credits', v_credits - (v_units - v_plan_units));
END
$$;

-- The read produced a result: it stays counted, whatever happens to the document.
CREATE OR REPLACE FUNCTION public.commit_invoice_read(p_id uuid, p_document_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH u AS (
    UPDATE public.invoice_reads SET status = 'committed', settled_at = now(), document_id = coalesce(p_document_id, document_id)
     WHERE id = p_id AND status IN ('reserved', 'committed') RETURNING 1
  ) SELECT EXISTS (SELECT 1 FROM u)
$$;

-- The read failed, was empty or was a duplicate: nothing is counted and any
-- credits go back. A committed read is never released.
CREATE OR REPLACE FUNCTION public.release_invoice_read(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_alloc jsonb; v_item jsonb;
BEGIN
  UPDATE public.invoice_reads SET status = 'released', settled_at = now()
   WHERE id = p_id AND status = 'reserved' RETURNING credit_allocations INTO v_alloc;
  IF NOT FOUND THEN RETURN false; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_alloc) LOOP
    UPDATE public.invoice_credit_packs SET used = greatest(used - (v_item->>'n')::integer, 0)
     WHERE id = (v_item->>'pack')::uuid;
  END LOOP;
  RETURN true;
END
$$;

REVOKE ALL ON FUNCTION public.reserve_invoice_read(uuid, uuid, text, integer, integer, timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_invoice_read(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_invoice_read(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_invoice_read(uuid, uuid, text, integer, integer, timestamptz, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_invoice_read(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_invoice_read(uuid) TO service_role;

-- Browsers read their own rows only (RLS above); all writes go through the functions.
REVOKE ALL ON public.invoice_read_settings, public.invoice_read_counting, public.invoice_credit_packs, public.invoice_reads, public.service_orders FROM anon, authenticated;
GRANT SELECT ON public.invoice_read_settings, public.invoice_read_counting, public.invoice_credit_packs, public.invoice_reads, public.service_orders TO authenticated;
