-- Rollback for 20261102100000_finance_insights. Removes the functions and the
-- monthly column; stored files and summary figures are untouched.
DROP FUNCTION IF EXISTS public.my_finance_insights();
DROP FUNCTION IF EXISTS public.my_private_records();
DROP FUNCTION IF EXISTS public.finance_insights_plan(uuid);
ALTER TABLE public.financial_documents DROP CONSTRAINT IF EXISTS financial_documents_monthly_array;
ALTER TABLE public.financial_documents DROP COLUMN IF EXISTS monthly;
COMMENT ON TABLE public.financial_documents IS 'ITRs, bank statements and financial statements from the invoice reader. Server only: allow-listed figures for financial modelling, risk and climate finance. Never shown on any page or returned to a browser.';
