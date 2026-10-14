-- =============================================
-- PENDING (NOT APPLIED). Lets profiles.size hold 'large'.
-- Rollback: rollback/20261025100000_profile_size_large.rollback.sql
--
-- Settings has always offered "Large (>250 employees)", but the check
-- constraint only allowed micro, small and medium, so saving Large failed.
-- Existing values are unchanged; only the allowed list grows.
-- =============================================
BEGIN;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_size_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_size_check CHECK (size IN ('micro', 'small', 'medium', 'large'));
COMMIT;
