CREATE OR REPLACE FUNCTION public.commit_verification(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ver public.carbon_verifications;
  v_key text := p #>> '{verification,idempotency_key}';
  v_ids uuid[] := ARRAY(SELECT DISTINCT jsonb_array_elements_text(p #> '{verification,emission_ids}')::uuid);
  v_flag uuid[] := ARRAY(SELECT DISTINCT jsonb_array_elements_text(coalesce(p -> 'verified_emission_ids', '[]'::jsonb))::uuid);
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

  IF v_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.carbon_verifications WHERE idempotency_key = v_key ORDER BY created_at LIMIT 1 FOR UPDATE;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    v_reused := true;
    v_verification_id := v_existing.id;
    IF v_existing.verification_status = 'verified' THEN
      IF jsonb_typeof(v_existing.ai_analysis -> 'verifiedEmissionIds') = 'array' THEN
        v_flag := ARRAY(SELECT DISTINCT jsonb_array_elements_text(v_existing.ai_analysis -> 'verifiedEmissionIds')::uuid);
      ELSE
        v_flag := v_ids;
      END IF;
    ELSE
      v_flag := '{}';
    END IF;
  ELSE
    v_ver := jsonb_populate_record(NULL::public.carbon_verifications, p -> 'verification');
    v_ver.id := coalesce(v_ver.id, gen_random_uuid());
    v_ver.created_at := coalesce(v_ver.created_at, now());
    v_ver.verification_status := coalesce(v_ver.verification_status, 'pending');
    v_ver.emission_ids := v_ids;
    INSERT INTO public.carbon_verifications SELECT (v_ver).* RETURNING * INTO v_ver;
    v_verification_id := v_ver.id;
  END IF;

  IF cardinality(v_flag) > 0 THEN
    UPDATE public.emissions SET verified = true WHERE id = ANY (v_flag) AND verified IS DISTINCT FROM true;
  END IF;

  IF jsonb_typeof(p -> 'ledger') = 'array' AND jsonb_array_length(p -> 'ledger') > 0 THEN
    CREATE TEMP TABLE IF NOT EXISTS _commit_ledger (LIKE public.compliance_ledger INCLUDING DEFAULTS) ON COMMIT DROP;
    ALTER TABLE _commit_ledger ALTER COLUMN id DROP NOT NULL;
    DELETE FROM _commit_ledger WHERE id IS NOT NULL OR id IS NULL;
    INSERT INTO _commit_ledger SELECT * FROM jsonb_populate_recordset(NULL::public.compliance_ledger, p -> 'ledger');
    UPDATE _commit_ledger SET verification_id = v_verification_id,
      id = coalesce(id, gen_random_uuid()), created_at = coalesce(created_at, now()),
      currency = coalesce(currency, 'INR'), is_green_benefit = coalesce(is_green_benefit, false),
      verification_status = coalesce(verification_status, 'pending'), validation_result = coalesce(validation_result, 'pending');
    -- One evidence row per (owner, emission): a repeated row in one request would
    -- make the upsert touch the same ledger row twice (SQLSTATE 21000).
    DELETE FROM _commit_ledger a USING _commit_ledger b
     WHERE a.user_id IS NOT DISTINCT FROM b.user_id AND a.emission_id IS NOT DISTINCT FROM b.emission_id
       AND (CASE WHEN a.verification_status = 'verified' THEN 0 ELSE 1 END, a.ctid)
         > (CASE WHEN b.verification_status = 'verified' THEN 0 ELSE 1 END, b.ctid);
    IF v_reused THEN
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
$function$;
REVOKE ALL ON FUNCTION public.commit_verification(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_verification(jsonb) TO service_role;