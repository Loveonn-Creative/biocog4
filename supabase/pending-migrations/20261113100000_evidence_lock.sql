-- =============================================
-- PENDING (NOT APPLIED). Evidence lock on documents and an append-only change
-- history for documents and emissions.
-- Rollback: rollback/20261113100000_evidence_lock.rollback.sql
--
-- 1. lock_documents_evidence (BEFORE UPDATE on documents): a browser session
--    (anon or authenticated JWT) may no longer change the stored read of an
--    invoice: cached_result, document_hash, invoice_date, invoice_number,
--    vendor, amount, currency, confidence, file_url, document_type. No browser
--    code updates documents today. Service role (edge functions) and direct
--    database sessions pass exactly as before. Inserts and deletes untouched.
-- 2. record_events: one row per UPDATE or DELETE on documents and emissions,
--    listing only the fields that changed. Business fields keep old and new
--    values; for cached_result the previous JSON is kept in old_values, so a
--    re-read never erases the earlier read. Other columns are logged by name
--    only. Server only: RLS on, no policies, no browser grants. Rows cannot be
--    updated, deleted or truncated (the rollback drops the table instead).
--    Nothing from financial_documents is logged.
--
-- Add-only: no existing row, policy or function body is changed. Safe to run
-- again. Works with or without 20261011120000_protect_privileged_columns: if
-- is_trusted_db_writer() is missing it is created with the identical
-- definition (marked by a comment so the rollback removes only its own copy).
-- =============================================
BEGIN;

-- Trusted writer: no JWT (migrations, SQL editor) or the service role.
-- Identical to 20261011120000_protect_privileged_columns.
DO $$
BEGIN
  IF to_regprocedure('public.is_trusted_db_writer()') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION public.is_trusted_db_writer()
      RETURNS boolean
      LANGUAGE plpgsql
      STABLE
      SET search_path = public
      AS $body$
      DECLARE
        v_claims text := NULLIF(current_setting('request.jwt.claims', true), '');
        v_role text;
      BEGIN
        IF v_claims IS NOT NULL THEN
          v_role := v_claims::json ->> 'role';
        ELSE
          v_role := NULLIF(current_setting('request.jwt.claim.role', true), '');
        END IF;
        RETURN v_role IS NULL OR v_role = 'service_role';
      END;
      $body$
    $f$;
    COMMENT ON FUNCTION public.is_trusted_db_writer() IS 'created by 20261113100000_evidence_lock';
  END IF;
END $$;

-- ---------- 1. Evidence lock ----------
CREATE OR REPLACE FUNCTION public.lock_documents_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;
  IF NEW.cached_result IS DISTINCT FROM OLD.cached_result
     OR NEW.document_hash IS DISTINCT FROM OLD.document_hash
     OR NEW.invoice_date IS DISTINCT FROM OLD.invoice_date
     OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
     OR NEW.vendor IS DISTINCT FROM OLD.vendor
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.confidence IS DISTINCT FROM OLD.confidence
     OR NEW.file_url IS DISTINCT FROM OLD.file_url
     OR NEW.document_type IS DISTINCT FROM OLD.document_type THEN
    RAISE EXCEPTION 'Stored invoice evidence cannot be changed from the app; read the invoice again to update it'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.lock_documents_evidence() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS lock_documents_evidence ON public.documents;
CREATE TRIGGER lock_documents_evidence
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.lock_documents_evidence();

-- ---------- 2. Change history ----------
CREATE TABLE IF NOT EXISTS public.record_events (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('update', 'delete')),
  changed_fields text[] NOT NULL,
  old_values jsonb,
  new_values jsonb,
  actor_kind text NOT NULL CHECK (actor_kind IN ('user', 'system')),
  actor_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS record_events_record_idx ON public.record_events (table_name, record_id, created_at);

ALTER TABLE public.record_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.record_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.record_events_id_seq FROM PUBLIC, anon, authenticated;

-- Append-only: no UPDATE, DELETE or TRUNCATE for anyone. The rollback drops
-- this trigger together with the table (DROP TABLE fires no row triggers).
CREATE OR REPLACE FUNCTION public.record_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'record_events is append-only' USING ERRCODE = '42501';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_events_append_only() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS record_events_append_only ON public.record_events;
CREATE TRIGGER record_events_append_only
  BEFORE UPDATE OR DELETE ON public.record_events
  FOR EACH ROW EXECUTE FUNCTION public.record_events_append_only();
DROP TRIGGER IF EXISTS record_events_no_truncate ON public.record_events;
CREATE TRIGGER record_events_no_truncate
  BEFORE TRUNCATE ON public.record_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.record_events_append_only();

