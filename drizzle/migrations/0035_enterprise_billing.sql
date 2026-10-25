-- 20261108100000_enterprise_billing.sql (BEGIN/COMMIT removed; the tool manages the transaction)
DO $$
BEGIN
  IF to_regclass('public.invoice_credit_packs') IS NULL OR to_regclass('public.enterprise_access') IS NULL THEN
    RAISE EXCEPTION 'Apply 20261030100000_invoice_reads_and_purchases and 20261107100000_enterprise_pilot first';
  END IF;
END $$;

ALTER TABLE public.enterprise_access
  ADD COLUMN seats_included integer NOT NULL DEFAULT 10 CHECK (seats_included BETWEEN 1 AND 10000),
  ADD COLUMN reads_per_supplier integer NOT NULL DEFAULT 150 CHECK (reads_per_supplier BETWEEN 0 AND 100000),
  ADD COLUMN reports_included integer NOT NULL DEFAULT 120 CHECK (reports_included BETWEEN 0 AND 100000),
  ADD COLUMN reminders_per_request integer NOT NULL DEFAULT 2 CHECK (reminders_per_request BETWEEN 0 AND 100),
  ADD COLUMN questions_per_month integer NOT NULL DEFAULT 2000 CHECK (questions_per_month BETWEEN 0 AND 1000000),
  ADD COLUMN contract_start date NOT NULL DEFAULT current_date;

