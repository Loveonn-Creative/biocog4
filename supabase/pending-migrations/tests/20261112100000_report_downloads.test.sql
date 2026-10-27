-- Behaviour tests for 20261112100000_report_downloads. Run by run_report_downloads.sh
-- after 20261024100000_intelligence_usage and this migration are applied.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.ok(label text, cond boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'ok %', label; END $$;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000c1', 'a@example.test'),
  ('00000000-0000-4000-8000-0000000000c2', 'b@example.test');

SET ROLE service_role;
DO $$
DECLARE r record; u uuid := '00000000-0000-4000-8000-0000000000c1';
  k1 text := 'GHG_PROTOCOL:2026-04-01:2026-09-30:pdf';
BEGIN
  SELECT * INTO r FROM public.report_download_take(u, k1, '2026-10-05', '2026-10-01', 1);
  PERFORM pg_temp.ok('first download of the month is allowed and counted', r.allowed AND r.used = 1 AND NOT r.repeat);
  SELECT * INTO r FROM public.report_download_take(u, k1, '2026-10-05', '2026-10-01', 1);
  PERFORM pg_temp.ok('the same report again is allowed as a repeat, not counted', r.allowed AND r.used = 1 AND r.repeat);
  SELECT * INTO r FROM public.report_download_take(u, k1, '2026-10-28', '2026-10-01', 1);
  PERFORM pg_temp.ok('a repeat later in the month is still not counted', r.allowed AND r.used = 1 AND r.repeat);
  SELECT * INTO r FROM public.report_download_take(u, 'GHG_PROTOCOL:2026-04-01:2026-09-30:xlsx', '2026-10-06', '2026-10-01', 1);
  PERFORM pg_temp.ok('the Excel copy is a different download and is refused at the limit', NOT r.allowed AND r.used = 1);
  SELECT * INTO r FROM public.report_download_take(u, 'CERTIFICATE:2026-04-01:2026-09-30:pdf', '2026-10-06', '2026-10-01', 1);
  PERFORM pg_temp.ok('the certificate counts like any report', NOT r.allowed);
  PERFORM pg_temp.ok('a refused download leaves no key', (SELECT count(*) FROM public.report_downloads WHERE user_id = u) = 1);
  PERFORM pg_temp.ok('a refused download is not counted',
    public.intelligence_used('u:' || u::text, 'report_download', '2026-10-31', '2026-10-01') = 1);
  SELECT * INTO r FROM public.report_download_take(u, 'GHG_PROTOCOL:2026-04-01:2026-09-30:xlsx', '2026-11-01', '2026-11-01', 1);
  PERFORM pg_temp.ok('a new month gives a new download', r.allowed AND r.used = 1 AND NOT r.repeat);
  SELECT * INTO r FROM public.report_download_take(u, k1, '2026-11-02', '2026-11-01', 1);
  PERFORM pg_temp.ok('last month''s key does not carry over', NOT r.allowed);
  SELECT * INTO r FROM public.report_download_take('00000000-0000-4000-8000-0000000000c2', k1, '2026-10-05', '2026-10-01', 1);
  PERFORM pg_temp.ok('each account has its own allowance', r.allowed AND r.used = 1);
  SELECT * INTO r FROM public.report_download_take(u, 'BRSR:none:none:pdf', '2026-12-03', '2026-12-01', 3);
  PERFORM pg_temp.ok('a larger limit allows more than one', r.allowed AND r.used = 1);
  PERFORM pg_temp.ok('questions are counted apart from downloads',
    public.intelligence_used('u:' || u::text, 'message', '2026-10-31', '2026-10-01') = 0);
END $$;
DO $$ BEGIN
  PERFORM public.report_download_take('00000000-0000-4000-8000-0000000000c1', 'ghg; drop table x', '2027-01-05', '2027-01-01', 1);
  RAISE EXCEPTION 'FAIL: free-form key stored';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok only well-formed report keys are stored'; END $$;
DO $$ BEGIN
  PERFORM public.report_download_take('00000000-0000-4000-8000-0000000000c1', 'BRSR:none:none:pdf', '2026-10-05', '2026-10-06', 1);
  RAISE EXCEPTION 'FAIL: window after day';
EXCEPTION WHEN raise_exception THEN RAISE NOTICE 'ok a window starting after the day is refused'; END $$;
DO $$ BEGIN
  PERFORM public.intelligence_take('u:00000000-0000-4000-8000-0000000000c1', 'other', '2026-10-14', '2026-10-14', 5);
  RAISE EXCEPTION 'FAIL: unknown kind';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok unknown kinds are still refused'; END $$;
DO $$ BEGIN
  INSERT INTO public.report_downloads (user_id, month, report_key) VALUES ('00000000-0000-4000-8000-0000000000c2', date_trunc('month', current_date - 450)::date, 'BRSR:none:none:pdf');
  PERFORM pg_temp.ok('purge removes keys older than 400 days', public.report_downloads_purge() = 1);
END $$;
RESET ROLE;

DO $$ BEGIN
  DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-0000000000c2';
  PERFORM pg_temp.ok('deleting an account removes its keys', NOT EXISTS (SELECT 1 FROM public.report_downloads WHERE user_id = '00000000-0000-4000-8000-0000000000c2'));
END $$;

SET ROLE authenticated;
DO $$ BEGIN PERFORM 1 FROM public.report_downloads; RAISE EXCEPTION 'FAIL: browser read';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok signed-in browsers cannot read download keys'; END $$;
DO $$ BEGIN PERFORM public.report_download_take('00000000-0000-4000-8000-0000000000c1', 'BRSR:none:none:pdf', '2026-10-05', '2026-10-01', 1000); RAISE EXCEPTION 'FAIL: browser take';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok signed-in browsers cannot take or reset downloads'; END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN PERFORM 1 FROM public.report_downloads; RAISE EXCEPTION 'FAIL: anon read';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok anonymous visitors have no access'; END $$;
RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'ALL REPORT DOWNLOAD TESTS PASSED'; END $$;