-- documents: per-column comparison, no reads. On DELETE every business field
-- is kept in old_values (cached_result included). A column added later shows
-- as '(other)' until it is listed here.
CREATE OR REPLACE FUNCTION public.log_documents_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f text[] := '{}';
  o jsonb := '{}';
  n jsonb := '{}';
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN
    f := ARRAY['vendor','invoice_number','invoice_date','amount','currency','confidence','document_type','document_hash','file_url','cached_result'];
    o := jsonb_build_object('vendor', OLD.vendor, 'invoice_number', OLD.invoice_number, 'invoice_date', OLD.invoice_date,
           'amount', OLD.amount, 'currency', OLD.currency, 'confidence', OLD.confidence, 'document_type', OLD.document_type,
           'document_hash', OLD.document_hash, 'file_url', OLD.file_url, 'cached_result', OLD.cached_result);
    n := NULL;
  ELSE
    IF NEW.vendor IS DISTINCT FROM OLD.vendor THEN f := f || 'vendor'::text; o := o || jsonb_build_object('vendor', OLD.vendor); n := n || jsonb_build_object('vendor', NEW.vendor); END IF;
    IF NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN f := f || 'invoice_number'::text; o := o || jsonb_build_object('invoice_number', OLD.invoice_number); n := n || jsonb_build_object('invoice_number', NEW.invoice_number); END IF;
    IF NEW.invoice_date IS DISTINCT FROM OLD.invoice_date THEN f := f || 'invoice_date'::text; o := o || jsonb_build_object('invoice_date', OLD.invoice_date); n := n || jsonb_build_object('invoice_date', NEW.invoice_date); END IF;
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN f := f || 'amount'::text; o := o || jsonb_build_object('amount', OLD.amount); n := n || jsonb_build_object('amount', NEW.amount); END IF;
    IF NEW.currency IS DISTINCT FROM OLD.currency THEN f := f || 'currency'::text; o := o || jsonb_build_object('currency', OLD.currency); n := n || jsonb_build_object('currency', NEW.currency); END IF;
    IF NEW.confidence IS DISTINCT FROM OLD.confidence THEN f := f || 'confidence'::text; o := o || jsonb_build_object('confidence', OLD.confidence); n := n || jsonb_build_object('confidence', NEW.confidence); END IF;
    IF NEW.document_type IS DISTINCT FROM OLD.document_type THEN f := f || 'document_type'::text; o := o || jsonb_build_object('document_type', OLD.document_type); n := n || jsonb_build_object('document_type', NEW.document_type); END IF;
    IF NEW.document_hash IS DISTINCT FROM OLD.document_hash THEN f := f || 'document_hash'::text; o := o || jsonb_build_object('document_hash', OLD.document_hash); n := n || jsonb_build_object('document_hash', NEW.document_hash); END IF;
    IF NEW.file_url IS DISTINCT FROM OLD.file_url THEN f := f || 'file_url'::text; o := o || jsonb_build_object('file_url', OLD.file_url); n := n || jsonb_build_object('file_url', NEW.file_url); END IF;
    -- The new read stays on the row; the earlier read is kept here.
    IF NEW.cached_result IS DISTINCT FROM OLD.cached_result THEN f := f || 'cached_result'::text; o := o || jsonb_build_object('cached_result', OLD.cached_result); END IF;
    -- Name only.
    IF NEW.id IS DISTINCT FROM OLD.id THEN f := f || 'id'::text; END IF;
    IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN f := f || 'session_id'::text; END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN f := f || 'user_id'::text; END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN f := f || 'organization_id'::text; END IF;
    IF NEW.tax_amount IS DISTINCT FROM OLD.tax_amount THEN f := f || 'tax_amount'::text; END IF;
    IF NEW.subtotal IS DISTINCT FROM OLD.subtotal THEN f := f || 'subtotal'::text; END IF;
    IF NEW.raw_ocr_data IS DISTINCT FROM OLD.raw_ocr_data THEN f := f || 'raw_ocr_data'::text; END IF;
    IF NEW.cache_expires_at IS DISTINCT FROM OLD.cache_expires_at THEN f := f || 'cache_expires_at'::text; END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN f := f || 'created_at'::text; END IF;
    IF cardinality(f) = 0 THEN
      IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NULL; END IF;  -- nothing changed: no row
      f := ARRAY['(other)'];
    END IF;
  END IF;
  INSERT INTO public.record_events (table_name, record_id, action, changed_fields, old_values, new_values, actor_kind, actor_id, reason)
  VALUES ('documents', OLD.id, lower(TG_OP), f, o, n,
          CASE WHEN v_actor IS NULL THEN 'system' ELSE 'user' END, v_actor,
          NULLIF(current_setting('app.change_reason', true), ''));
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_documents_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS log_documents_change ON public.documents;
CREATE TRIGGER log_documents_change
  AFTER UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.log_documents_change();

