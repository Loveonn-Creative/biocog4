-- =============================================
-- PENDING (NOT APPLIED). Enterprise supplier pilot (owner approved 25 Oct 2026).
-- Rollback: rollback/20261107100000_enterprise_pilot.rollback.sql
-- Tests:    tests/run_enterprise_pilot.sh
--
-- New tables only. No existing table, policy or row is changed, so MSME
-- accounts, bill reading, verification, reports and payments behave exactly
-- as before.
--
-- Who can do what:
-- * Enterprise access is granted by Senseible staff only, from the SQL editor:
--     SELECT private.grant_enterprise_access('head@buyer.com', 'Buyer Ltd', 100, 'staff name');
--     SELECT private.revoke_enterprise_access('head@buyer.com');
--   No browser role (anon, authenticated) can call these or write the table,
--   whatever the user's plan, Scale included.
-- * The enterprise reads only what suppliers chose to share: one snapshot of
--   totals per request. Never supplier files, documents or emission rows.
-- * Suppliers are ordinary accounts. They see requests addressed to their
--   confirmed email or GSTIN, and share by pressing Share (consent recorded).
-- * Every write goes through the functions below; browsers cannot insert,
--   update or delete any row in these tables directly.
-- =============================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

-- 1. Enterprise access, keyed by the email Senseible grants.
CREATE TABLE public.enterprise_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  company_name text NOT NULL CHECK (length(btrim(company_name)) BETWEEN 2 AND 200),
  organization_id uuid UNIQUE REFERENCES public.organizations(id) ON DELETE SET NULL,
  supplier_limit integer NOT NULL DEFAULT 100 CHECK (supplier_limit BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_by text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  notes text
);
ALTER TABLE public.enterprise_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enterprise_access FROM PUBLIC, anon, authenticated;

-- True when the caller belongs to an organisation that has active enterprise access.
CREATE OR REPLACE FUNCTION private.is_enterprise_member(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enterprise_access ea
    JOIN public.organization_members m ON m.organization_id = ea.organization_id
    WHERE ea.organization_id = _org
      AND ea.status = 'active'
      AND m.user_id = auth.uid()
  )
$$;
GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE ALL ON FUNCTION private.is_enterprise_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_enterprise_member(uuid) TO authenticated;

