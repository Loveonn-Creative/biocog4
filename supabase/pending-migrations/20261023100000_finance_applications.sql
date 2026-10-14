-- =============================================
-- PENDING (NOT APPLIED). Sustainable-finance applications (green loans first).
-- Rollback: rollback/20261023100000_finance_applications.rollback.sql
--
-- New tables and one private storage bucket; nothing existing is touched.
-- Only the finance-application edge function (service role) writes. Owners
-- can read their own applications, status timeline and document list (not
-- the files and not the internal review). Built so a government-grant,
-- tender or contract journey can be added as another `kind` later.
-- Documents (ITR, bank statements, financial statements) live in the private
-- finance-documents bucket, with no browser access, 2 MB per file, PDF/JPEG/PNG.
-- =============================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.finance_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  kind text NOT NULL CHECK (kind IN ('green_loan')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'needs_information', 'shared_with_partner', 'closed')),
  application jsonb NOT NULL,
  carbon_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_version text NOT NULL CHECK (char_length(consent_version) BETWEEN 3 AND 40),
  consented_at timestamptz NOT NULL,
  submitted_at timestamptz,
  update_window_from date,
  update_window_to date,
  retain_until timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'draft') = (submitted_at IS NULL)),
  CHECK (update_window_from IS NULL OR update_window_to >= update_window_from)
);
-- One open draft per applicant and kind.
CREATE UNIQUE INDEX IF NOT EXISTS finance_applications_one_draft ON public.finance_applications (user_id, kind) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS finance_applications_user_idx ON public.finance_applications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.finance_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'submitted', 'under_review', 'needs_information', 'shared_with_partner', 'closed')),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_application_events_app_idx ON public.finance_application_events (application_id, created_at);

CREATE TABLE IF NOT EXISTS public.finance_application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('itr', 'bank_statement', 'financial_statement', 'project_quote')),
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 120),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 2097152),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text NOT NULL UNIQUE,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  retain_until timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  UNIQUE (application_id, sha256)
);

-- Internal review: figures read from documents, the indicative summary, email
-- delivery. Senseible team only; no browser access at all.
CREATE TABLE IF NOT EXISTS public.finance_application_reviews (
  application_id uuid PRIMARY KEY REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  figures jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_status text NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The timeline is append-only, even for the service role.
CREATE OR REPLACE FUNCTION public.finance_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.finance_applications WHERE id = OLD.application_id) THEN
    RETURN OLD; -- cascade from a deleted application (erasure request)
  END IF;
  RAISE EXCEPTION 'Application timeline entries cannot be changed or removed' USING ERRCODE = '42501';
END $$;
DROP TRIGGER IF EXISTS finance_events_append_only ON public.finance_application_events;
CREATE TRIGGER finance_events_append_only BEFORE UPDATE OR DELETE ON public.finance_application_events
  FOR EACH ROW EXECUTE FUNCTION public.finance_events_append_only();

ALTER TABLE public.finance_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_application_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.finance_applications, public.finance_application_events, public.finance_application_documents, public.finance_application_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.finance_applications, public.finance_application_events, public.finance_application_documents TO authenticated;
GRANT ALL ON public.finance_applications, public.finance_application_events, public.finance_application_documents, public.finance_application_reviews TO service_role;

CREATE POLICY "Owners read their finance applications" ON public.finance_applications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners read their application timeline" ON public.finance_application_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners read their document list" ON public.finance_application_documents FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Private bucket: no storage.objects policy, so only the service role reaches it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('finance-documents', 'finance-documents', false, 2097152, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.finance_applications IS 'Sustainable-finance applications (green loans). Written only by the finance-application edge function. Senseible does not approve, provide or disburse financing.';
COMMENT ON TABLE public.finance_application_reviews IS 'Internal, indicative review of an application. Senseible team only; never shown to applicants; not a credit decision.';

COMMIT;
