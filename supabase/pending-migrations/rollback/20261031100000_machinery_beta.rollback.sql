-- Rollback for 20261031100000_machinery_beta.sql. Refuses while rows or
-- stored photos exist, unless confirmed with:
--   SET LOCAL machinery_beta.rollback_confirm = 'drop machinery entries';
BEGIN;
DO $$
BEGIN
  IF (EXISTS (SELECT 1 FROM public.machinery_entries) OR EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'machinery-photos'))
     AND current_setting('machinery_beta.rollback_confirm', true) IS DISTINCT FROM 'drop machinery entries' THEN
    RAISE EXCEPTION 'machinery_entries holds data; confirm to drop it';
  END IF;
END $$;
DROP TABLE public.machinery_entries;
DELETE FROM storage.buckets WHERE id = 'machinery-photos' AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'machinery-photos');
COMMIT;
