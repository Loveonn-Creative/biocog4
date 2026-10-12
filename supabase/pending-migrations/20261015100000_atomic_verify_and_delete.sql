-- =============================================
-- PENDING (NOT APPLIED). Atomic verification and atomic invoice deletion.
-- Rollback: rollback/20261015100000_atomic_verify_and_delete.rollback.sql
--
-- Depends on 20261011180000_team_access_and_ledger_integrity.sql (the unique
-- (user_id, emission_id) ledger index). Aborts if that is missing.
--
-- a) commit_verification(p jsonb): the verification row, the emission
--    "verified" flags and the ledger evidence are written in one transaction.
--    Either all of it is stored or none of it, and the edge function reports
--    the failure. The emissions are locked first, so a concurrent delete
--    cannot remove them half-way. Re-running the same emission set returns
--    the stored verification and fills in any flags or ledger rows that an
--    earlier, interrupted run left missing.
-- b) delete_document_atomic(document, actor, allowed): removes an unverified
--    invoice with its unverified rows in one transaction, after locking the
--    document and its emissions and checking every reference: verified
--    emissions, verified ledger rows, verified verifications that list these
--    emissions, and monetisation pathways or marketplace listings built on
--    any verification of them. The audit entry is written in the same
--    transaction.
-- Both are callable by service_role only (the edge functions).
-- =============================================
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.compliance_ledger_user_emission_key') IS NULL THEN
    RAISE EXCEPTION 'Apply 20261011180000_team_access_and_ledger_integrity.sql first (ledger unique index missing)';
  END IF;
END $$;

