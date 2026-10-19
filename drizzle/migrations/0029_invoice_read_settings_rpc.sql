CREATE OR REPLACE FUNCTION public.invoice_ledger_started_at()
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$ SELECT ledger_started_at FROM public.invoice_read_settings WHERE id $$;
REVOKE ALL ON FUNCTION public.invoice_ledger_started_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invoice_ledger_started_at() TO authenticated, service_role;
DROP POLICY IF EXISTS invoice_read_settings_read ON public.invoice_read_settings;
REVOKE SELECT ON public.invoice_read_settings FROM authenticated;