-- Rollback for 20261112100000_report_downloads. Restores the original kind
-- check on intelligence_usage. It refuses while report_download counts exist,
-- because the original check would reject them; delete them first with
--   DELETE FROM public.intelligence_usage WHERE kind = 'report_download';
-- The report-allowance edge function lets every download through once the
-- function is gone.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.intelligence_usage') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.intelligence_usage WHERE kind = 'report_download') THEN
      RAISE EXCEPTION 'report_download counts exist: delete them first (DELETE FROM public.intelligence_usage WHERE kind = ''report_download'')';
    END IF;
    ALTER TABLE public.intelligence_usage DROP CONSTRAINT IF EXISTS intelligence_usage_kind_check;
    ALTER TABLE public.intelligence_usage ADD CONSTRAINT intelligence_usage_kind_check
      CHECK (kind IN ('message', 'voice_session', 'guest_scan'));
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.report_downloads_purge();
DROP FUNCTION IF EXISTS public.report_download_take(uuid, text, date, date, integer);
DROP TABLE IF EXISTS public.report_downloads;
COMMIT;