CREATE TABLE public.enterprise_rates (
  kind text PRIMARY KEY CHECK (kind IN ('supplier', 'seat', 'reads_100', 'report', 'reminder', 'questions_1000')),
  unit_paise integer NOT NULL CHECK (unit_paise >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.enterprise_rates (kind, unit_paise) VALUES
  ('supplier', 119900),
  ('seat', 599900),
  ('reads_100', 7900),
  ('report', 9900),
  ('reminder', 900),
  ('questions_1000', 299900);
ALTER TABLE public.enterprise_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enterprise_rates FROM PUBLIC, anon, authenticated;

CREATE TABLE public.enterprise_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('supplier', 'reads', 'report', 'reminder', 'question')),
  quantity integer NOT NULL CHECK (quantity > 0),
  billable boolean NOT NULL,
  unit_paise integer CHECK (unit_paise IS NULL OR unit_paise >= 0),
  ref text CHECK (ref IS NULL OR length(ref) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enterprise_usage_org_idx ON public.enterprise_usage (enterprise_org_id, kind, created_at);
ALTER TABLE public.enterprise_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enterprise_usage FROM PUBLIC, anon, authenticated;

ALTER TABLE public.invoice_credit_packs ADD COLUMN funded_by_org uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.supplier_requests ADD COLUMN reminders_sent integer NOT NULL DEFAULT 0 CHECK (reminders_sent >= 0);

CREATE OR REPLACE FUNCTION private.enterprise_year_start(_org uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (ea.contract_start + make_interval(years => greatest(0,
           extract(year FROM age(current_date, ea.contract_start))::integer)))::timestamptz
  FROM public.enterprise_access ea WHERE ea.organization_id = _org
$$;
REVOKE ALL ON FUNCTION private.enterprise_year_start(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.enterprise_rate(_kind text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT unit_paise FROM public.enterprise_rates WHERE kind = _kind $$;
REVOKE ALL ON FUNCTION private.enterprise_rate(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.check_supplier_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_limit integer; v_open integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.enterprise_org_id::text, 0));
  SELECT ea.supplier_limit INTO v_limit FROM public.enterprise_access ea
  WHERE ea.organization_id = NEW.enterprise_org_id AND ea.status = 'active';
  IF v_limit IS NULL THEN RAISE EXCEPTION 'enterprise access is not active' USING ERRCODE = '42501'; END IF;
  SELECT count(*) INTO v_open FROM public.supplier_requests
  WHERE enterprise_org_id = NEW.enterprise_org_id AND status <> 'revoked';
  IF v_open >= v_limit THEN
    INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise, ref)
    VALUES (NEW.enterprise_org_id, 'supplier', 1, true, private.enterprise_rate('supplier'), 'request:' || NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.count_supplier_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_included integer;
BEGIN
  IF NEW.last_reminded_at IS DISTINCT FROM OLD.last_reminded_at AND NEW.last_reminded_at IS NOT NULL THEN
    NEW.reminders_sent := OLD.reminders_sent + 1;
    SELECT ea.reminders_per_request INTO v_included FROM public.enterprise_access ea
    WHERE ea.organization_id = NEW.enterprise_org_id;
    IF NEW.reminders_sent > coalesce(v_included, 2) THEN
      INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise, ref)
      VALUES (NEW.enterprise_org_id, 'reminder', 1, true, private.enterprise_rate('reminder'), 'request:' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.count_supplier_reminder() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER supplier_requests_count_reminder BEFORE UPDATE OF last_reminded_at ON public.supplier_requests
  FOR EACH ROW EXECUTE FUNCTION private.count_supplier_reminder();

CREATE OR REPLACE FUNCTION public.record_enterprise_download(p_what text DEFAULT 'supplier_sheet')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid; v_role text; v_included integer; v_used integer; v_billable boolean;
BEGIN
  SELECT ea.organization_id, m.role, ea.reports_included INTO v_org, v_role, v_included
  FROM public.enterprise_access ea
  JOIN public.organization_members m ON m.organization_id = ea.organization_id
  WHERE ea.status = 'active' AND m.user_id = auth.uid()
  LIMIT 1;
  IF v_org IS NULL OR v_role = 'viewer' THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('enterprise_report:' || v_org::text, 0));
  SELECT coalesce(sum(quantity), 0) INTO v_used FROM public.enterprise_usage
  WHERE enterprise_org_id = v_org AND kind = 'report' AND created_at >= private.enterprise_year_start(v_org);
  v_billable := v_used >= v_included;
  INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise, ref)
  VALUES (v_org, 'report', 1, v_billable, CASE WHEN v_billable THEN private.enterprise_rate('report') END, left(coalesce(p_what, 'report'), 60));
  RETURN jsonb_build_object('ok', true, 'used', v_used + 1, 'included', v_included);
END;
$$;
REVOKE ALL ON FUNCTION public.record_enterprise_download(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_enterprise_download(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.service_enterprise_cover_reads(p_user uuid, p_units integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid; v_company text; v_included integer; v_year timestamptz;
  v_granted integer; v_left integer; v_extra integer := 0; v_need integer;
BEGIN
  IF p_user IS NULL OR p_units IS NULL OR p_units < 1 THEN RETURN jsonb_build_object('covered', false); END IF;
  SELECT r.enterprise_org_id, ea.company_name, ea.reads_per_supplier INTO v_org, v_company, v_included
  FROM public.supplier_requests r
  JOIN public.enterprise_access ea ON ea.organization_id = r.enterprise_org_id AND ea.status = 'active'
  WHERE r.supplier_user_id = p_user AND r.status IN ('opened', 'shared')
  ORDER BY r.created_at DESC
  LIMIT 1;
  IF v_org IS NULL THEN RETURN jsonb_build_object('covered', false); END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('enterprise_reads:' || v_org::text || ':' || p_user::text, 0));
  v_year := private.enterprise_year_start(v_org);
  SELECT coalesce(sum(credits), 0) INTO v_granted FROM public.invoice_credit_packs
  WHERE user_id = p_user AND funded_by_org = v_org AND created_at >= v_year
    AND razorpay_order_id LIKE 'enterprise-included:%';
  v_left := greatest(v_included - v_granted, 0);
  v_need := p_units;

  IF v_left > 0 THEN
    INSERT INTO public.invoice_credit_packs (user_id, razorpay_order_id, packs, credits, base_paise, amount_paise, validity, status, paid_at, expires_at, funded_by_org)
    VALUES (p_user, 'enterprise-included:' || gen_random_uuid(), 1, v_left, 1, 1, 'monthly', 'active', now(), now() + interval '365 days', v_org);
    INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, ref)
    VALUES (v_org, 'reads', v_left, false, 'supplier:' || p_user);
    v_need := v_need - v_left;
  END IF;

  IF v_need > 0 THEN
    v_extra := ceil(v_need / 100.0)::integer * 100;
    INSERT INTO public.invoice_credit_packs (user_id, razorpay_order_id, packs, credits, base_paise, amount_paise, validity, status, paid_at, expires_at, funded_by_org)
    VALUES (p_user, 'enterprise-extra:' || gen_random_uuid(), 1, v_extra, 1, 1, 'monthly', 'active', now(), now() + interval '365 days', v_org);
    INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise, ref)
    VALUES (v_org, 'reads', v_extra, true, private.enterprise_rate('reads_100'), 'supplier:' || p_user);
  END IF;

  RETURN jsonb_build_object('covered', true, 'reads', v_left + v_extra, 'billable', v_extra, 'company', v_company);
END;
$$;
REVOKE ALL ON FUNCTION public.service_enterprise_cover_reads(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_enterprise_cover_reads(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.my_enterprise_usage()
RETURNS TABLE (kind text, used integer, included integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE v_org uuid; ea public.enterprise_access%ROWTYPE; v_year timestamptz;
BEGIN
  SELECT a.* INTO ea FROM public.enterprise_access a
  JOIN public.organization_members m ON m.organization_id = a.organization_id
  WHERE a.status = 'active' AND m.user_id = auth.uid() LIMIT 1;
  IF ea.organization_id IS NULL THEN RETURN; END IF;
  v_org := ea.organization_id; v_year := private.enterprise_year_start(v_org);
  RETURN QUERY
    SELECT 'suppliers', (SELECT count(*)::integer FROM public.supplier_requests WHERE enterprise_org_id = v_org AND status <> 'revoked'), ea.supplier_limit
    UNION ALL SELECT 'seats', (SELECT count(*)::integer FROM public.organization_members WHERE organization_id = v_org), ea.seats_included
    UNION ALL SELECT 'reports', (SELECT coalesce(sum(quantity), 0)::integer FROM public.enterprise_usage WHERE enterprise_org_id = v_org AND kind = 'report' AND created_at >= v_year), ea.reports_included
    UNION ALL SELECT 'supplier_reads', (SELECT coalesce(sum(c.used), 0)::integer FROM public.invoice_credit_packs c WHERE c.funded_by_org = v_org AND c.created_at >= v_year),
      ea.reads_per_supplier * ea.supplier_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.my_enterprise_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_enterprise_usage() TO authenticated;

CREATE OR REPLACE FUNCTION private.enterprise_bill(p_org uuid, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (kind text, quantity integer, amount_paise bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.kind, sum(u.quantity)::integer,
         sum(CASE WHEN u.kind = 'reads' THEN (u.quantity / 100.0) * u.unit_paise ELSE u.quantity * u.unit_paise END)::bigint
  FROM public.enterprise_usage u
  WHERE u.enterprise_org_id = p_org AND u.billable AND u.created_at >= p_from AND u.created_at < p_to
  GROUP BY u.kind
  UNION ALL
  SELECT 'seat', greatest(count(m.*)::integer - max(ea.seats_included), 0),
         (greatest(count(m.*)::integer - max(ea.seats_included), 0) * private.enterprise_rate('seat'))::bigint
  FROM public.enterprise_access ea
  LEFT JOIN public.organization_members m ON m.organization_id = ea.organization_id
  WHERE ea.organization_id = p_org
$$;
REVOKE ALL ON FUNCTION private.enterprise_bill(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;