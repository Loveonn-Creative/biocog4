-- Rollback for 20261015100000_atomic_verify_and_delete.sql.
-- Removes the two functions. No table or row is changed by either script; the
-- edge functions fall back to their step-by-step writes when the functions
-- are missing.
BEGIN;
DROP FUNCTION IF EXISTS public.commit_verification(jsonb);
DROP FUNCTION IF EXISTS public.delete_document_atomic(uuid, uuid, boolean, text);
COMMIT;
