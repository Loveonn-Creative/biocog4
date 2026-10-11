-- READ-ONLY ownership audit. Changes nothing. Run in the SQL editor as owner.
-- Finds records whose owner does not match the record they derive from, the
-- footprint left by the earlier bugs (document re-assignment by hash, the
-- cross-user extraction cache, and stale guest-session merges).

-- 1. Emission rows owned by someone other than their document's owner.
SELECT e.id AS emission_id, e.user_id AS emission_owner, d.id AS document_id, d.user_id AS document_owner, e.verified, e.created_at
FROM public.emissions e
JOIN public.documents d ON d.id = e.document_id
WHERE e.user_id IS DISTINCT FROM d.user_id
ORDER BY e.created_at DESC;

-- 2. Ledger rows owned by someone other than the emission's owner.
SELECT l.id AS ledger_id, l.user_id AS ledger_owner, e.id AS emission_id, e.user_id AS emission_owner, l.verification_status, l.created_at
FROM public.compliance_ledger l
JOIN public.emissions e ON e.id = l.emission_id
WHERE l.user_id IS DISTINCT FROM e.user_id
ORDER BY l.created_at DESC;

-- 3. Documents with emissions created before the document was (re)assigned:
--    the document's owner never uploaded it themselves if an older guest
--    session or another user produced its first emission rows.
SELECT d.id AS document_id, d.user_id, d.created_at AS document_created, min(e.created_at) AS first_emission
FROM public.documents d
JOIN public.emissions e ON e.document_id = d.id
GROUP BY d.id, d.user_id, d.created_at
HAVING min(e.created_at) < d.created_at - interval '1 minute';

-- 4. The same file (hash) held by more than one account. Expected for a
--    genuinely shared invoice; worth a look if a new account holds an old file.
SELECT document_hash, count(DISTINCT user_id) AS accounts, array_agg(DISTINCT user_id) AS owners, min(created_at) AS first_seen
FROM public.documents
WHERE document_hash IS NOT NULL AND user_id IS NOT NULL
GROUP BY document_hash
HAVING count(DISTINCT user_id) > 1
ORDER BY first_seen DESC;

-- 5. Guest-session merges, newest first (with counts moved), to cross-check
--    accounts that reported inherited invoices.
SELECT created_at, user_id, session_id, details
FROM public.security_audit_log
WHERE event_type IN ('SESSION_MERGE_SUCCESS', 'session_merge_skipped_stale')
ORDER BY created_at DESC
LIMIT 200;
