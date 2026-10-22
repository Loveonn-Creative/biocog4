-- =============================================
-- OPTIONAL, OWNER-APPROVED ONLY. Deletes legacy guest rows (rows with no
-- account: user_id IS NULL) stored before guest uploads became browser-only.
--
-- Safety: nothing with a user_id is touched, so signed-in and paid users'
-- invoices, emissions, verifications, ledger, reports and dashboards are
-- unaffected. The transaction counts every account-owned row before and after
-- and rolls back if any number changes. Run check 3 in
-- security_followup_checks.sql first to see what will go. Not reversible:
-- take a Supabase backup before running.
-- =============================================
BEGIN;
CREATE TEMP TABLE before_counts ON COMMIT DROP AS
SELECT 'documents' t, count(*) n FROM public.documents WHERE user_id IS NOT NULL
UNION ALL SELECT 'emissions', count(*) FROM public.emissions WHERE user_id IS NOT NULL
UNION ALL SELECT 'carbon_verifications', count(*) FROM public.carbon_verifications WHERE user_id IS NOT NULL
UNION ALL SELECT 'compliance_ledger', count(*) FROM public.compliance_ledger
UNION ALL SELECT 'reports', count(*) FROM public.reports WHERE user_id IS NOT NULL
UNION ALL SELECT 'monetization_pathways', count(*) FROM public.monetization_pathways WHERE user_id IS NOT NULL
UNION ALL SELECT 'chat_history', count(*) FROM public.chat_history WHERE user_id IS NOT NULL;

DELETE FROM public.monetization_pathways WHERE user_id IS NULL AND session_id IS NOT NULL;
DELETE FROM public.reports WHERE user_id IS NULL AND session_id IS NOT NULL;
DELETE FROM public.chat_history WHERE user_id IS NULL AND session_id IS NOT NULL;
-- Guest verifications or emissions referenced by any account-owned ledger row stay.
DELETE FROM public.carbon_verifications v WHERE v.user_id IS NULL AND v.session_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.compliance_ledger l WHERE l.verification_id = v.id);
DELETE FROM public.emissions e WHERE e.user_id IS NULL AND e.session_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.compliance_ledger l WHERE l.emission_id = e.id);
DELETE FROM public.documents d WHERE d.user_id IS NULL AND d.session_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.emissions e WHERE e.document_id = d.id);

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(b.t, ', ') INTO bad FROM before_counts b JOIN (
    SELECT 'documents' t, count(*) n FROM public.documents WHERE user_id IS NOT NULL
    UNION ALL SELECT 'emissions', count(*) FROM public.emissions WHERE user_id IS NOT NULL
    UNION ALL SELECT 'carbon_verifications', count(*) FROM public.carbon_verifications WHERE user_id IS NOT NULL
    UNION ALL SELECT 'compliance_ledger', count(*) FROM public.compliance_ledger
    UNION ALL SELECT 'reports', count(*) FROM public.reports WHERE user_id IS NOT NULL
    UNION ALL SELECT 'monetization_pathways', count(*) FROM public.monetization_pathways WHERE user_id IS NOT NULL
    UNION ALL SELECT 'chat_history', count(*) FROM public.chat_history WHERE user_id IS NOT NULL
  ) a ON a.t = b.t WHERE a.n <> b.n;
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'Account-owned rows changed (%); nothing deleted.', bad; END IF;
END $$;
COMMIT;
