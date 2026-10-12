-- Behaviour tests for 20261015100000_atomic_verify_and_delete.sql.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000a1', 'u@x.in'), ('00000000-0000-4000-8000-0000000000b2', 'other@x.in');
INSERT INTO public.documents (id, user_id, document_type, document_hash) VALUES
 ('d0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'invoice', 'h1'),
 ('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', 'invoice', 'h2');
INSERT INTO public.emissions (id, user_id, document_id, scope, category, co2_kg) VALUES
 ('e0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-000000000001', 2, 'electricity', 71),
 ('e0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-000000000001', 1, 'diesel', 26.8),
 ('e0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-000000000002', 1, 'diesel', 10);

CREATE TEMP TABLE t_p AS SELECT jsonb_build_object(
  'verification', jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000001', 'created_at', now(), 'idempotency_key', 'key-1',
     'emission_ids', jsonb_build_array('e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002'),
     'user_id', '00000000-0000-4000-8000-0000000000a1', 'total_co2_kg', 97.8, 'verification_status', 'verified',
     'ai_analysis', jsonb_build_object('verifiedEmissionIds', jsonb_build_array('e0000000-0000-4000-8000-000000000001')), 'verified_at', now()),
  'verified_emission_ids', jsonb_build_array('e0000000-0000-4000-8000-000000000001'),
  'ledger', jsonb_build_array(
     jsonb_build_object('id', gen_random_uuid(), 'created_at', now(), 'user_id', '00000000-0000-4000-8000-0000000000a1', 'emission_id', 'e0000000-0000-4000-8000-000000000001',
       'document_id', 'd0000000-0000-4000-8000-000000000001', 'document_hash', 'h1', 'scope', 2, 'emission_category', 'electricity', 'co2_kg', 71,
       'methodology_version', 'v', 'verification_status', 'verified', 'verified_at', now()),
     jsonb_build_object('id', gen_random_uuid(), 'created_at', now(), 'user_id', '00000000-0000-4000-8000-0000000000a1', 'emission_id', 'e0000000-0000-4000-8000-000000000002',
       'document_id', 'd0000000-0000-4000-8000-000000000001', 'document_hash', 'h1', 'scope', 1, 'emission_category', 'diesel', 'co2_kg', 26.8,
       'methodology_version', 'v', 'verification_status', 'needs_review')),
  'scope', jsonb_build_object('user_id', '00000000-0000-4000-8000-0000000000a1')) AS p;

-- a bad ledger row makes the whole commit fail: nothing is written
SELECT pg_temp.expect_error(format('SELECT public.commit_verification(%L::jsonb)',
  (SELECT jsonb_set(p, '{ledger,1,emission_id}', '"e0000000-0000-4000-8000-000000000003"') FROM t_p)), 'ledger row outside the set aborts the commit');
SELECT pg_temp.check((SELECT count(*) FROM public.carbon_verifications) = 0
  AND (SELECT count(*) FROM public.emissions WHERE verified) = 0
  AND (SELECT count(*) FROM public.compliance_ledger) = 0, 'failed commit leaves no verification, flag or ledger row');

-- someone else's records are refused
SELECT pg_temp.expect_error(format('SELECT public.commit_verification(%L::jsonb)',
  (SELECT jsonb_set(p, '{scope,user_id}', '"00000000-0000-4000-8000-0000000000b2"') FROM t_p)), 'records outside the caller''s workspace are refused');

-- the real commit
SELECT pg_temp.check((public.commit_verification((SELECT p FROM t_p)) ->> 'reused')::boolean = false, 'commit succeeds');
SELECT pg_temp.check((SELECT verified FROM public.emissions WHERE id = 'e0000000-0000-4000-8000-000000000001')
  AND NOT (SELECT verified FROM public.emissions WHERE id = 'e0000000-0000-4000-8000-000000000002'), 'only the record that passed is flagged verified');
SELECT pg_temp.check((SELECT verification_status FROM public.compliance_ledger WHERE emission_id = 'e0000000-0000-4000-8000-000000000002') = 'needs_review'
  AND (SELECT verification_id FROM public.compliance_ledger WHERE emission_id = 'e0000000-0000-4000-8000-000000000001') = 'c0000000-0000-4000-8000-000000000001',
  'ledger rows stored with the verification and per-record status');

-- an interrupted earlier run (ledger row lost, flag reset) is completed on retry, without a second verification
DELETE FROM public.compliance_ledger WHERE emission_id = 'e0000000-0000-4000-8000-000000000001';
UPDATE public.emissions SET verified = false WHERE id = 'e0000000-0000-4000-8000-000000000001';
SELECT pg_temp.check((public.commit_verification((SELECT jsonb_set(p, '{verification,id}', to_jsonb(gen_random_uuid()::text)) FROM t_p)) ->> 'reused')::boolean, 'same set is reused');
SELECT pg_temp.check((SELECT count(*) FROM public.carbon_verifications) = 1
  AND (SELECT verified FROM public.emissions WHERE id = 'e0000000-0000-4000-8000-000000000001')
  AND (SELECT count(*) FROM public.compliance_ledger WHERE emission_id = 'e0000000-0000-4000-8000-000000000001' AND verification_status = 'verified') = 1,
  'retry restores the missing flag and ledger row, still one verification');
