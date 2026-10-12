-- Behaviour tests for 20261014100000_ambassador_applications.sql.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.expect_fail(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE = 'XX000' THEN RAISE; END IF;
  RAISE NOTICE 'ok rejected: %', p_label;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO anon, authenticated;

INSERT INTO public.ambassador_applications (name, email, whatsapp, city, lanes, commitment, first_move, confirmations, request_ip_hash)
VALUES ('Asha', 'asha@example.in', '+917700000000', 'Tiruppur', ARRAY['content','msme_talks'], 'full_90', repeat('a', 90), '{}', 'h1');
SELECT pg_temp.expect_fail($q$INSERT INTO public.ambassador_applications (name, email, city, lanes, commitment, first_move, confirmations, request_ip_hash)
  VALUES ('Asha 2', 'ASHA@example.in', 'Pune', ARRAY['content','design'], 'full_90', repeat('b', 90), '{}', 'h2')$q$, 'one application per email (case-insensitive)');
SELECT pg_temp.expect_fail($q$INSERT INTO public.ambassador_applications (name, email, city, lanes, commitment, first_move, confirmations, request_ip_hash)
  VALUES ('Ravi', 'ravi@example.in', 'Pune', ARRAY['content'], 'full_90', repeat('b', 90), '{}', 'h2')$q$, 'at least two lanes');
SELECT pg_temp.expect_fail($q$INSERT INTO public.ambassador_applications (name, email, city, lanes, commitment, first_move, confirmations, request_ip_hash)
  VALUES ('Ravi', 'ravi@example.in', 'Pune', ARRAY['content','hacking'], 'full_90', repeat('b', 90), '{}', 'h2')$q$, 'only known lanes');
SELECT pg_temp.expect_fail($q$INSERT INTO public.ambassador_applications (name, email, city, lanes, commitment, first_move, confirmations, request_ip_hash)
  VALUES ('Ravi', 'ravi@example.in', 'Pune', ARRAY['content','design'], 'full_90', 'too short', '{}', 'h2')$q$, 'first move needs 80 characters');

SET ROLE anon;
SELECT pg_temp.expect_fail($q$SELECT * FROM public.ambassador_applications$q$, 'anon cannot read');
SELECT pg_temp.expect_fail($q$INSERT INTO public.ambassador_applications (name, email, city, lanes, commitment, first_move, confirmations, request_ip_hash)
  VALUES ('Spam', 'spam@example.in', 'X city', ARRAY['content','design'], 'full_90', repeat('c', 90), '{}', 'h3')$q$, 'anon cannot insert');
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.expect_fail($q$SELECT * FROM public.ambassador_applications$q$, 'signed-in users cannot read');
RESET ROLE;
SELECT 'ALL AMBASSADOR TESTS PASSED' AS result;
