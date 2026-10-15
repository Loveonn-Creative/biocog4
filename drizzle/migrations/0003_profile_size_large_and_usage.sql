ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_size_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_size_check CHECK (size IN ('micro', 'small', 'medium', 'large'));

CREATE TABLE IF NOT EXISTS public.intelligence_usage (
  subject text NOT NULL CHECK (subject ~ '^(u:[0-9a-f-]{36}|g:[0-9a-f]{32})$'),
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('message', 'voice_session', 'guest_scan')),
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject, kind, day)
);
REVOKE ALL ON public.intelligence_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.intelligence_usage TO service_role;
ALTER TABLE public.intelligence_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.intelligence_take(
  p_subject text, p_kind text, p_day date, p_window_start date, p_limit integer
) RETURNS TABLE (allowed boolean, used integer)
LANGUAGE plpgsql SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.intelligence_used(
  p_subject text, p_kind text, p_day date, p_window_start date
) RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(sum(count), 0)::integer FROM public.intelligence_usage
   WHERE subject = p_subject AND kind = p_kind AND day BETWEEN p_window_start AND p_day;
$$;

CREATE OR REPLACE FUNCTION public.intelligence_usage_purge() RETURNS integer
LANGUAGE sql SET search_path = public AS $$
  WITH d AS (DELETE FROM public.intelligence_usage WHERE day < current_date - 400 RETURNING 1)
  SELECT count(*)::integer FROM d;
$$;

REVOKE ALL ON FUNCTION public.intelligence_take(text, text, date, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.intelligence_used(text, text, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.intelligence_usage_purge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.intelligence_take(text, text, date, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.intelligence_used(text, text, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.intelligence_usage_purge() TO service_role;

CREATE TABLE IF NOT EXISTS public.ambassador_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254),
  whatsapp text CHECK (whatsapp IS NULL OR whatsapp ~ '^\+?[0-9]{8,15}$'),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 80),
  lanes text[] NOT NULL CHECK (
    cardinality(lanes) BETWEEN 2 AND 3
    AND lanes <@ ARRAY['content','design','on_ground','msme_talks','esg_interviews','code','creative']::text[]
  ),
  commitment text NOT NULL CHECK (commitment IN ('full_90', 'shorter', 'two_phases')),
  first_move text NOT NULL CHECK (char_length(first_move) BETWEEN 80 AND 1200),
  work_link text CHECK (work_link IS NULL OR char_length(work_link) <= 300),
  confirmations jsonb NOT NULL,
  request_ip_hash text NOT NULL,
  email_status text NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'suppressed', 'failed')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'interview', 'accepted', 'declined', 'withdrawn'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ambassador_applications_email_key ON public.ambassador_applications (lower(email));
CREATE INDEX IF NOT EXISTS ambassador_applications_ip_time_idx ON public.ambassador_applications (request_ip_hash, created_at);
REVOKE ALL ON public.ambassador_applications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ambassador_applications TO service_role;
ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;