-- Staff only: grant or re-activate access for an email.
CREATE OR REPLACE FUNCTION private.grant_enterprise_access(
  p_email text, p_company text, p_supplier_limit integer DEFAULT 100, p_granted_by text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.enterprise_access (email, company_name, supplier_limit, granted_by)
  VALUES (lower(btrim(p_email)), btrim(p_company), p_supplier_limit, coalesce(nullif(btrim(p_granted_by), ''), current_user))
  ON CONFLICT (email) DO UPDATE
    SET company_name = EXCLUDED.company_name,
        supplier_limit = EXCLUDED.supplier_limit,
        granted_by = EXCLUDED.granted_by,
        status = 'active',
        revoked_at = NULL
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION private.grant_enterprise_access(text, text, integer, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.revoke_enterprise_access(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH u AS (
    UPDATE public.enterprise_access SET status = 'revoked', revoked_at = now()
    WHERE email = lower(btrim(p_email)) AND status = 'active'
    RETURNING 1
  ) SELECT EXISTS (SELECT 1 FROM u)
$$;
REVOKE ALL ON FUNCTION private.revoke_enterprise_access(text) FROM PUBLIC, anon, authenticated;

-- The granted person, signed in with that confirmed email, claims access once:
-- this creates the enterprise organisation (or reuses it) with them as owner.
CREATE OR REPLACE FUNCTION public.claim_enterprise_access()
RETURNS TABLE (organization_id uuid, company_name text, supplier_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_row public.enterprise_access%ROWTYPE;
  v_org uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'sign in first' USING ERRCODE = '42501'; END IF;
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_uid AND u.email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN RAISE EXCEPTION 'confirm your email first' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_row FROM public.enterprise_access ea WHERE ea.email = v_email AND ea.status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no enterprise access for this email' USING ERRCODE = '42501'; END IF;

  v_org := v_row.organization_id;
  IF v_org IS NULL THEN
    INSERT INTO public.organizations (name, owner_id) VALUES (v_row.company_name, v_uid) RETURNING id INTO v_org;
    UPDATE public.enterprise_access SET organization_id = v_org WHERE id = v_row.id;
  END IF;
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
  VALUES (v_org, v_uid, 'owner', now())
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN QUERY SELECT v_org, v_row.company_name, v_row.supplier_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_enterprise_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_enterprise_access() TO authenticated;

-- What the app reads to decide whether to open the enterprise dashboard.
CREATE OR REPLACE FUNCTION public.my_enterprise()
RETURNS TABLE (organization_id uuid, company_name text, supplier_limit integer, claimable boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ea.organization_id, ea.company_name, ea.supplier_limit, false
  FROM public.enterprise_access ea
  JOIN public.organization_members m ON m.organization_id = ea.organization_id
  WHERE ea.status = 'active' AND m.user_id = auth.uid()
  UNION ALL
  SELECT NULL::uuid, ea.company_name, ea.supplier_limit, true
  FROM public.enterprise_access ea
  JOIN auth.users u ON lower(u.email) = ea.email
  WHERE ea.status = 'active' AND ea.organization_id IS NULL
    AND u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.my_enterprise() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_enterprise() TO authenticated;

-- 2. Requests from an enterprise to a supplier, one per supplier and period.
CREATE TABLE public.supplier_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_name text NOT NULL CHECK (length(btrim(supplier_name)) BETWEEN 2 AND 200),
  supplier_email text CHECK (supplier_email IS NULL OR (supplier_email = lower(btrim(supplier_email)) AND supplier_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  supplier_gstin text CHECK (supplier_gstin IS NULL OR supplier_gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  buys text CHECK (buys IS NULL OR length(buys) <= 200),
  -- Share of the buyer's purchases from this supplier (BRSR value chain: 2% per
  -- partner, 75% cumulative cap) and the Scope 3 category it falls in.
  purchase_share_pct numeric(5,2) CHECK (purchase_share_pct IS NULL OR purchase_share_pct BETWEEN 0 AND 100),
  scope3_category smallint NOT NULL DEFAULT 1 CHECK (scope3_category IN (1, 2, 4)),
  period_start date NOT NULL,
  period_end date NOT NULL,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'shared', 'declined', 'revoked')),
  supplier_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  shared_at timestamptz,
  last_reminded_at timestamptz,
  CHECK (period_end >= period_start),
  CHECK (supplier_email IS NOT NULL OR supplier_gstin IS NOT NULL)
);
CREATE INDEX supplier_requests_org_idx ON public.supplier_requests (enterprise_org_id, status);
CREATE INDEX supplier_requests_supplier_idx ON public.supplier_requests (supplier_user_id);
CREATE INDEX supplier_requests_email_idx ON public.supplier_requests (supplier_email) WHERE supplier_user_id IS NULL;
CREATE INDEX supplier_requests_gstin_idx ON public.supplier_requests (supplier_gstin) WHERE supplier_user_id IS NULL;
CREATE UNIQUE INDEX supplier_requests_one_open ON public.supplier_requests
  (enterprise_org_id, coalesce(supplier_gstin, supplier_email), period_start, period_end) WHERE status <> 'revoked';
ALTER TABLE public.supplier_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.supplier_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.supplier_requests TO authenticated;
CREATE POLICY "Enterprise members read their requests" ON public.supplier_requests
  FOR SELECT TO authenticated USING (private.is_enterprise_member(enterprise_org_id));
CREATE POLICY "Suppliers read requests they accepted" ON public.supplier_requests
  FOR SELECT TO authenticated USING (supplier_user_id = auth.uid());

-- Open requests per enterprise stay within the supplier limit Senseible set.
CREATE OR REPLACE FUNCTION private.check_supplier_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_limit integer; v_open integer;
BEGIN
  -- Serialise inserts per enterprise so concurrent requests cannot pass the limit together.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.enterprise_org_id::text, 0));
  SELECT ea.supplier_limit INTO v_limit FROM public.enterprise_access ea
  WHERE ea.organization_id = NEW.enterprise_org_id AND ea.status = 'active';
  IF v_limit IS NULL THEN RAISE EXCEPTION 'enterprise access is not active' USING ERRCODE = '42501'; END IF;
  SELECT count(*) INTO v_open FROM public.supplier_requests
  WHERE enterprise_org_id = NEW.enterprise_org_id AND status <> 'revoked';
  IF v_open >= v_limit THEN RAISE EXCEPTION 'supplier limit of % reached', v_limit USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER supplier_requests_limit BEFORE INSERT ON public.supplier_requests
  FOR EACH ROW EXECUTE FUNCTION private.check_supplier_limit();

-- Server side (service role, from the supplier-requests function): create a
-- request and return its one-time link token. The token is never stored.
CREATE OR REPLACE FUNCTION private.create_supplier_request(
  p_org uuid, p_created_by uuid, p_name text, p_email text, p_gstin text, p_buys text,
  p_period_start date, p_period_end date, p_valid_days integer DEFAULT 30,
  p_purchase_share_pct numeric DEFAULT NULL, p_scope3_category smallint DEFAULT 1
) RETURNS TABLE (request_id uuid, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_token text := encode(gen_random_bytes(32), 'hex'); v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m JOIN public.enterprise_access ea ON ea.organization_id = m.organization_id
    WHERE m.organization_id = p_org AND m.user_id = p_created_by AND ea.status = 'active'
  ) THEN RAISE EXCEPTION 'not an enterprise member' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.supplier_requests (enterprise_org_id, supplier_name, supplier_email, supplier_gstin, buys,
    purchase_share_pct, scope3_category, period_start, period_end, token_hash, expires_at, created_by)
  VALUES (p_org, btrim(p_name), nullif(lower(btrim(coalesce(p_email, ''))), ''), nullif(upper(btrim(coalesce(p_gstin, ''))), ''),
    nullif(btrim(coalesce(p_buys, '')), ''), p_purchase_share_pct, coalesce(p_scope3_category, 1), p_period_start, p_period_end,
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + make_interval(days => greatest(1, least(p_valid_days, 90))), p_created_by)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, v_token;
END;
$$;
REVOKE ALL ON FUNCTION private.create_supplier_request(uuid, uuid, text, text, text, text, date, date, integer, numeric, smallint) FROM PUBLIC, anon, authenticated;

-- Before sign-in: the link shows only who is asking and for which period.
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
REVOKE ALL ON FUNCTION public.supplier_request_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.supplier_request_preview(text) TO anon, authenticated;

-- A request belongs to the caller when it names their confirmed email or the
-- GSTIN on their profile, or they already accepted it.
CREATE OR REPLACE FUNCTION private.request_matches_caller(r public.supplier_requests)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- coalesce: a NULL here must mean "no", never "unknown", or NOT(...) would let anyone through.
  SELECT coalesce(r.supplier_user_id = auth.uid(), false)
    OR (r.supplier_user_id IS NULL AND auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL AND lower(u.email) = r.supplier_email)
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.gstin IS NOT NULL AND upper(p.gstin) = r.supplier_gstin)
    ))
