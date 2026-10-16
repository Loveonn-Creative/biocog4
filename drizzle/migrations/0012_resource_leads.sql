-- Applied through Lovable (drizzle). Source: supabase/pending-migrations/20261028100000_resource_leads.sql
-- Rollback: supabase/pending-migrations/rollback/20261028100000_resource_leads.rollback.sql
-- =============================================
-- PENDING (NOT APPLIED). Leads for gated resources (the sample ESG report).
-- Rollback: rollback/20261028100000_resource_leads.rollback.sql
--
-- esg-report-access (service role) stores one row per person per resource:
-- the six form answers, the version of the notice they saw, optional
-- marketing consent, and how the report was delivered and used. Server only:
-- RLS on with no policies and no grants to anon or authenticated, so no
-- browser can read or write a lead. IP addresses are kept only as a salted
-- hash for rate limiting. Rows expire (expires_at) 90 days after the last
-- request for visitors, inside the Privacy Policy's three months for
-- unauthenticated data, and 18 months for signed-in accounts; the function
-- deletes expired rows on each request. Also creates the private
-- gated-resources bucket the report PDF is served from.
-- =============================================

CREATE TABLE public.resource_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL CHECK (resource ~ '^[a-z0-9-]{3,64}$'),
  email text NOT NULL CHECK (email = lower(email) AND length(email) BETWEEN 6 AND 254),
  -- SHA-256 of the email: the private download link carries this, never the address.
  email_hash text NOT NULL CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  name text CHECK (name IS NULL OR length(name) BETWEEN 2 AND 80),
  company text CHECK (company IS NULL OR length(company) BETWEEN 2 AND 120),
  industry text,
  role text,
  primary_need text,
  source text NOT NULL CHECK (source IN ('form', 'account')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  free_mailbox boolean NOT NULL DEFAULT false,
  mx_status text NOT NULL DEFAULT 'unknown' CHECK (mx_status IN ('ok', 'unknown', 'account')),
  marketing_consent boolean NOT NULL DEFAULT false,
  notice_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  send_count integer NOT NULL DEFAULT 0 CHECK (send_count >= 0),
  send_day date,
  sends_on_day integer NOT NULL DEFAULT 0 CHECK (sends_on_day >= 0),
  last_sent_at timestamptz,
  delivery_status text CHECK (delivery_status IS NULL OR delivery_status IN ('sent', 'suppressed', 'failed', 'direct')),
  notify_status text CHECK (notify_status IS NULL OR notify_status IN ('sent', 'fallback', 'failed')),
  downloads integer NOT NULL DEFAULT 0 CHECK (downloads >= 0),
  verified_at timestamptz,
  first_downloaded_at timestamptz,
  last_downloaded_at timestamptz,
  request_ip_hash text CHECK (request_ip_hash IS NULL OR request_ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days',
  UNIQUE (resource, email),
  UNIQUE (resource, email_hash),
  CHECK (source = 'account' OR (name IS NOT NULL AND company IS NOT NULL AND industry IS NOT NULL AND role IS NOT NULL AND primary_need IS NOT NULL))
);
CREATE INDEX resource_leads_ip_idx ON public.resource_leads (request_ip_hash, updated_at);
CREATE INDEX resource_leads_expiry_idx ON public.resource_leads (expires_at);

ALTER TABLE public.resource_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.resource_leads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_leads TO service_role;

-- Private bucket for the gated files themselves (the report PDF is uploaded
-- here once by the team; the repository is public, so it never goes in code).
-- No storage.objects policy, so only the service role can read it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gated-resources', 'gated-resources', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

