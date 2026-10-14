-- =============================================
-- PENDING (NOT APPLIED). Daily Biocog Intelligence message counts and
-- monthly real-time voice session counts, so plan limits hold on the server.
-- Rollback: rollback/20261024100000_intelligence_usage.rollback.sql
--
-- One new table and one function; nothing existing is touched. Only the
-- intelligence-chat and elevenlabs-conversation-token edge functions
-- (service role) read or write it; browsers have no access. Subjects are
-- 'u:<user id>' for signed-in users and 'g:<keyed hash>' for guests: the
-- guest hash is of the network address and the day, keyed with a server
-- secret, so no address is stored and a guest cannot be followed across days.
-- Counts are operational data: rows older than 400 days can be purged with
-- public.intelligence_usage_purge().
-- =============================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.intelligence_usage (
  subject text NOT NULL CHECK (subject ~ '^(u:[0-9a-f-]{36}|g:[0-9a-f]{32})$'),
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('message', 'voice_session')),
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject, kind, day)
);

ALTER TABLE public.intelligence_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intelligence_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.intelligence_usage TO service_role;

-- Counts one use if the subject is under its limit for the window
-- [p_window_start, p_day]. Serialised per subject and kind, so two requests at
-- the same moment cannot both take the last use.
CREATE OR REPLACE FUNCTION public.intelligence_take(
  p_subject text, p_kind text, p_day date, p_window_start date, p_limit integer
) RETURNS TABLE (allowed boolean, used integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_used integer;
BEGIN
  IF p_window_start > p_day THEN RAISE EXCEPTION 'window starts after the day'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_subject || '|' || p_kind, 0));
  SELECT coalesce(sum(u.count), 0) INTO v_used FROM public.intelligence_usage u
   WHERE u.subject = p_subject AND u.kind = p_kind AND u.day BETWEEN p_window_start AND p_day;
  IF v_used >= greatest(p_limit, 0) THEN
    RETURN QUERY SELECT false, v_used;
    RETURN;
  END IF;
  INSERT INTO public.intelligence_usage AS t (subject, kind, day, count) VALUES (p_subject, p_kind, p_day, 1)
  ON CONFLICT (subject, kind, day) DO UPDATE SET count = t.count + 1, updated_at = now();
  RETURN QUERY SELECT true, v_used + 1;
END $$;

-- Reads the count without taking a use (for showing what is left).
CREATE OR REPLACE FUNCTION public.intelligence_used(
  p_subject text, p_kind text, p_day date, p_window_start date
) RETURNS integer
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT coalesce(sum(count), 0)::integer FROM public.intelligence_usage
   WHERE subject = p_subject AND kind = p_kind AND day BETWEEN p_window_start AND p_day;
$$;

CREATE OR REPLACE FUNCTION public.intelligence_usage_purge() RETURNS integer
LANGUAGE sql
SET search_path = public
AS $$
  WITH d AS (DELETE FROM public.intelligence_usage WHERE day < current_date - 400 RETURNING 1)
  SELECT count(*)::integer FROM d;
$$;

REVOKE ALL ON FUNCTION public.intelligence_take(text, text, date, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.intelligence_used(text, text, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.intelligence_usage_purge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.intelligence_take(text, text, date, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.intelligence_used(text, text, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.intelligence_usage_purge() TO service_role;

COMMIT;
