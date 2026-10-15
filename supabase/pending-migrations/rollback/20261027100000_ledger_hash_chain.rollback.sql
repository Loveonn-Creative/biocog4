-- Rollback for 20261027100000_ledger_hash_chain.sql.
-- Removes the chain trigger, the event table (and every event in it) and the
-- chain functions. compliance_ledger rows are not touched.
BEGIN;

DROP TRIGGER IF EXISTS compliance_ledger_chain ON public.compliance_ledger;
DROP TABLE IF EXISTS public.ledger_chain_events;
DROP FUNCTION IF EXISTS public.verify_ledger_chain(uuid);
DROP FUNCTION IF EXISTS public.ledger_chain_record();
DROP FUNCTION IF EXISTS public.ledger_chain_append(uuid, text, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.ledger_event_hash(uuid, bigint, text, uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS public.ledger_row_digest(jsonb);
DROP FUNCTION IF EXISTS public.ledger_chain_events_append_only();

COMMIT;
