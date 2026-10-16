-- Applied through Lovable (drizzle). Source: supabase/pending-migrations/20261027100000_ledger_hash_chain.sql
-- Rollback: supabase/pending-migrations/rollback/20261027100000_ledger_hash_chain.rollback.sql
-- =============================================
-- PENDING (NOT APPLIED). Hash-chained history for compliance_ledger.
-- Deploy only after the owner's risk and use-case review:
-- docs/ledger-hash-chain.md
-- Rollback: rollback/20261027100000_ledger_hash_chain.rollback.sql
--
-- compliance_ledger rows are promoted in place (unverified -> verified) and
-- removed with their invoice by delete-document, so the rows themselves cannot
-- be chained. Instead every INSERT, UPDATE and DELETE on compliance_ledger
-- appends one event to public.ledger_chain_events, a per-account chain where
-- each event hash covers the previous one. Changing, removing or reordering a
-- past event breaks every hash after it; changing a ledger row without an
-- event (trigger bypassed) no longer matches its latest event's digest.
-- public.verify_ledger_chain() checks both.
--
-- Events hold only ids and SHA-256 digests: no vendor, GSTIN, amounts or
-- invoice numbers in clear. Server only: RLS on, no policies, no grants to
-- anon or authenticated. Existing rows get one 'baseline' event each; the
-- chain proves history from the moment it is applied, not before.
-- No existing table, policy or function is changed.
-- =============================================

