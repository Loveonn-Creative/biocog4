-- Rollback for 20261111100000_email_preferences_and_log.sql.
-- Removes the two tables it added. Nothing else is touched.
DROP TABLE IF EXISTS public.email_log;
DROP TABLE IF EXISTS public.email_preferences;