$$;
REVOKE ALL ON FUNCTION private.request_matches_caller(public.supplier_requests) FROM PUBLIC, anon, authenticated;

-- Requests waiting for the signed-in supplier, including ones sent to existing
-- MSME accounts before they ever opened a link.
CREATE OR REPLACE FUNCTION public.my_supplier_requests()
RETURNS TABLE (request_id uuid, company_name text, buys text, period_start date, period_end date, status text, expires_at timestamptz, shared_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, ea.company_name, r.buys, r.period_start, r.period_end, r.status, r.expires_at, r.shared_at
  FROM public.supplier_requests r
  JOIN public.enterprise_access ea ON ea.organization_id = r.enterprise_org_id AND ea.status = 'active'
  WHERE r.status IN ('sent', 'opened', 'shared') AND private.request_matches_caller(r)
  ORDER BY r.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.my_supplier_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_supplier_requests() TO authenticated;

-- Opening a link (by token) or a request in the app (by id) links it to the
-- signed-in supplier. Nothing is shared yet.
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
  -- A link alone is not enough when the request names a different email or GSTIN.
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
REVOKE ALL ON FUNCTION public.accept_supplier_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_supplier_request(uuid, text) TO authenticated;

-- 3. Consent: append-only record of what the supplier agreed to share.
CREATE TABLE public.supplier_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.supplier_requests(id) ON DELETE CASCADE,
  supplier_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  consent_text_hash text NOT NULL CHECK (consent_text_hash ~ '^[0-9a-f]{64}$'),
  agreed_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz
);
CREATE INDEX supplier_consents_request_idx ON public.supplier_consents (request_id);
ALTER TABLE public.supplier_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.supplier_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.supplier_consents TO authenticated;
CREATE POLICY "Suppliers read their consents" ON public.supplier_consents
  FOR SELECT TO authenticated USING (supplier_user_id = auth.uid());
