-- =============================================
-- PENDING (NOT APPLIED). Customer stories: submissions, review, publication.
-- Rollback: rollback/20261029100000_customer_stories.rollback.sql
--
-- story-submit (service role) stores each submission with the exact story
-- text the person approved, its SHA-256, and their consent record (version,
-- text hash, time). story-review (admins only, checked server-side)
-- publishes, rejects or unpublishes. The table is server only: RLS on, no
-- policies, no browser grants; contact details never leave it.
--
-- Public reading goes through the case_studies_public view: published rows
-- only, and only the columns a story page needs (no email, no IP hash, no
-- answers). Withdrawn stories disappear from the view at once; their content
-- is erased after 30 days and only the consent record is kept (3 years).
-- =============================================
BEGIN;

CREATE TABLE public.story_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'private', 'published', 'rejected', 'withdrawn')),
  slug text UNIQUE CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+){1,12}$'),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email text CHECK (contact_email IS NULL OR (contact_email = lower(contact_email) AND length(contact_email) BETWEEN 6 AND 254)),
  buyer text NOT NULL CHECK (buyer IN ('msme', 'enterprise', 'finance', 'lender', 'importer')),
  industry text NOT NULL,
  attribution text NOT NULL CHECK (attribution IN ('named', 'company', 'anonymous')),
  answers jsonb CHECK (answers IS NULL OR jsonb_typeof(answers) = 'object'),
  account_figures jsonb CHECK (account_figures IS NULL OR jsonb_typeof(account_figures) = 'object'),
  story jsonb CHECK (story IS NULL OR jsonb_typeof(story) = 'object'),
  story_hash text CHECK (story_hash IS NULL OR story_hash ~ '^[0-9a-f]{64}$'),
  publish_consent boolean NOT NULL DEFAULT false,
  consent_version text NOT NULL,
  consent_text_hash text NOT NULL CHECK (consent_text_hash ~ '^[0-9a-f]{64}$'),
  consented_at timestamptz NOT NULL DEFAULT now(),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text CHECK (review_note IS NULL OR length(review_note) <= 1000),
  -- Removals made at review (e.g. a quote or a number taken out); never additions.
  review_removals jsonb CHECK (review_removals IS NULL OR jsonb_typeof(review_removals) = 'array'),
  published_at timestamptz,
  withdrawn_at timestamptz,
  erase_after timestamptz,
  request_ip_hash text CHECK (request_ip_hash IS NULL OR request_ip_hash ~ '^[0-9a-f]{64}$'),
  notify_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'published' OR (publish_consent AND slug IS NOT NULL AND story IS NOT NULL AND published_at IS NOT NULL)),
  CHECK (status <> 'withdrawn' OR withdrawn_at IS NOT NULL)
);
CREATE INDEX story_submissions_status_idx ON public.story_submissions (status, created_at DESC);
CREATE INDEX story_submissions_ip_idx ON public.story_submissions (request_ip_hash, created_at);

ALTER TABLE public.story_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_submissions TO service_role;

-- Published stories, safe columns only. The view runs as its owner, so it
-- reads the private table without exposing it.
CREATE VIEW public.case_studies_public
WITH (security_barrier = true) AS
  SELECT slug, buyer, industry, story, published_at
  FROM public.story_submissions
  WHERE status = 'published' AND publish_consent AND slug IS NOT NULL AND story IS NOT NULL;

REVOKE ALL ON public.case_studies_public FROM PUBLIC;
GRANT SELECT ON public.case_studies_public TO anon, authenticated, service_role;

COMMIT;