SELECT pg_temp.check((SELECT count(*) FROM public.compliance_ledger) = 2, 'no duplicate ledger rows');

-- delete: verified invoice is refused, unverified invoice goes atomically with an audit row
SELECT pg_temp.check((public.delete_document_atomic('d0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', true) ->> 'deleted')::boolean = false,
  'invoice with verified records is kept');
SELECT pg_temp.check((SELECT count(*) FROM public.emissions WHERE document_id = 'd0000000-0000-4000-8000-000000000001') = 2, 'nothing removed from the kept invoice');
INSERT INTO public.carbon_verifications (id, emission_ids, user_id, total_co2_kg, verification_status)
VALUES ('c0000000-0000-4000-8000-000000000002', ARRAY['e0000000-0000-4000-8000-000000000003']::uuid[], '00000000-0000-4000-8000-0000000000a1', 10, 'needs_review');
INSERT INTO public.monetization_pathways (verification_id, pathway_type, user_id) VALUES ('c0000000-0000-4000-8000-000000000002', 'carbon_credit', '00000000-0000-4000-8000-0000000000a1');
SELECT pg_temp.check((public.delete_document_atomic('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', true) ->> 'detail') = 'monetization_pathway',
  'a pathway built on a verification of these records blocks deletion');
DELETE FROM public.monetization_pathways;
SELECT pg_temp.expect_error($q$SELECT public.delete_document_atomic('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000b2', false)$q$, 'not allowed means not found');
SELECT pg_temp.check((public.delete_document_atomic('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', true, 'test-agent') ->> 'deleted')::boolean, 'unverified invoice deleted');
SELECT pg_temp.check(NOT EXISTS (SELECT 1 FROM public.documents WHERE id = 'd0000000-0000-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM public.emissions WHERE id = 'e0000000-0000-4000-8000-000000000003')
  AND EXISTS (SELECT 1 FROM public.carbon_verifications WHERE id = 'c0000000-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM public.security_audit_log WHERE event_type = 'document_deleted_by_owner' AND details -> 'unverified_attempts_kept' ? 'c0000000-0000-4000-8000-000000000002'),
  'rows removed, the unverified attempt kept as history and named in the audit entry');

-- payload without id or created_at still gets keys and timestamps (defaults are not applied by jsonb_populate_record)
INSERT INTO public.documents (id, user_id, document_type, document_hash) VALUES ('d0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a1', 'invoice', 'h3');
INSERT INTO public.emissions (id, user_id, document_id, scope, category, co2_kg) VALUES ('e0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-000000000003', 1, 'diesel', 5);
SELECT pg_temp.check((public.commit_verification(jsonb_build_object(
  'verification', jsonb_build_object('idempotency_key', 'key-nokeys', 'emission_ids', jsonb_build_array('e0000000-0000-4000-8000-000000000004'),
     'user_id', '00000000-0000-4000-8000-0000000000a1', 'total_co2_kg', 5, 'verification_status', 'needs_review'),
  'ledger', jsonb_build_array(jsonb_build_object('user_id', '00000000-0000-4000-8000-0000000000a1', 'emission_id', 'e0000000-0000-4000-8000-000000000004',
     'document_id', 'd0000000-0000-4000-8000-000000000003', 'document_hash', 'h3', 'scope', 1, 'emission_category', 'diesel', 'co2_kg', 5,
     'methodology_version', 'v', 'verification_status', 'needs_review')),
  'scope', jsonb_build_object('user_id', '00000000-0000-4000-8000-0000000000a1'))) ->> 'reused')::boolean = false, 'commit without ids accepted');
SELECT pg_temp.check((SELECT count(*) FROM public.carbon_verifications WHERE idempotency_key = 'key-nokeys' AND id IS NOT NULL AND created_at IS NOT NULL) = 1
  AND (SELECT count(*) FROM public.compliance_ledger WHERE emission_id = 'e0000000-0000-4000-8000-000000000004' AND id IS NOT NULL AND created_at IS NOT NULL) = 1,
  'missing id and created_at are filled in');

-- browsers cannot call either function
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.commit_verification('{}'::jsonb)$q$, 'signed-in browser cannot commit verifications');
SELECT pg_temp.expect_error($q$SELECT public.delete_document_atomic('d0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', true)$q$, 'signed-in browser cannot delete through the function');
RESET ROLE;
SELECT 'ALL ATOMIC TESTS PASSED' AS result;
