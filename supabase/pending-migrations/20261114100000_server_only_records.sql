-- =============================================
-- PENDING (NOT APPLIED). Documents and emissions are created only on the server.
-- Rollback: rollback/20261114100000_server_only_records.rollback.sql
--
-- refuse_browser_record_insert (BEFORE INSERT on documents and on emissions):
-- a browser session (anon or authenticated JWT) can no longer insert a
-- document or an emission row through the public API. Until now the policies
-- "Owners can insert documents" and "Owners can insert emissions" let any
-- session store a document with a made-up document_hash and matching emission
-- rows without any file being read. The website no longer inserts either table
-- (extract-document and import-records save them with the service role), so
-- nothing the app does is refused.
--
-- Service role (edge functions) and direct database sessions (migrations, the
-- SQL editor) pass exactly as before, through is_trusted_db_writer(). Updates
-- and deletes are untouched. The existing insert policies are kept, so the
-- rollback only removes this trigger; the trigger is the guard.
--
-- Add-only: no existing row, policy or function body is changed. Safe to run
-- again. Works with or without 20261011120000_protect_privileged_columns,
-- 20261022100000_emissions_write_guard and 20261113100000_evidence_lock: if
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
    COMMENT ON FUNCTION public.is_trusted_db_writer() IS 'created by 20261114100000_server_only_records';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refuse_browser_record_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invoices and their records are saved only when the file is read; upload the invoice instead'
    USING ERRCODE = '42501';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refuse_browser_record_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refuse_browser_record_insert ON public.documents;
CREATE TRIGGER refuse_browser_record_insert
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.refuse_browser_record_insert();

DROP TRIGGER IF EXISTS refuse_browser_record_insert ON public.emissions;
CREATE TRIGGER refuse_browser_record_insert
  BEFORE INSERT ON public.emissions
  FOR EACH ROW EXECUTE FUNCTION public.refuse_browser_record_insert();

COMMIT;