-- emissions: same pattern.
CREATE OR REPLACE FUNCTION public.log_emissions_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f text[] := '{}';
  o jsonb := '{}';
  n jsonb := '{}';
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN
    f := ARRAY['activity_data','activity_unit','emission_factor','co2_kg','verified','category','scope','verification_notes'];
    o := jsonb_build_object('activity_data', OLD.activity_data, 'activity_unit', OLD.activity_unit, 'emission_factor', OLD.emission_factor,
           'co2_kg', OLD.co2_kg, 'verified', OLD.verified, 'category', OLD.category, 'scope', OLD.scope,
           'verification_notes', OLD.verification_notes, 'document_id', OLD.document_id);
    n := NULL;
  ELSE
    IF NEW.activity_data IS DISTINCT FROM OLD.activity_data THEN f := f || 'activity_data'::text; o := o || jsonb_build_object('activity_data', OLD.activity_data); n := n || jsonb_build_object('activity_data', NEW.activity_data); END IF;
    IF NEW.activity_unit IS DISTINCT FROM OLD.activity_unit THEN f := f || 'activity_unit'::text; o := o || jsonb_build_object('activity_unit', OLD.activity_unit); n := n || jsonb_build_object('activity_unit', NEW.activity_unit); END IF;
    IF NEW.emission_factor IS DISTINCT FROM OLD.emission_factor THEN f := f || 'emission_factor'::text; o := o || jsonb_build_object('emission_factor', OLD.emission_factor); n := n || jsonb_build_object('emission_factor', NEW.emission_factor); END IF;
    IF NEW.co2_kg IS DISTINCT FROM OLD.co2_kg THEN f := f || 'co2_kg'::text; o := o || jsonb_build_object('co2_kg', OLD.co2_kg); n := n || jsonb_build_object('co2_kg', NEW.co2_kg); END IF;
    IF NEW.verified IS DISTINCT FROM OLD.verified THEN f := f || 'verified'::text; o := o || jsonb_build_object('verified', OLD.verified); n := n || jsonb_build_object('verified', NEW.verified); END IF;
    IF NEW.category IS DISTINCT FROM OLD.category THEN f := f || 'category'::text; o := o || jsonb_build_object('category', OLD.category); n := n || jsonb_build_object('category', NEW.category); END IF;
    IF NEW.scope IS DISTINCT FROM OLD.scope THEN f := f || 'scope'::text; o := o || jsonb_build_object('scope', OLD.scope); n := n || jsonb_build_object('scope', NEW.scope); END IF;
    IF NEW.verification_notes IS DISTINCT FROM OLD.verification_notes THEN f := f || 'verification_notes'::text; o := o || jsonb_build_object('verification_notes', OLD.verification_notes); n := n || jsonb_build_object('verification_notes', NEW.verification_notes); END IF;
    -- Name only.
    IF NEW.id IS DISTINCT FROM OLD.id THEN f := f || 'id'::text; END IF;
    IF NEW.document_id IS DISTINCT FROM OLD.document_id THEN f := f || 'document_id'::text; END IF;
    IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN f := f || 'session_id'::text; END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN f := f || 'user_id'::text; END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN f := f || 'organization_id'::text; END IF;
    IF NEW.data_quality IS DISTINCT FROM OLD.data_quality THEN f := f || 'data_quality'::text; END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN f := f || 'created_at'::text; END IF;
    IF cardinality(f) = 0 THEN
      IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NULL; END IF;
      f := ARRAY['(other)'];
    END IF;
  END IF;
  INSERT INTO public.record_events (table_name, record_id, action, changed_fields, old_values, new_values, actor_kind, actor_id, reason)
  VALUES ('emissions', OLD.id, lower(TG_OP), f, o, n,
          CASE WHEN v_actor IS NULL THEN 'system' ELSE 'user' END, v_actor,
          NULLIF(current_setting('app.change_reason', true), ''));
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_emissions_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS log_emissions_change ON public.emissions;
CREATE TRIGGER log_emissions_change
  AFTER UPDATE OR DELETE ON public.emissions
  FOR EACH ROW EXECUTE FUNCTION public.log_emissions_change();

COMMIT;
