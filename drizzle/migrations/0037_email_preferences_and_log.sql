CREATE TABLE public.email_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  record_tips boolean NOT NULL DEFAULT true,
  supplier_summary boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.email_preferences TO authenticated;
GRANT UPDATE (record_tips, supplier_summary, updated_at) ON public.email_preferences TO authenticated;
GRANT ALL ON public.email_preferences TO service_role;

CREATE POLICY "Own email preferences: read" ON public.email_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own email preferences: create" ON public.email_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own email preferences: change" ON public.email_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind ~ '^[a-z][a-z0-9_]{2,39}$'),
  dedupe_key text NOT NULL UNIQUE CHECK (length(dedupe_key) BETWEEN 10 AND 200),
  provider_id text CHECK (provider_id IS NULL OR length(provider_id) <= 200),
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_log_user_sent_idx ON public.email_log (user_id, sent_at DESC);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_log TO service_role;