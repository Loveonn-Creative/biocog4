-- Behaviour tests for 20261029100000_customer_stories.sql (run after it).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;

SET ROLE service_role;
INSERT INTO public.story_submissions (id, buyer, industry, attribution, contact_email, answers, story, story_hash, publish_consent, consent_version, consent_text_hash, request_ip_hash)
VALUES ('00000000-0000-4000-8000-00000000a001', 'msme', 'textiles', 'anonymous', 'asha@acme.in', '{"pains":["buyer_asked"]}', '{"hook":"A buyer asked"}', repeat('a', 64), true, 'story-2026-10', repeat('b', 64), repeat('c', 64)),
       ('00000000-0000-4000-8000-00000000a002', 'lender', 'banking', 'company', 'r@bank.in', '{}', '{"hook":"Loans"}', repeat('a', 64), false, 'story-2026-10', repeat('b', 64), NULL);
RESET ROLE;
SELECT pg_temp.check((SELECT count(*) = 2 FROM public.story_submissions WHERE status = 'submitted'), 'the edge function stores submissions');
SELECT pg_temp.check((SELECT count(*) = 0 FROM public.case_studies_public), 'nothing is public before review');
SELECT pg_temp.expect_error($q$UPDATE public.story_submissions SET status = 'published' WHERE id = '00000000-0000-4000-8000-00000000a001'$q$, 'publishing needs a slug and a date');
SELECT pg_temp.expect_error($q$UPDATE public.story_submissions SET status = 'published', slug = 'loans-x1', published_at = now() WHERE id = '00000000-0000-4000-8000-00000000a002'$q$, 'a story without publish consent can never be published');
UPDATE public.story_submissions SET status = 'published', slug = 'textiles-buyer-asked-carbon-data-a1b2c3', published_at = now() WHERE id = '00000000-0000-4000-8000-00000000a001';
SET ROLE anon;
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.case_studies_public), 'anonymous visitors see the published story');
SELECT pg_temp.check((SELECT story->>'hook' = 'A buyer asked' FROM public.case_studies_public), 'the view carries the approved story');
SELECT pg_temp.expect_error($q$SELECT contact_email FROM public.case_studies_public$q$, 'the view has no contact email');
SELECT pg_temp.expect_error($q$SELECT * FROM public.story_submissions$q$, 'anonymous visitors cannot read submissions');
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT * FROM public.story_submissions$q$, 'signed-in browsers cannot read submissions');
SELECT pg_temp.expect_error($q$INSERT INTO public.story_submissions (buyer, industry, attribution, consent_version, consent_text_hash) VALUES ('msme', 'x', 'anonymous', 'v', repeat('b', 64))$q$, 'browsers cannot write submissions');
SELECT pg_temp.expect_error($q$UPDATE public.case_studies_public SET slug = 'x'$q$, 'browsers cannot change published stories');
RESET ROLE;
SELECT pg_temp.check((SELECT relrowsecurity FROM pg_class WHERE relname = 'story_submissions'), 'row level security is on');
SELECT pg_temp.check(NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid WHERE c.relname = 'story_submissions'), 'no policy opens the table');
-- Withdrawal: gone from the view at once.
UPDATE public.story_submissions SET status = 'withdrawn', withdrawn_at = now(), erase_after = now() + interval '30 days' WHERE id = '00000000-0000-4000-8000-00000000a001';
SELECT pg_temp.check((SELECT count(*) = 0 FROM public.case_studies_public), 'a withdrawn story leaves the public view immediately');
SELECT pg_temp.expect_error($q$UPDATE public.story_submissions SET status = 'withdrawn', withdrawn_at = NULL WHERE id = '00000000-0000-4000-8000-00000000a002'$q$, 'withdrawal must be dated');
-- After 30 days the content is erased and the consent record stays.
UPDATE public.story_submissions SET story = NULL, answers = NULL, account_figures = NULL, contact_email = NULL WHERE id = '00000000-0000-4000-8000-00000000a001';
SELECT pg_temp.check((SELECT story IS NULL AND consent_text_hash IS NOT NULL AND consented_at IS NOT NULL FROM public.story_submissions WHERE id = '00000000-0000-4000-8000-00000000a001'), 'erasing content keeps the consent record');
DO $$ BEGIN RAISE NOTICE 'ALL CUSTOMER STORY TESTS PASSED'; END $$;
