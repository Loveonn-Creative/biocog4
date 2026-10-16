-- Applied through Lovable (drizzle). Source: supabase/pending-migrations/20261026100000_financial_documents.sql
-- Rollback: supabase/pending-migrations/rollback/20261026100000_financial_documents.rollback.sql
-- =============================================
-- Financial documents kept for financial modelling,
-- risk management and climate finance (owner approval, October 2026).
-- Rollback: rollback/20261026100000_financial_documents.rollback.sql
--
-- Income tax returns, bank statements and financial statements uploaded to the
-- invoice reader are no longer rejected. extract-document (service role)
-- stores the file in a private bucket and keeps only the allow-listed figures
-- (supabase/functions/_shared/financeApplication.ts: turnover, profit,
-- repayments...; no names, PAN, account numbers or transactions).
-- No browser access at all: RLS on with no policies, no grants to anon or
-- authenticated, and no storage.objects policy on the bucket. The team reads
-- the figures server-side; files are never returned to a browser.
-- =============================================

CREATE TABLE public.financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  doc_kind text NOT NULL CHECK (doc_kind IN ('itr', 'bank_statement', 'financial_statement')),
  storage_path text NOT NULL UNIQUE,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  -- Allow-listed figures only (cleanFigures); never free text from the file.
  figures jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(figures) = 'object'),
  figures_read_at timestamptz,
  source text NOT NULL DEFAULT 'invoice_reader',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sha256)
);
CREATE INDEX financial_documents_user_idx ON public.financial_documents (user_id, created_at DESC);

ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.financial_documents FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.financial_documents TO service_role;

COMMENT ON TABLE public.financial_documents IS 'ITRs, bank statements and financial statements from the invoice reader. Server only: allow-listed figures for financial modelling, risk and climate finance. Never shown on any page or returned to a browser.';

-- Private bucket: no storage.objects policy, so only the service role reaches it.
-- Bucket financial-documents (private, 15 MB) is created with the storage tool, not SQL.