CREATE POLICY "Enterprise members read consents on their requests" ON public.supplier_consents
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.supplier_requests r WHERE r.id = request_id AND private.is_enterprise_member(r.enterprise_org_id)));

-- 4. Snapshots: the only supplier data an enterprise can read. Totals and
-- evidence counts, computed on the server from the supplier's own records.
CREATE TABLE public.supplier_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.supplier_requests(id) ON DELETE CASCADE,
  enterprise_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  supplier_gstin text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  scope1_kg numeric(18,4) NOT NULL DEFAULT 0,
  scope2_kg numeric(18,4) NOT NULL DEFAULT 0,
  scope3_kg numeric(18,4) NOT NULL DEFAULT 0,
  total_kg numeric(18,4) NOT NULL DEFAULT 0,
  verified_kg numeric(18,4) NOT NULL DEFAULT 0,
  declared_kg numeric(18,4) CHECK (declared_kg IS NULL OR declared_kg >= 0),
  declared_note text CHECK (declared_note IS NULL OR length(declared_note) <= 500),
  by_category jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Energy and activity quantities by unit (kWh, litres, tkm...), as on the bills.
  activity jsonb NOT NULL DEFAULT '{}'::jsonb,
  documents_total integer NOT NULL DEFAULT 0,
  documents_verified integer NOT NULL DEFAULT 0,
  evidence_hashes text[] NOT NULL DEFAULT '{}',
  method_version text NOT NULL DEFAULT 'senseible-v1',
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX supplier_snapshots_org_idx ON public.supplier_snapshots (enterprise_org_id, period_start, period_end);
CREATE INDEX supplier_snapshots_request_idx ON public.supplier_snapshots (request_id, created_at DESC);
ALTER TABLE public.supplier_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.supplier_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.supplier_snapshots TO authenticated;
CREATE POLICY "Enterprise members read snapshots shared with them" ON public.supplier_snapshots
  FOR SELECT TO authenticated USING (private.is_enterprise_member(enterprise_org_id));
CREATE POLICY "Suppliers read what they shared" ON public.supplier_snapshots
  FOR SELECT TO authenticated USING (supplier_user_id = auth.uid());

