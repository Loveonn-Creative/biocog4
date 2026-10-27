-- =============================================
-- PENDING (NOT APPLIED). Monthly report download allowance on the free plan,
-- enforced on the server.
-- Rollback: rollback/20261112100000_report_downloads.rollback.sql
-- Apply after 20261024100000_intelligence_usage (the count lives there).
--
-- 1. intelligence_usage accepts the kind 'report_download' (only when that
--    table exists; nothing else about it changes).
-- 2. report_downloads: one row per user, India-time month and report key,
--    so downloading the same report again in the same month (a double click,
--    a second copy) is never counted twice. Server only: RLS on, no browser
--    policies or grants.
-- 3. report_download_take(): in one locked step, lets a repeat through
--    without counting, otherwise counts one download through
--    intelligence_take and records the key only when the download was allowed.
--
-- Only the report-allowance edge function (service role) calls it. If the
-- function or table is missing, report-allowance lets the download through.
-- Safe to run again (for example after intelligence_usage is applied later).
-- =============================================
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.intelligence_usage') IS NOT NULL THEN
    ALTER TABLE public.intelligence_usage DROP CONSTRAINT IF EXISTS intelligence_usage_kind_check;
    ALTER TABLE public.intelligence_usage ADD CONSTRAINT intelligence_usage_kind_check
      CHECK (kind IN ('message', 'voice_session', 'guest_scan', 'report_download'));
  END IF;
END $$;

-- report_key: <REPORT>:<period start or none>:<period end or none>:<pdf|xlsx>,
-- built and checked by the edge function (_shared/reportAllowance.ts).
CREATE TABLE IF NOT EXISTS public.report_downloads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  report_key text NOT NULL CHECK (report_key ~ '^[A-Z][A-Z0-9_]{1,39}:([0-9]{4}-[0-9]{2}-[0-9]{2}|none):([0-9]{4}-[0-9]{2}-[0-9]{2}|none):(pdf|xlsx)$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month, report_key)
);

ALTER TABLE public.report_downloads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_downloads FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.report_downloads TO service_role;

-- Takes the same per-subject lock as intelligence_take (advisory locks are
-- re-entrant within a transaction), so two clicks at once are serialised: the
-- second sees the first one's key and is let through as a repeat.
CREATE OR REPLACE FUNCTION public.report_download_take(
  p_user uuid, p_report_key text, p_day date, p_window_start date, p_limit integer
) RETURNS TABLE (allowed boolean, used integer, repeat boolean)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_subject text := 'u:' || p_user::text;
  v_used integer;
  v_take record;
BEGIN
  IF p_window_start > p_day THEN RAISE EXCEPTION 'window starts after the day'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_subject || '|report_download', 0));
  IF EXISTS (SELECT 1 FROM public.report_downloads d
              WHERE d.user_id = p_user AND d.month = p_window_start AND d.report_key = p_report_key) THEN
    SELECT coalesce(sum(u.count), 0)::integer INTO v_used FROM public.intelligence_usage u
     WHERE u.subject = v_subject AND u.kind = 'report_download' AND u.day BETWEEN p_window_start AND p_day;
    RETURN QUERY SELECT true, v_used, true;
    RETURN;
  END IF;
  SELECT t.allowed, t.used INTO v_take
    FROM public.intelligence_take(v_subject, 'report_download', p_day, p_window_start, p_limit) t;
  IF v_take.allowed THEN
    INSERT INTO public.report_downloads (user_id, month, report_key) VALUES (p_user, p_window_start, p_report_key);
  END IF;
  RETURN QUERY SELECT v_take.allowed, v_take.used, false;
END $$;

CREATE OR REPLACE FUNCTION public.report_downloads_purge() RETURNS integer
LANGUAGE sql
SET search_path = public
AS $$
  WITH d AS (DELETE FROM public.report_downloads WHERE month < current_date - 400 RETURNING 1)
  SELECT count(*)::integer FROM d;
$$;

REVOKE ALL ON FUNCTION public.report_download_take(uuid, text, date, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.report_downloads_purge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_download_take(uuid, text, date, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.report_downloads_purge() TO service_role;

COMMIT;
