-- 20261110100000_enterprise_limits_and_supplier_claims.sql
-- Apply after 20261109100000_enterprise_seats_and_question_billing.
--
-- 1. Custom enterprise limits. Every enterprise number is agreed in its quote,
--    and for each one whether it stops at the limit or carries on and bills the
--    extra: enterprise_access.over_limit {"suppliers"|"seats"|"reads"|"reports"|
--    "reminders"|"questions": "stop"|"bill"} (missing means "bill") and
--    enterprise_access.rates {enterprise_rates kind: paise} (missing means the
--    stored rate). Suppliers count once per contract year, so asking the same
--    supplier for another period is not a new supplier. Supplier reads the
--    enterprise covers stop once the request has expired. my_enterprise_usage
--    returns the rule and the extra billed so far, for the enterprise's Profile.
-- 2. Supplier claims. A link claims only the request its code belongs to (a
--    request id with any other code finds nothing). Forwarded links still work
--    and the buyer sees which email claimed the request and
--    can reset it: the claim is removed, earlier shares stop counting and a
--    fresh link goes to the supplier. A reminder no longer breaks the links
--    already sent.
--
-- Backward compatible: existing enterprises keep "bill" for every item and the
-- stored rates, so nothing they see or pay changes until their terms are set.

DO $$
BEGIN
  IF to_regprocedure('public.owner_plan_seat_limit(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Apply 20261109100000_enterprise_seats_and_question_billing first.';
  END IF;
END $$;

-- ---------------------------------------------------------------- terms
CREATE OR REPLACE FUNCTION private.valid_enterprise_terms(p_over jsonb, p_rates jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(p_over) = 'object' AND jsonb_typeof(p_rates) = 'object'
    AND NOT EXISTS (SELECT 1 FROM jsonb_each(p_over) e
      WHERE e.key NOT IN ('suppliers', 'seats', 'reads', 'reports', 'reminders', 'questions')
         OR jsonb_typeof(e.value) <> 'string' OR (e.value #>> '{}') NOT IN ('stop', 'bill'))
    AND NOT EXISTS (SELECT 1 FROM jsonb_each(p_rates) e
      WHERE e.key NOT IN ('supplier', 'seat', 'reads_100', 'report', 'reminder', 'questions_1000')
         OR jsonb_typeof(e.value) <> 'number' OR (e.value #>> '{}')::numeric < 0
         OR (e.value #>> '{}')::numeric <> trunc((e.value #>> '{}')::numeric))
$$;
REVOKE ALL ON FUNCTION private.valid_enterprise_terms(jsonb, jsonb) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.enterprise_access
  ADD COLUMN over_limit jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT enterprise_access_terms_valid CHECK (private.valid_enterprise_terms(over_limit, rates));

-- 'stop' or 'bill' for one item of an enterprise's quote.
CREATE OR REPLACE FUNCTION private.enterprise_over(_org uuid, _item text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT coalesce((SELECT ea.over_limit ->> _item FROM public.enterprise_access ea WHERE ea.organization_id = _org), 'bill') $$;
REVOKE ALL ON FUNCTION private.enterprise_over(uuid, text) FROM PUBLIC, anon, authenticated;

-- The enterprise's own rate for a kind, else the stored rate.
CREATE OR REPLACE FUNCTION private.enterprise_rate_for(_org uuid, _kind text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT (ea.rates ->> _kind)::integer FROM public.enterprise_access ea WHERE ea.organization_id = _org),
                  private.enterprise_rate(_kind))
$$;
REVOKE ALL ON FUNCTION private.enterprise_rate_for(uuid, text) FROM PUBLIC, anon, authenticated;

-- One key per supplier, so the same supplier asked for two periods counts once.
CREATE OR REPLACE FUNCTION private.supplier_key(p_email text, p_gstin text, p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$ SELECT coalesce(lower(p_email), upper(p_gstin), lower(btrim(p_name))) $$;
REVOKE ALL ON FUNCTION private.supplier_key(text, text, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- suppliers
CREATE OR REPLACE FUNCTION private.check_supplier_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_limit integer; v_rule text; v_year timestamptz; v_key text; v_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.enterprise_org_id::text, 0));
  SELECT ea.supplier_limit, coalesce(ea.over_limit ->> 'suppliers', 'bill') INTO v_limit, v_rule
  FROM public.enterprise_access ea
  WHERE ea.organization_id = NEW.enterprise_org_id AND ea.status = 'active';
  IF v_limit IS NULL THEN RAISE EXCEPTION 'enterprise access is not active' USING ERRCODE = '42501'; END IF;
  v_year := private.enterprise_year_start(NEW.enterprise_org_id);
  v_key := private.supplier_key(NEW.supplier_email, NEW.supplier_gstin, NEW.supplier_name);
  IF EXISTS (SELECT 1 FROM public.supplier_requests r
             WHERE r.enterprise_org_id = NEW.enterprise_org_id AND r.status <> 'revoked' AND r.created_at >= v_year
               AND private.supplier_key(r.supplier_email, r.supplier_gstin, r.supplier_name) = v_key) THEN
    RETURN NEW;
  END IF;
  SELECT count(DISTINCT private.supplier_key(r.supplier_email, r.supplier_gstin, r.supplier_name)) INTO v_count
  FROM public.supplier_requests r
  WHERE r.enterprise_org_id = NEW.enterprise_org_id AND r.status <> 'revoked' AND r.created_at >= v_year;
  IF v_count >= v_limit THEN
    IF v_rule = 'stop' THEN RAISE EXCEPTION 'supplier limit of % reached', v_limit USING ERRCODE = '23514'; END IF;
    INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise, ref)
    VALUES (NEW.enterprise_org_id, 'supplier', 1, true, private.enterprise_rate_for(NEW.enterprise_org_id, 'supplier'), 'request:' || NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------- reminders
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
      IF private.enterprise_over(NEW.enterprise_org_id, 'reminders') = 'stop' THEN
        RAISE EXCEPTION 'reminder limit reached' USING ERRCODE = 'P0001';
      END IF;
      INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise, ref)
      VALUES (NEW.enterprise_org_id, 'reminder', 1, true, private.enterprise_rate_for(NEW.enterprise_org_id, 'reminder'), 'request:' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------- downloads
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
  IF v_billable AND private.enterprise_over(v_org, 'reports') = 'stop' THEN
    RAISE EXCEPTION 'download limit reached' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise, ref)
  VALUES (v_org, 'report', 1, v_billable, CASE WHEN v_billable THEN private.enterprise_rate_for(v_org, 'report') END, left(coalesce(p_what, 'report'), 60));
  RETURN jsonb_build_object('ok', true, 'used', v_used + 1, 'included', v_included);
END;
$$;

-- ---------------------------------------------------------------- supplier reads
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
  WHERE r.supplier_user_id = p_user AND r.status IN ('opened', 'shared') AND r.expires_at > now()
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

  IF v_need > 0 AND private.enterprise_over(v_org, 'reads') = 'bill' THEN
    v_extra := ceil(v_need / 100.0)::integer * 100;
    INSERT INTO public.invoice_credit_packs (user_id, razorpay_order_id, packs, credits, base_paise, amount_paise, validity, status, paid_at, expires_at, funded_by_org)
    VALUES (p_user, 'enterprise-extra:' || gen_random_uuid(), 1, v_extra, 1, 1, 'monthly', 'active', now(), now() + interval '365 days', v_org);
    INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise, ref)
    VALUES (v_org, 'reads', v_extra, true, private.enterprise_rate_for(v_org, 'reads_100'), 'supplier:' || p_user);
  END IF;

  IF v_left + v_extra = 0 THEN RETURN jsonb_build_object('covered', false); END IF;
  RETURN jsonb_build_object('covered', true, 'reads', v_left + v_extra, 'billable', v_extra, 'company', v_company);
END;
$$;

-- ---------------------------------------------------------------- questions
-- p_record false: may this question be asked? true: count one answered question.
CREATE OR REPLACE FUNCTION public.service_enterprise_question(p_org uuid, p_record boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_included integer; v_rule text; v_used integer; v_bill boolean;
  v_since timestamptz := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
BEGIN
  SELECT ea.questions_per_month, coalesce(ea.over_limit ->> 'questions', 'bill') INTO v_included, v_rule
  FROM public.enterprise_access ea WHERE ea.organization_id = p_org AND ea.status = 'active';
  IF v_included IS NULL THEN RETURN jsonb_build_object('allowed', false); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('enterprise_question:' || p_org::text, 0));
  SELECT count(*)::integer INTO v_used FROM public.enterprise_usage
  WHERE enterprise_org_id = p_org AND kind = 'question' AND created_at >= v_since;
  IF NOT p_record THEN
    RETURN jsonb_build_object('allowed', NOT (v_rule = 'stop' AND v_used >= v_included), 'used', v_used, 'included', v_included);
  END IF;
  v_bill := v_used >= v_included AND v_rule = 'bill';
  INSERT INTO public.enterprise_usage (enterprise_org_id, kind, quantity, billable, unit_paise)
  VALUES (p_org, 'question', 1, v_bill, CASE WHEN v_bill THEN private.enterprise_rate_for(p_org, 'questions_1000') END);
  RETURN jsonb_build_object('allowed', true, 'used', v_used + 1, 'included', v_included);
END;
$$;
REVOKE ALL ON FUNCTION public.service_enterprise_question(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_enterprise_question(uuid, boolean) TO service_role;

-- ---------------------------------------------------------------- seats
CREATE OR REPLACE FUNCTION public.owner_seat_limit(p_owner_id uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.enterprise_access ea
      JOIN public.organizations o ON o.id = ea.organization_id
      WHERE o.owner_id = p_owner_id AND ea.status = 'active'
    ) THEN GREATEST(public.owner_plan_seat_limit(p_owner_id), (
      SELECT CASE WHEN bool_and(coalesce(ea.over_limit ->> 'seats', 'bill') = 'stop') THEN max(ea.seats_included)
                  ELSE private.enterprise_seat_ceiling() END
      FROM public.enterprise_access ea
      JOIN public.organizations o ON o.id = ea.organization_id
      WHERE o.owner_id = p_owner_id AND ea.status = 'active'))
    ELSE public.owner_plan_seat_limit(p_owner_id)
  END $$;
REVOKE ALL ON FUNCTION public.owner_seat_limit(uuid) FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enterprise_access_sync_seats ON public.enterprise_access;
CREATE TRIGGER enterprise_access_sync_seats AFTER INSERT OR UPDATE OF organization_id, status, over_limit, seats_included ON public.enterprise_access
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
         (greatest(count(m.*)::integer - max(ea.seats_included), 0) * private.enterprise_rate_for(p_org, 'seat'))::bigint
  FROM public.enterprise_access ea
  LEFT JOIN public.organization_members m ON m.organization_id = ea.organization_id
  WHERE ea.organization_id = p_org
$$;

-- ---------------------------------------------------------------- usage for Profile
DROP FUNCTION public.my_enterprise_usage();
CREATE FUNCTION public.my_enterprise_usage()
RETURNS TABLE (kind text, used integer, included integer, over_limit text, extra_paise bigint, period text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE ea public.enterprise_access%ROWTYPE; v_org uuid; v_year timestamptz; v_role text; v_money boolean;
  v_month timestamptz := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
  v_suppliers integer; v_members integer;
BEGIN
  SELECT a.organization_id, m.role INTO v_org, v_role FROM public.enterprise_access a
  JOIN public.organization_members m ON m.organization_id = a.organization_id
  WHERE a.status = 'active' AND m.user_id = auth.uid() LIMIT 1;
  IF v_org IS NULL THEN RETURN; END IF;
  SELECT a.* INTO ea FROM public.enterprise_access a WHERE a.organization_id = v_org;
  v_org := ea.organization_id; v_year := private.enterprise_year_start(v_org);
  -- Amounts are for owners and admins; everyone in the team sees the counts.
  v_money := v_role IN ('owner', 'admin');
  SELECT count(DISTINCT private.supplier_key(r.supplier_email, r.supplier_gstin, r.supplier_name))::integer INTO v_suppliers
  FROM public.supplier_requests r WHERE r.enterprise_org_id = v_org AND r.status <> 'revoked' AND r.created_at >= v_year;
  SELECT count(*)::integer INTO v_members FROM public.organization_members m WHERE m.organization_id = v_org;
  RETURN QUERY
  WITH extra AS (
    SELECT u.kind AS k, sum(CASE WHEN u.kind = 'reads' THEN (u.quantity / 100.0) * u.unit_paise
                                 WHEN u.kind = 'question' THEN (u.quantity / 1000.0) * u.unit_paise
                                 ELSE u.quantity * u.unit_paise END)::bigint AS paise
    FROM public.enterprise_usage u
    WHERE u.enterprise_org_id = v_org AND u.billable AND u.created_at >= v_year
    GROUP BY u.kind
  )
  SELECT x.kind, x.used, x.included, coalesce(ea.over_limit ->> x.item, 'bill'),
         CASE WHEN v_money THEN coalesce(x.paise, 0) END, x.period
  FROM (
    SELECT 'suppliers' AS kind, 'suppliers' AS item, v_suppliers AS used, ea.supplier_limit AS included,
           (SELECT paise FROM extra WHERE k = 'supplier') AS paise, 'year' AS period
    UNION ALL SELECT 'seats', 'seats', v_members, ea.seats_included,
           greatest(v_members - ea.seats_included, 0)::bigint * private.enterprise_rate_for(v_org, 'seat'), 'year'
    UNION ALL SELECT 'reports', 'reports',
           (SELECT coalesce(sum(u.quantity), 0)::integer FROM public.enterprise_usage u WHERE u.enterprise_org_id = v_org AND u.kind = 'report' AND u.created_at >= v_year),
           ea.reports_included, (SELECT paise FROM extra WHERE k = 'report'), 'year'
    UNION ALL SELECT 'reminders', 'reminders',
           (SELECT coalesce(sum(r.reminders_sent), 0)::integer FROM public.supplier_requests r WHERE r.enterprise_org_id = v_org AND r.created_at >= v_year),
           ea.reminders_per_request * greatest(v_suppliers, 1), (SELECT paise FROM extra WHERE k = 'reminder'), 'year'
    UNION ALL SELECT 'supplier_reads', 'reads',
           (SELECT coalesce(sum(c.used), 0)::integer FROM public.invoice_credit_packs c WHERE c.funded_by_org = v_org AND c.created_at >= v_year),
           ea.reads_per_supplier * ea.supplier_limit, (SELECT paise FROM extra WHERE k = 'reads'), 'year'
    UNION ALL SELECT 'questions', 'questions',
           (SELECT count(*)::integer FROM public.enterprise_usage u WHERE u.enterprise_org_id = v_org AND u.kind = 'question' AND u.created_at >= v_month),
           ea.questions_per_month, (SELECT paise FROM extra WHERE k = 'question'), 'month'
  ) x;
END;
$$;
REVOKE ALL ON FUNCTION public.my_enterprise_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_enterprise_usage() TO authenticated;

-- ---------------------------------------------------------------- supplier claims
ALTER TABLE public.supplier_requests
  ADD COLUMN claimed_email text CHECK (claimed_email IS NULL OR length(claimed_email) <= 320),
  ADD COLUMN claimed_at timestamptz,
  ADD COLUMN old_token_hashes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN link_reset_at timestamptz;

CREATE OR REPLACE FUNCTION public.supplier_request_preview(p_token text)
RETURNS TABLE (company_name text, supplier_name text, period_start date, period_end date, expired boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ea.company_name, r.supplier_name, r.period_start, r.period_end, (r.expires_at < now() OR r.status IN ('revoked', 'declined'))
  FROM public.supplier_requests r
  JOIN public.enterprise_access ea ON ea.organization_id = r.enterprise_org_id AND ea.status = 'active'
  WHERE r.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
     OR encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex') = ANY (r.old_token_hashes)
  LIMIT 1
$$;

-- A link claims only its own request; without a link the request must name this account.
CREATE OR REPLACE FUNCTION public.accept_supplier_request(p_request_id uuid DEFAULT NULL, p_token text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.supplier_requests%ROWTYPE; v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sign in first' USING ERRCODE = '42501'; END IF;
  IF p_token IS NOT NULL THEN
    v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
    SELECT * INTO r FROM public.supplier_requests
    WHERE token_hash = v_hash OR v_hash = ANY (old_token_hashes)
    LIMIT 1 FOR UPDATE;
  ELSIF p_request_id IS NOT NULL THEN
    SELECT * INTO r FROM public.supplier_requests WHERE id = p_request_id FOR UPDATE;
  END IF;
  IF r.id IS NULL OR r.status IN ('revoked', 'declined') OR r.expires_at < now() THEN
    RAISE EXCEPTION 'this request is closed or has expired' USING ERRCODE = 'P0002';
  END IF;
  IF p_token IS NOT NULL THEN
    IF r.supplier_user_id IS NOT NULL AND r.supplier_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'this request is for another supplier' USING ERRCODE = '42501';
    END IF;
  ELSIF NOT private.request_matches_caller(r) THEN
    RAISE EXCEPTION 'this request is for another supplier' USING ERRCODE = '42501';
  END IF;
  UPDATE public.supplier_requests
  SET supplier_user_id = auth.uid(),
      claimed_email = CASE WHEN supplier_user_id IS NULL THEN (SELECT lower(u.email) FROM auth.users u WHERE u.id = auth.uid()) ELSE claimed_email END,
      claimed_at = coalesce(claimed_at, now()),
      status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END,
      opened_at = coalesce(opened_at, now())
  WHERE id = r.id;
  RETURN r.id;
END;
$$;

-- A reminder sends a fresh link; the links already sent keep working (last five).
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
  SET old_token_hashes = (array_append(old_token_hashes, token_hash))[greatest(1, cardinality(old_token_hashes) - 3):],
      token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
      expires_at = now() + make_interval(days => greatest(1, least(p_valid_days, 90))),
      last_reminded_at = now()
  WHERE id = r.id;
  RETURN QUERY SELECT v_token, r.supplier_email, r.supplier_name, v_company, r.period_start, r.period_end;
END;
$$;

-- Send new link: removes whoever claimed the request, stops earlier shares counting
-- and issues a fresh link (every earlier link stops working). Once a day at most.
CREATE OR REPLACE FUNCTION public.service_reset_supplier_link(p_request_id uuid, p_caller uuid, p_valid_days integer DEFAULT 30)
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
    RAISE EXCEPTION 'this role cannot reset supplier links' USING ERRCODE = '42501';
  END IF;
  IF r.status NOT IN ('sent', 'opened', 'shared') THEN RAISE EXCEPTION 'only open requests can be reset' USING ERRCODE = 'P0001'; END IF;
  IF r.link_reset_at > now() - interval '1 day' THEN RAISE EXCEPTION 'reset in the last day' USING ERRCODE = 'P0001'; END IF;
  UPDATE public.supplier_requests
  SET token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
      old_token_hashes = '{}',
      supplier_user_id = NULL, claimed_email = NULL, claimed_at = NULL,
      status = 'sent', opened_at = NULL, shared_at = NULL,
      link_reset_at = now(),
      expires_at = now() + make_interval(days => greatest(1, least(p_valid_days, 90)))
  WHERE id = r.id;
  UPDATE public.supplier_consents SET withdrawn_at = now() WHERE request_id = r.id AND withdrawn_at IS NULL;
  RETURN QUERY SELECT v_token, r.supplier_email, r.supplier_name, v_company, r.period_start, r.period_end;
END;
$$;
REVOKE ALL ON FUNCTION public.service_reset_supplier_link(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_reset_supplier_link(uuid, uuid, integer) TO service_role;
