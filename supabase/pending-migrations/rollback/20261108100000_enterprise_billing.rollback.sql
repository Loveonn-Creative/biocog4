-- Rollback for 20261108100000_enterprise_billing. Restores the enterprise
-- pilot as it was: the supplier limit refuses again, nothing is counted.
-- Refuses while billable usage exists, unless confirmed:
--   SET senseible.confirm_enterprise_billing_rollback = 'yes';
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.enterprise_usage WHERE billable)
     AND coalesce(current_setting('senseible.confirm_enterprise_billing_rollback', true), '') <> 'yes' THEN
    RAISE EXCEPTION 'Billable enterprise usage exists. Export it, then SET senseible.confirm_enterprise_billing_rollback = ''yes'' to roll back.';
  END IF;
END $$;
DROP FUNCTION IF EXISTS private.enterprise_bill(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.my_enterprise_usage();
DROP FUNCTION IF EXISTS public.service_enterprise_cover_reads(uuid, integer);
DROP FUNCTION IF EXISTS public.record_enterprise_download(text);
DROP TRIGGER IF EXISTS supplier_requests_count_reminder ON public.supplier_requests;
DROP FUNCTION IF EXISTS private.count_supplier_reminder();
CREATE OR REPLACE FUNCTION private.check_supplier_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_limit integer; v_open integer;
BEGIN
  -- Serialise inserts per enterprise so concurrent requests cannot pass the limit together.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.enterprise_org_id::text, 0));
  SELECT ea.supplier_limit INTO v_limit FROM public.enterprise_access ea
  WHERE ea.organization_id = NEW.enterprise_org_id AND ea.status = 'active';
  IF v_limit IS NULL THEN RAISE EXCEPTION 'enterprise access is not active' USING ERRCODE = '42501'; END IF;
  SELECT count(*) INTO v_open FROM public.supplier_requests
  WHERE enterprise_org_id = NEW.enterprise_org_id AND status <> 'revoked';
  IF v_open >= v_limit THEN RAISE EXCEPTION 'supplier limit of % reached', v_limit USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
DROP FUNCTION IF EXISTS private.enterprise_rate(text);
DROP FUNCTION IF EXISTS private.enterprise_year_start(uuid);
ALTER TABLE public.supplier_requests DROP COLUMN IF EXISTS reminders_sent;
-- Reads already added stay with the suppliers as ordinary credits.
ALTER TABLE public.invoice_credit_packs DROP COLUMN IF EXISTS funded_by_org;
DROP TABLE IF EXISTS public.enterprise_usage;
DROP TABLE IF EXISTS public.enterprise_rates;
ALTER TABLE public.enterprise_access
  DROP COLUMN IF EXISTS seats_included, DROP COLUMN IF EXISTS reads_per_supplier,
  DROP COLUMN IF EXISTS reports_included, DROP COLUMN IF EXISTS reminders_per_request,
  DROP COLUMN IF EXISTS questions_per_month, DROP COLUMN IF EXISTS contract_start;
COMMIT;
