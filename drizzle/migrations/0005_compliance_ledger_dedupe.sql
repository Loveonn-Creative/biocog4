LOCK TABLE public.compliance_ledger IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE IF NOT EXISTS public.compliance_ledger_duplicates_backup (LIKE public.compliance_ledger INCLUDING DEFAULTS);
ALTER TABLE public.compliance_ledger_duplicates_backup
  ADD COLUMN IF NOT EXISTS kept_ledger_id uuid,
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT now();
REVOKE ALL ON public.compliance_ledger_duplicates_backup FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.compliance_ledger_duplicates_backup TO service_role;
ALTER TABLE public.compliance_ledger_duplicates_backup ENABLE ROW LEVEL SECURITY;
WITH ranked AS (
  SELECT id, row_number() OVER w AS rn, first_value(id) OVER w AS kept_id
    FROM public.compliance_ledger WHERE emission_id IS NOT NULL
  WINDOW w AS (PARTITION BY user_id, emission_id ORDER BY verified_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC)
)
INSERT INTO public.compliance_ledger_duplicates_backup
SELECT l.*, r.kept_id, now() FROM public.compliance_ledger l JOIN ranked r ON r.id = l.id
 WHERE r.rn > 1 AND NOT EXISTS (SELECT 1 FROM public.compliance_ledger_duplicates_backup b WHERE b.id = l.id);
DELETE FROM public.compliance_ledger l USING public.compliance_ledger_duplicates_backup b WHERE b.id = l.id;
CREATE UNIQUE INDEX IF NOT EXISTS compliance_ledger_user_emission_key ON public.compliance_ledger (user_id, emission_id);
DROP POLICY IF EXISTS "Users can update their own ledger" ON public.compliance_ledger;