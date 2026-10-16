-- Rollback for 20261029100000_customer_stories.sql: removes the public view,
-- the table and every submission and consent record in it.
BEGIN;
DROP VIEW IF EXISTS public.case_studies_public;
DROP TABLE IF EXISTS public.story_submissions;
COMMIT;
