-- Rollback for 20261014100000_ambassador_applications.sql.
-- Refuses while applications exist, unless confirmed in the same transaction:
--   BEGIN; SET LOCAL ambassador.rollback_confirm = 'drop applications'; \i this file
-- Export the table first if the applications are needed.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.ambassador_applications') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.ambassador_applications)
     AND coalesce(current_setting('ambassador.rollback_confirm', true), '') <> 'drop applications' THEN
    RAISE EXCEPTION 'ambassador_applications has rows; export them, then confirm with SET LOCAL ambassador.rollback_confirm = ''drop applications''';
  END IF;
END $$;
DROP TABLE IF EXISTS public.ambassador_applications;
COMMIT;
