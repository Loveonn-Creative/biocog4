-- Rollback for 20261024100000_intelligence_usage. The counts are operational
-- data only (no user content), so they are dropped without a confirmation
-- step. The edge functions fall back to a per-instance limit when the table
-- is missing.
BEGIN;
DROP FUNCTION IF EXISTS public.intelligence_usage_purge();
DROP FUNCTION IF EXISTS public.intelligence_used(text, text, date, date);
DROP FUNCTION IF EXISTS public.intelligence_take(text, text, date, date, integer);
DROP TABLE IF EXISTS public.intelligence_usage;
COMMIT;