-- ---------------------------------------------
-- a) commit_verification
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.commit_verification(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ver public.carbon_verifications;
  v_key text := p #>> '{verification,idempotency_key}';
  v_ids uuid[] := ARRAY(SELECT jsonb_array_elements_text(p #> '{verification,emission_ids}')::uuid);
  v_flag uuid[] := ARRAY(SELECT jsonb_array_elements_text(coalesce(p -> 'verified_emission_ids', '[]'::jsonb))::uuid);
  v_user uuid := nullif(p #>> '{scope,user_id}', '')::uuid;
  v_session uuid := nullif(p #>> '{scope,session_id}', '')::uuid;
  v_org uuid := nullif(p #>> '{scope,organization_id}', '')::uuid;
  v_locked int;
  v_existing public.carbon_verifications;
  v_reused boolean := false;
  v_verification_id uuid;
BEGIN
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'no emissions to verify' USING ERRCODE = '22023';
  END IF;
  IF NOT (v_flag <@ v_ids) THEN
    RAISE EXCEPTION 'flagged emissions must belong to this verification' USING ERRCODE = '22023';
  END IF;

  -- Lock the records in a stable order and confirm they are all still here
  -- and still belong to the caller's workspace.
  SELECT count(*) INTO v_locked FROM (
    SELECT e.id FROM public.emissions e
     WHERE e.id = ANY (v_ids)
       AND (
         (v_org IS NOT NULL AND e.organization_id = v_org)
         OR (v_org IS NULL AND v_user IS NOT NULL AND e.user_id = v_user AND e.organization_id IS NULL)
         OR (v_org IS NULL AND v_user IS NULL AND e.user_id IS NULL AND e.session_id = v_session)
       )
     ORDER BY e.id
     FOR UPDATE
  ) locked;
  IF v_locked <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'records_changed' USING ERRCODE = '40001';
  END IF;

  -- Same emission set verified before: reuse it, and complete anything an
  -- interrupted run left out.
  IF v_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.carbon_verifications WHERE idempotency_key = v_key FOR UPDATE;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    v_reused := true;
    v_verification_id := v_existing.id;
    IF v_existing.verification_status = 'verified' THEN
      v_flag := coalesce(ARRAY(SELECT jsonb_array_elements_text(v_existing.ai_analysis -> 'verifiedEmissionIds')::uuid), v_ids);
      IF cardinality(v_flag) = 0 AND NOT (v_existing.ai_analysis ? 'verifiedEmissionIds') THEN v_flag := v_ids; END IF;
    ELSE
      v_flag := '{}';
    END IF;
  ELSE
    -- jsonb_populate_record does not apply column defaults, so the keys are
    -- filled here when the caller left them out.
    v_ver := jsonb_populate_record(NULL::public.carbon_verifications, p -> 'verification');
    v_ver.id := coalesce(v_ver.id, gen_random_uuid());
    v_ver.created_at := coalesce(v_ver.created_at, now());
    v_ver.verification_status := coalesce(v_ver.verification_status, 'pending');
    INSERT INTO public.carbon_verifications SELECT (v_ver).* RETURNING * INTO v_ver;
    v_verification_id := v_ver.id;
  END IF;

  IF cardinality(v_flag) > 0 THEN
    UPDATE public.emissions SET verified = true WHERE id = ANY (v_flag) AND verified IS DISTINCT FROM true;
  END IF;

  -- Ledger evidence: one row per (owner, emission). An existing unverified row
  -- is promoted when this run verified that emission; nothing else changes.
  IF jsonb_typeof(p -> 'ledger') = 'array' AND jsonb_array_length(p -> 'ledger') > 0 THEN
    CREATE TEMP TABLE IF NOT EXISTS _commit_ledger (LIKE public.compliance_ledger INCLUDING DEFAULTS) ON COMMIT DROP;
    ALTER TABLE _commit_ledger ALTER COLUMN id DROP NOT NULL;
    DELETE FROM _commit_ledger;
    INSERT INTO _commit_ledger SELECT * FROM jsonb_populate_recordset(NULL::public.compliance_ledger, p -> 'ledger');
    -- jsonb_populate_recordset does not apply column defaults; mirror them.
    UPDATE _commit_ledger SET verification_id = v_verification_id,
      id = coalesce(id, gen_random_uuid()), created_at = coalesce(created_at, now()),
      currency = coalesce(currency, 'INR'), is_green_benefit = coalesce(is_green_benefit, false),
      verification_status = coalesce(verification_status, 'pending'), validation_result = coalesce(validation_result, 'pending');
    IF v_reused THEN
      -- Statuses follow the stored verification, not this request.
      UPDATE _commit_ledger SET
        verification_status = CASE WHEN emission_id = ANY (v_flag) THEN 'verified'
                                   WHEN v_existing.verification_status = 'verified' THEN 'needs_review'
                                   ELSE v_existing.verification_status END,
        verified_at = CASE WHEN emission_id = ANY (v_flag) THEN coalesce(v_existing.verified_at, now()) ELSE NULL END;
    END IF;
    IF EXISTS (SELECT 1 FROM _commit_ledger l WHERE l.emission_id IS NULL OR NOT (l.emission_id = ANY (v_ids))) THEN
      RAISE EXCEPTION 'ledger rows must reference this verification''s emissions' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.compliance_ledger
    SELECT * FROM _commit_ledger
    ON CONFLICT (user_id, emission_id) DO UPDATE SET
      verification_id = EXCLUDED.verification_id,
      verification_status = EXCLUDED.verification_status,
      verification_score = EXCLUDED.verification_score,
      greenwashing_risk = EXCLUDED.greenwashing_risk,
      validation_result = EXCLUDED.validation_result,
      verified_at = EXCLUDED.verified_at
    WHERE EXCLUDED.verification_status = 'verified'
      AND public.compliance_ledger.verification_status IS DISTINCT FROM 'verified';
  END IF;

  RETURN jsonb_build_object('verification_id', v_verification_id, 'reused', v_reused, 'flagged', cardinality(v_flag));
END;
$$;

REVOKE ALL ON FUNCTION public.commit_verification(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_verification(jsonb) TO service_role;

-- ---------------------------------------------
-- b) delete_document_atomic
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_document_atomic(p_document_id uuid, p_actor uuid, p_allowed boolean, p_user_agent text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_doc public.documents;
  v_emission_ids uuid[];
  v_ledger_ids uuid[];
  v_attempts uuid[];
  v_blocking text;
BEGIN
  -- The caller (edge function) has already decided the actor may delete this
  -- document; refuse anything else outright.
  IF NOT coalesce(p_allowed, false) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Lock every emission of this invoice, so a verification cannot commit in
  -- the middle of the delete (commit_verification locks the same rows).
  v_emission_ids := ARRAY(SELECT id FROM public.emissions WHERE document_id = p_document_id ORDER BY id FOR UPDATE);

  v_blocking := CASE
    WHEN EXISTS (SELECT 1 FROM public.emissions WHERE id = ANY (v_emission_ids) AND verified = true)
      THEN 'verified_emission'
    WHEN EXISTS (SELECT 1 FROM public.compliance_ledger
                  WHERE (document_id = p_document_id OR emission_id = ANY (v_emission_ids))
                    AND lower(coalesce(verification_status, '')) = 'verified')
      THEN 'verified_ledger'
    WHEN EXISTS (SELECT 1 FROM public.carbon_verifications
                  WHERE emission_ids && v_emission_ids AND verification_status = 'verified')
      THEN 'verified_verification'
    WHEN EXISTS (SELECT 1 FROM public.monetization_pathways mp
                   JOIN public.carbon_verifications cv ON cv.id = mp.verification_id
                  WHERE cv.emission_ids && v_emission_ids)
      THEN 'monetization_pathway'
    WHEN EXISTS (SELECT 1 FROM public.marketplace_listings ml
                   JOIN public.carbon_verifications cv ON cv.id = ml.verification_id
                  WHERE cv.emission_ids && v_emission_ids)
      THEN 'marketplace_listing'
    ELSE NULL
  END;
  IF v_blocking IS NOT NULL THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'has_verified_records', 'detail', v_blocking);
  END IF;

  v_ledger_ids := ARRAY(SELECT id FROM public.compliance_ledger
                         WHERE document_id = p_document_id OR emission_id = ANY (v_emission_ids));
  -- Unverified attempts that listed these emissions stay as history; the audit
  -- entry records which ones, since their emission ids will no longer resolve.
  v_attempts := ARRAY(SELECT id FROM public.carbon_verifications WHERE emission_ids && v_emission_ids);

  DELETE FROM public.compliance_ledger WHERE id = ANY (v_ledger_ids);
  DELETE FROM public.emissions WHERE id = ANY (v_emission_ids);
  DELETE FROM public.documents WHERE id = p_document_id;

  INSERT INTO public.security_audit_log (event_type, user_id, user_agent, details)
  VALUES (
    CASE WHEN v_doc.organization_id IS NOT NULL THEN 'document_deleted_in_organization' ELSE 'document_deleted_by_owner' END,
    p_actor, p_user_agent,
    jsonb_build_object(
      'document_id', v_doc.id, 'organization_id', v_doc.organization_id, 'uploaded_by', v_doc.user_id,
      'document_hash', v_doc.document_hash, 'vendor', v_doc.vendor, 'invoice_number', v_doc.invoice_number,
      'uploaded_at', v_doc.created_at, 'emissions_removed', cardinality(v_emission_ids),
      'ledger_rows_removed', cardinality(v_ledger_ids), 'unverified_attempts_kept', v_attempts
    )
  );

  RETURN jsonb_build_object('deleted', true, 'emissions', cardinality(v_emission_ids), 'ledger', cardinality(v_ledger_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.delete_document_atomic(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_document_atomic(uuid, uuid, boolean, text) TO service_role;

COMMIT;