-- The supplier presses Share. Totals come from their own records in the
-- request period (bills read in their personal workspace), never from the browser.
CREATE OR REPLACE FUNCTION public.share_with_enterprise(
  p_request_id uuid, p_consent_version text, p_consent_text_hash text,
  p_declared_kg numeric DEFAULT NULL, p_declared_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.supplier_requests%ROWTYPE;
  v public.supplier_snapshots%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'sign in first' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM public.supplier_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR r.supplier_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'open the request before sharing' USING ERRCODE = '42501';
  END IF;
  IF r.status IN ('revoked', 'declined') OR r.expires_at < now() THEN
    RAISE EXCEPTION 'this request is closed or has expired' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.enterprise_access ea WHERE ea.organization_id = r.enterprise_org_id AND ea.status = 'active') THEN
    RAISE EXCEPTION 'this buyer no longer has access' USING ERRCODE = '42501';
  END IF;
  IF p_consent_text_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'consent text hash missing' USING ERRCODE = '22023'; END IF;

  WITH rows AS (
    SELECT e.scope, e.category, e.co2_kg, e.activity_data, e.activity_unit, coalesce(e.verified, false) AS verified, e.document_id, d.document_hash
    FROM public.emissions e
    LEFT JOIN public.documents d ON d.id = e.document_id
    WHERE e.user_id = v_uid AND e.organization_id IS NULL
      AND coalesce(d.invoice_date, e.created_at::date) BETWEEN r.period_start AND r.period_end
  ), cats AS (
    SELECT coalesce(jsonb_object_agg(category, round(kg, 4)), '{}'::jsonb) AS j
    FROM (SELECT category, sum(co2_kg) AS kg FROM rows GROUP BY category) c
  ), acts AS (
    SELECT coalesce(jsonb_object_agg(unit, round(qty, 4)), '{}'::jsonb) AS j
    FROM (SELECT lower(btrim(activity_unit)) AS unit, sum(activity_data) AS qty FROM rows
          WHERE activity_data IS NOT NULL AND coalesce(btrim(activity_unit), '') <> '' GROUP BY 1) a
  )
  SELECT
    coalesce(sum(co2_kg) FILTER (WHERE scope = 1), 0),
    coalesce(sum(co2_kg) FILTER (WHERE scope = 2), 0),
    coalesce(sum(co2_kg) FILTER (WHERE scope = 3), 0),
    coalesce(sum(co2_kg), 0),
    coalesce(sum(co2_kg) FILTER (WHERE verified), 0),
    (SELECT j FROM cats),
    (SELECT j FROM acts),
    count(DISTINCT document_id)::int,
    (count(DISTINCT document_id) FILTER (WHERE verified))::int,
    coalesce(array_agg(DISTINCT document_hash ORDER BY document_hash) FILTER (WHERE document_hash IS NOT NULL), '{}')
  INTO v.scope1_kg, v.scope2_kg, v.scope3_kg, v.total_kg, v.verified_kg, v.by_category, v.activity,
       v.documents_total, v.documents_verified, v.evidence_hashes
  FROM rows;

  IF v.total_kg = 0 AND p_declared_kg IS NULL THEN
    RAISE EXCEPTION 'no records in this period yet: upload bills or enter your own figure' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.supplier_consents (request_id, supplier_user_id, consent_version, consent_text_hash)
  VALUES (r.id, v_uid, coalesce(nullif(btrim(p_consent_version), ''), 'v1'), p_consent_text_hash);

  INSERT INTO public.supplier_snapshots (request_id, enterprise_org_id, supplier_user_id, supplier_name, supplier_gstin,
    period_start, period_end, scope1_kg, scope2_kg, scope3_kg, total_kg, verified_kg, declared_kg, declared_note,
    by_category, activity, documents_total, documents_verified, evidence_hashes, snapshot_hash)
  VALUES (r.id, r.enterprise_org_id, v_uid, r.supplier_name, r.supplier_gstin, r.period_start, r.period_end,
    v.scope1_kg, v.scope2_kg, v.scope3_kg, v.total_kg, v.verified_kg, p_declared_kg, nullif(btrim(coalesce(p_declared_note, '')), ''),
    v.by_category, v.activity, v.documents_total, v.documents_verified, v.evidence_hashes,
    encode(sha256(convert_to(concat_ws('|', r.id, r.period_start, r.period_end, v.scope1_kg, v.scope2_kg, v.scope3_kg,
      v.verified_kg, coalesce(p_declared_kg::text, ''), v.by_category::text, array_to_string(v.evidence_hashes, ',')), 'UTF8')), 'hex'))
  RETURNING id INTO v_id;

  UPDATE public.supplier_requests SET status = 'shared', shared_at = now() WHERE id = r.id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.share_with_enterprise(uuid, text, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_with_enterprise(uuid, text, text, numeric, text) TO authenticated;

-- The supplier stops sharing: the buyer keeps what was already shared (audit)
-- and receives nothing new for this request.
CREATE OR REPLACE FUNCTION public.withdraw_supplier_consent(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.supplier_requests WHERE id = p_request_id AND supplier_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not your request' USING ERRCODE = '42501';
  END IF;
  UPDATE public.supplier_consents SET withdrawn_at = now()
  WHERE request_id = p_request_id AND supplier_user_id = auth.uid() AND withdrawn_at IS NULL;
  UPDATE public.supplier_requests SET status = 'declined' WHERE id = p_request_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.withdraw_supplier_consent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_supplier_consent(uuid) TO authenticated;

COMMIT;