CREATE TABLE public.ledger_chain_events (
  seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- organization_id for workspace rows, otherwise user_id.
  chain_key uuid NOT NULL,
  chain_seq bigint NOT NULL CHECK (chain_seq > 0),
  event_type text NOT NULL CHECK (event_type IN ('baseline', 'insert', 'update', 'delete')),
  ledger_id uuid NOT NULL,
  emission_id uuid,
  row_digest text NOT NULL CHECK (row_digest ~ '^[0-9a-f]{64}$'),
  prev_hash text NOT NULL CHECK (prev_hash ~ '^[0-9a-f]{64}$'),
  event_hash text NOT NULL UNIQUE CHECK (event_hash ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL,
  UNIQUE (chain_key, chain_seq)
);
CREATE INDEX ledger_chain_events_ledger_idx ON public.ledger_chain_events (ledger_id, seq DESC);

ALTER TABLE public.ledger_chain_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ledger_chain_events FROM PUBLIC, anon, authenticated;

-- Fields that make a ledger row's evidence. jsonb array text escapes every
-- value, so no two different rows share an input. Display-only fields
-- (vendor name, confidence, fiscal labels) are left out. verified_at enters as
-- epoch microseconds, because to_jsonb renders it in the session time zone.
CREATE FUNCTION public.ledger_row_digest(r jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT encode(sha256(convert_to(jsonb_build_array(
    r -> 'id', r -> 'user_id', r -> 'organization_id', r -> 'document_id', r -> 'emission_id',
    r -> 'verification_id', r -> 'document_hash', r -> 'invoice_number', r -> 'invoice_date',
    r -> 'gstin', r -> 'amount', r -> 'currency', r -> 'scope', r -> 'emission_category',
    r -> 'activity_data', r -> 'activity_unit', r -> 'emission_factor', r -> 'factor_source',
    r -> 'co2_kg', r -> 'methodology_version', r -> 'verification_status',
    (extract(epoch FROM (r ->> 'verified_at')::timestamptz) * 1000000)::bigint
  )::text, 'UTF8')), 'hex')
$$;

-- recorded_at enters the hash as epoch microseconds, so the session time zone
-- cannot change the result.
CREATE FUNCTION public.ledger_event_hash(
  p_chain_key uuid, p_chain_seq bigint, p_event_type text, p_ledger_id uuid,
  p_row_digest text, p_prev_hash text, p_recorded_at timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT encode(sha256(convert_to(jsonb_build_array(
    p_chain_key, p_chain_seq, p_event_type, p_ledger_id, p_row_digest, p_prev_hash,
    (extract(epoch FROM p_recorded_at) * 1000000)::bigint
  )::text, 'UTF8')), 'hex')
$$;

CREATE FUNCTION public.ledger_chain_append(
  p_chain_key uuid, p_event_type text, p_ledger_id uuid, p_emission_id uuid, p_row_digest text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_last record;
  v_seq bigint := 1;
  v_prev text := repeat('0', 64);
  v_at timestamptz := clock_timestamp();
BEGIN
  -- One writer per chain at a time, so two requests cannot both take the same tail.
  PERFORM pg_advisory_xact_lock(hashtextextended('ledger_chain:' || p_chain_key::text, 0));
  SELECT chain_seq, event_hash INTO v_last
  FROM public.ledger_chain_events WHERE chain_key = p_chain_key
  ORDER BY chain_seq DESC LIMIT 1;
  IF FOUND THEN
    v_seq := v_last.chain_seq + 1;
    v_prev := v_last.event_hash;
  END IF;
  INSERT INTO public.ledger_chain_events
    (chain_key, chain_seq, event_type, ledger_id, emission_id, row_digest, prev_hash, event_hash, recorded_at)
  VALUES (p_chain_key, v_seq, p_event_type, p_ledger_id, p_emission_id, p_row_digest, v_prev,
    public.ledger_event_hash(p_chain_key, v_seq, p_event_type, p_ledger_id, p_row_digest, v_prev, v_at), v_at);
END;
$$;

CREATE FUNCTION public.ledger_chain_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r jsonb := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
  v_digest text := public.ledger_row_digest(r);
BEGIN
  -- An update that leaves every evidence field as it was adds nothing.
  IF TG_OP = 'UPDATE' AND v_digest = public.ledger_row_digest(to_jsonb(OLD)) THEN
    RETURN NULL;
  END IF;
  PERFORM public.ledger_chain_append(
    COALESCE((r ->> 'organization_id')::uuid, (r ->> 'user_id')::uuid),
    lower(TG_OP), (r ->> 'id')::uuid, (r ->> 'emission_id')::uuid, v_digest);
  RETURN NULL;
END;
$$;

CREATE TRIGGER compliance_ledger_chain
AFTER INSERT OR UPDATE OR DELETE ON public.compliance_ledger
FOR EACH ROW EXECUTE FUNCTION public.ledger_chain_record();

-- Append only: nobody, service role included, may change or remove an event.
CREATE FUNCTION public.ledger_chain_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'ledger_chain_events is append-only (% refused)', TG_OP USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER ledger_chain_events_no_change
BEFORE UPDATE OR DELETE ON public.ledger_chain_events
FOR EACH ROW EXECUTE FUNCTION public.ledger_chain_events_append_only();
CREATE TRIGGER ledger_chain_events_no_truncate
BEFORE TRUNCATE ON public.ledger_chain_events
FOR EACH STATEMENT EXECUTE FUNCTION public.ledger_chain_events_append_only();

-- Checks one chain: every link and hash, then that each live ledger row
-- matches its latest event and no removed row is still present.
CREATE FUNCTION public.verify_ledger_chain(p_chain_key uuid)
RETURNS TABLE (ok boolean, events bigint, problem text, at_chain_seq bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  e record;
  v_prev text := repeat('0', 64);
  v_n bigint := 0;
  v_bad record;
BEGIN
  FOR e IN SELECT * FROM public.ledger_chain_events WHERE chain_key = p_chain_key ORDER BY chain_seq LOOP
    v_n := v_n + 1;
    IF e.chain_seq <> v_n THEN
      RETURN QUERY SELECT false, v_n, 'missing event', v_n; RETURN;
    END IF;
    IF e.prev_hash <> v_prev THEN
      RETURN QUERY SELECT false, v_n, 'broken link', e.chain_seq; RETURN;
    END IF;
    IF e.event_hash <> public.ledger_event_hash(e.chain_key, e.chain_seq, e.event_type, e.ledger_id, e.row_digest, e.prev_hash, e.recorded_at) THEN
      RETURN QUERY SELECT false, v_n, 'event altered', e.chain_seq; RETURN;
    END IF;
    v_prev := e.event_hash;
  END LOOP;

  SELECT l.id, latest.chain_seq INTO v_bad
  FROM public.compliance_ledger l
  LEFT JOIN LATERAL (
    SELECT x.chain_seq, x.event_type, x.row_digest FROM public.ledger_chain_events x
    WHERE x.chain_key = p_chain_key AND x.ledger_id = l.id ORDER BY x.chain_seq DESC LIMIT 1
  ) latest ON true
  WHERE COALESCE((to_jsonb(l) ->> 'organization_id')::uuid, l.user_id) = p_chain_key
    AND (latest.chain_seq IS NULL OR latest.event_type = 'delete' OR latest.row_digest <> public.ledger_row_digest(to_jsonb(l)))
  LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT false, v_n, 'ledger row changed outside the chain', v_bad.chain_seq; RETURN;
  END IF;

  SELECT latest.chain_seq INTO v_bad
  FROM (
    SELECT DISTINCT ON (x.ledger_id) x.ledger_id, x.chain_seq, x.event_type
    FROM public.ledger_chain_events x WHERE x.chain_key = p_chain_key
    ORDER BY x.ledger_id, x.chain_seq DESC
  ) latest
  WHERE latest.event_type <> 'delete'
    AND NOT EXISTS (SELECT 1 FROM public.compliance_ledger l WHERE l.id = latest.ledger_id
      AND COALESCE((to_jsonb(l) ->> 'organization_id')::uuid, l.user_id) = p_chain_key)
  LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT false, v_n, 'ledger row removed outside the chain', v_bad.chain_seq; RETURN;
  END IF;

  RETURN QUERY SELECT true, v_n, NULL::text, NULL::bigint;
END;
$$;

REVOKE ALL ON FUNCTION public.ledger_row_digest(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_event_hash(uuid, bigint, text, uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_chain_append(uuid, text, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_chain_record() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_chain_events_append_only() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_ledger_chain(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ledger_chain(uuid) TO service_role;

-- Baseline: one event per existing row, oldest first within each account.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT COALESCE((to_jsonb(l) ->> 'organization_id')::uuid, l.user_id) AS chain_key,
           l.id, l.emission_id, public.ledger_row_digest(to_jsonb(l)) AS digest
    FROM public.compliance_ledger l
    ORDER BY 1, l.created_at NULLS FIRST, l.id
  LOOP
    PERFORM public.ledger_chain_append(r.chain_key, 'baseline', r.id, r.emission_id, r.digest);
  END LOOP;
END $$;

