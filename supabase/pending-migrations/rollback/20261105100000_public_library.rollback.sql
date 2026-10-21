-- Rollback for 20261105100000_public_library.sql: removes the public library
-- tables and functions. Public content only; intelligence-chat falls back to
-- its bundled copy when they are missing.
BEGIN;
DROP FUNCTION IF EXISTS public.search_public_library(text[], integer);
DROP FUNCTION IF EXISTS public.claim_public_library_check(interval);
DROP FUNCTION IF EXISTS public.apply_public_library(text, jsonb);
DROP TABLE IF EXISTS public.public_library_entries;
DROP TABLE IF EXISTS public.public_library_state;
COMMIT;
