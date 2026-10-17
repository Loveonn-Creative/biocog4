-- Removes the invoice reads ledger, credit packs and service orders. Refuses
-- while any paid pack or service order exists, so a rollback never erases a
-- record of a payment.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.invoice_credit_packs WHERE status <> 'pending')
     OR EXISTS (SELECT 1 FROM public.service_orders WHERE status <> 'pending') THEN
    RAISE EXCEPTION 'paid credit packs or service orders exist; export them before rolling back';
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.release_invoice_read(uuid);
DROP FUNCTION IF EXISTS public.commit_invoice_read(uuid, uuid);
DROP FUNCTION IF EXISTS public.reserve_invoice_read(uuid, uuid, text, integer, integer, timestamptz, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.invoice_pack_usable_until(public.invoice_credit_packs, timestamptz);
DROP TABLE IF EXISTS public.service_orders;
DROP TABLE IF EXISTS public.invoice_reads;
DROP TABLE IF EXISTS public.invoice_credit_packs;
DROP TABLE IF EXISTS public.invoice_read_counting;
DROP TABLE IF EXISTS public.invoice_read_settings;
