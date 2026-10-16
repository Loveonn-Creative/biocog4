-- Applied through Lovable (drizzle). Source: supabase/pending-migrations/20261014100000_ambassador_applications.sql
-- Rollback: supabase/pending-migrations/rollback/20261014100000_ambassador_applications.rollback.sql
-- =============================================
-- PENDING (NOT APPLIED). Decarbonize India: Impact Ambassador applications.
-- Rollback: rollback/20261014100000_ambassador_applications.rollback.sql
--
-- A new, private table. Nothing existing is touched. Only the
-- submit-ambassador-application edge function (service_role) writes here;
-- there are no policies, so browsers can neither read nor write it, and one
-- applicant can never see another's details. One application per email.
-- =============================================

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

ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ambassador_applications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ambassador_applications TO service_role;

COMMENT ON TABLE public.ambassador_applications IS
  'Decarbonize India Impact Ambassador applications. Written only by the submit-ambassador-application edge function; no client access.';

