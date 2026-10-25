-- Rollback for 20261107100000_enterprise_pilot.sql.
-- Refuses while suppliers have shared anything, so audit records are never
-- dropped by accident. To roll back anyway, run first in the same session:
--   SET senseible.confirm_enterprise_rollback = 'yes';
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.supplier_snapshots)
     AND coalesce(current_setting('senseible.confirm_enterprise_rollback', true), '') <> 'yes' THEN
    RAISE EXCEPTION 'suppliers have shared data; set senseible.confirm_enterprise_rollback = yes to drop it';
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.withdraw_supplier_consent(uuid);
DROP FUNCTION IF EXISTS public.share_with_enterprise(uuid, text, text, numeric, text);
DROP TABLE IF EXISTS public.supplier_snapshots;
DROP TABLE IF EXISTS public.supplier_consents;
DROP FUNCTION IF EXISTS public.accept_supplier_request(uuid, text);
DROP FUNCTION IF EXISTS public.my_supplier_requests();
DROP FUNCTION IF EXISTS private.request_matches_caller(public.supplier_requests);
DROP FUNCTION IF EXISTS public.supplier_request_preview(text);
DROP FUNCTION IF EXISTS public.cancel_supplier_request(uuid);
DROP FUNCTION IF EXISTS public.service_reissue_supplier_link(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.service_create_supplier_request(uuid, uuid, text, text, text, text, date, date, integer, numeric, smallint);
DROP TRIGGER IF EXISTS supplier_requests_limit ON public.supplier_requests;
DROP FUNCTION IF EXISTS private.check_supplier_limit();
DROP TABLE IF EXISTS public.supplier_requests;
DROP FUNCTION IF EXISTS public.my_enterprise();
DROP FUNCTION IF EXISTS public.claim_enterprise_access();
DROP FUNCTION IF EXISTS private.revoke_enterprise_access(text);
DROP FUNCTION IF EXISTS private.grant_enterprise_access(text, text, integer, text);
DROP FUNCTION IF EXISTS private.enterprise_can_ask(uuid, uuid);
DROP FUNCTION IF EXISTS private.is_enterprise_member(uuid);
DROP TABLE IF EXISTS public.enterprise_access;
COMMIT;
