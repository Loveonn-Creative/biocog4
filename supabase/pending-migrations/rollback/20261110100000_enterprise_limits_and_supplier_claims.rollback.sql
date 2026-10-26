-- Rollback for 20261110100000_enterprise_limits_and_supplier_claims.sql.
-- Restores the functions exactly as 0034, 0035 and 20261109 left them, then
-- drops the new columns and functions.

DROP FUNCTION IF EXISTS public.service_reset_supplier_link(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.service_enterprise_question(uuid, boolean);

CREATE OR REPLACE FUNCTION public.supplier_request_preview(p_token text)
RETURNS TABLE (company_name text, supplier_name text, period_start date, period_end date, expired boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ea.company_name, r.supplier_name, r.period_start, r.period_end, (r.expires_at < now() OR r.status = 'revoked')
  FROM public.supplier_requests r
  JOIN public.enterprise_access ea ON ea.organization_id = r.enterprise_org_id AND ea.status = 'active'
  WHERE r.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.accept_supplier_request(p_request_id uuid DEFAULT NULL, p_token text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.supplier_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sign in first' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM public.supplier_requests
  WHERE (p_request_id IS NOT NULL AND id = p_request_id)
     OR (p_token IS NOT NULL AND token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex'))
  FOR UPDATE;
  IF NOT FOUND OR r.status IN ('revoked', 'declined') OR r.expires_at < now() THEN
    RAISE EXCEPTION 'this request is closed or has expired' USING ERRCODE = 'P0002';
  END IF;
  IF NOT private.request_matches_caller(r) AND NOT (p_token IS NOT NULL AND r.supplier_user_id IS NULL) THEN
    RAISE EXCEPTION 'this request is for another supplier' USING ERRCODE = '42501';
  END IF;
  UPDATE public.supplier_requests
  SET supplier_user_id = auth.uid(),
      status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END,
      opened_at = coalesce(opened_at, now())
  WHERE id = r.id;
  RETURN r.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.service_reissue_supplier_link(p_request_id uuid, p_caller uuid, p_valid_days integer DEFAULT 30)
RETURNS TABLE (token text, supplier_email text, supplier_name text, company_name text, period_start date, period_end date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE v_token text := encode(gen_random_bytes(32), 'hex'); r public.supplier_requests%ROWTYPE; v_company text;
BEGIN
  SELECT * INTO r FROM public.supplier_requests WHERE id = p_request_id FOR UPDATE;
  SELECT ea.company_name INTO v_company FROM public.enterprise_access ea
  JOIN public.organization_members m ON m.organization_id = ea.organization_id
  WHERE ea.organization_id = r.enterprise_org_id AND ea.status = 'active' AND m.user_id = p_caller;
  IF r.id IS NULL OR v_company IS NULL OR NOT private.enterprise_can_ask(r.enterprise_org_id, p_caller) THEN
    RAISE EXCEPTION 'this role cannot remind suppliers' USING ERRCODE = '42501';
  END IF;
  IF r.status NOT IN ('sent', 'opened') THEN RAISE EXCEPTION 'only open requests can be reminded' USING ERRCODE = 'P0001'; END IF;
  IF r.last_reminded_at > now() - interval '3 days' THEN RAISE EXCEPTION 'reminded in the last 3 days' USING ERRCODE = 'P0001'; END IF;
  UPDATE public.supplier_requests
  SET token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
      expires_at = now() + make_interval(days => greatest(1, least(p_valid_days, 90))),
      last_reminded_at = now()
  WHERE id = r.id;
  RETURN QUERY SELECT v_token, r.supplier_email, r.supplier_name, v_company, r.period_start, r.period_end;
END;
$$;

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

DROP FUNCTION public.my_enterprise_usage();
CREATE FUNCTION public.my_enterprise_usage()
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

CREATE OR REPLACE FUNCTION public.owner_seat_limit(p_owner_id uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.enterprise_access ea
      JOIN public.organizations o ON o.id = ea.organization_id
      WHERE o.owner_id = p_owner_id AND ea.status = 'active'
    ) THEN GREATEST(public.owner_plan_seat_limit(p_owner_id), private.enterprise_seat_ceiling())
    ELSE public.owner_plan_seat_limit(p_owner_id)
  END $$;
REVOKE ALL ON FUNCTION public.owner_seat_limit(uuid) FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enterprise_access_sync_seats ON public.enterprise_access;
CREATE TRIGGER enterprise_access_sync_seats AFTER INSERT OR UPDATE OF organization_id, status ON public.enterprise_access
  FOR EACH ROW EXECUTE FUNCTION private.sync_enterprise_org_seats();

CREATE OR REPLACE FUNCTION private.enterprise_bill(p_org uuid, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (kind text, quantity integer, amount_paise bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.kind, sum(u.quantity)::integer,
         sum(CASE WHEN u.kind = 'reads' THEN (u.quantity / 100.0) * u.unit_paise
                  WHEN u.kind = 'question' THEN (u.quantity / 1000.0) * u.unit_paise
                  ELSE u.quantity * u.unit_paise END)::bigint
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

ALTER TABLE public.supplier_requests
  DROP COLUMN claimed_email, DROP COLUMN claimed_at, DROP COLUMN old_token_hashes, DROP COLUMN link_reset_at;
ALTER TABLE public.enterprise_access DROP CONSTRAINT enterprise_access_terms_valid, DROP COLUMN over_limit, DROP COLUMN rates;
DROP FUNCTION IF EXISTS private.supplier_key(text, text, text);
DROP FUNCTION IF EXISTS private.enterprise_rate_for(uuid, text);
DROP FUNCTION IF EXISTS private.enterprise_over(uuid, text);
DROP FUNCTION IF EXISTS private.valid_enterprise_terms(jsonb, jsonb);
