-- Behaviour tests for 20261031100000_machinery_beta.sql (run after it).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-00000000aa01', 'owner@x.in'), ('00000000-0000-4000-8000-00000000bb02', 'other@x.in');

-- One valid row; each test below changes one column.
CREATE TEMP TABLE good AS SELECT
  '00000000-0000-4000-8000-00000000aa01'::uuid AS user_id, 'Generator'::text AS machine_type, 'Kirloskar'::text AS make_model,
  125::numeric AS rated_power, 'kVA'::text AS power_unit, 'diesel'::text AS fuel, 6::numeric AS hours_per_day,
  'diesel generator 125 kVA'::text AS voice_transcript, 'u/a.jpg'::text AS photo_path, repeat('a', 64) AS photo_sha256,
  now() AS photo_taken_at, 28.4595::float8 AS photo_lat, 77.0266::float8 AS photo_lng, 28.46::float8 AS live_lat, 77.0266::float8 AS live_lng,
  20::numeric AS live_accuracy_m, now() AS live_at, 56::numeric AS distance_m, 'photo_exif'::text AS geo_source;
GRANT SELECT ON good TO service_role, authenticated;

SET ROLE service_role;
INSERT INTO public.machinery_entries (user_id, machine_type, make_model, rated_power, power_unit, fuel, hours_per_day, voice_transcript, photo_path, photo_sha256, photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source)
SELECT * FROM good;
INSERT INTO public.machinery_entries (user_id, machine_type, make_model, rated_power, power_unit, fuel, hours_per_day, voice_transcript, photo_path, photo_sha256, photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source)
SELECT '00000000-0000-4000-8000-00000000bb02', machine_type, make_model, rated_power, power_unit, fuel, hours_per_day, voice_transcript, 'u/b.jpg', repeat('b', 64), photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, 'app_capture' FROM good;
RESET ROLE;
SELECT pg_temp.check((SELECT count(*) = 2 FROM public.machinery_entries), 'the edge function (service role) stores entries');
SELECT pg_temp.check((SELECT bool_and(status = 'unverified' AND verification_source IS NULL) FROM public.machinery_entries), 'new entries are unverified');

SET ROLE service_role;
SELECT pg_temp.expect_error($q$UPDATE public.machinery_entries SET status = 'verified'$q$, 'nothing can mark an entry verified');
SELECT pg_temp.expect_error($q$UPDATE public.machinery_entries SET verification_source = 'iot'$q$, 'no verification source can be set in the beta');
SELECT pg_temp.expect_error($q$INSERT INTO public.machinery_entries (user_id, machine_type, voice_transcript, photo_path, photo_sha256, photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source, rated_power) SELECT user_id, machine_type, voice_transcript, 'u/c.jpg', repeat('c', 64), photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source, 50 FROM good$q$, 'rated power needs its unit');
SELECT pg_temp.expect_error($q$INSERT INTO public.machinery_entries (user_id, machine_type, voice_transcript, photo_path, photo_sha256, photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source, hours_per_day) SELECT user_id, machine_type, voice_transcript, 'u/d.jpg', repeat('d', 64), photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source, 25 FROM good$q$, 'hours per day cannot exceed 24');
SELECT pg_temp.expect_error($q$INSERT INTO public.machinery_entries (user_id, machine_type, voice_transcript, photo_path, photo_sha256, photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source) SELECT user_id, machine_type, voice_transcript, 'u/e.jpg', repeat('a', 64), photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source FROM good$q$, 'the same photo cannot be saved twice by one user');
SELECT pg_temp.expect_error($q$INSERT INTO public.machinery_entries (user_id, machine_type, voice_transcript, photo_path, photo_sha256, photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source) SELECT user_id, machine_type, voice_transcript, 'u/f.jpg', 'nothex', photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source FROM good$q$, 'the photo hash must be a SHA-256');
SELECT pg_temp.expect_error($q$INSERT INTO public.machinery_entries (user_id, machine_type, voice_transcript, photo_path, photo_sha256, photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source) SELECT user_id, machine_type, voice_transcript, 'u/g.jpg', repeat('e', 64), photo_taken_at, 95, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source FROM good$q$, 'coordinates must be on Earth');
SELECT pg_temp.expect_error($q$INSERT INTO public.machinery_entries (user_id, machine_type, voice_transcript, photo_path, photo_sha256, photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source) SELECT user_id, machine_type, voice_transcript, 'u/h.jpg', repeat('f', 64), photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, 'manual' FROM good$q$, 'the geo source is photo EXIF or in-app capture only');
RESET ROLE;

SELECT pg_temp.check((SELECT relrowsecurity FROM pg_class WHERE relname = 'machinery_entries'), 'row level security is on');
SELECT pg_temp.check(NOT has_table_privilege('anon', 'public.machinery_entries', 'SELECT'), 'anonymous visitors cannot read entries');
SELECT pg_temp.check(NOT has_table_privilege('authenticated', 'public.machinery_entries', 'INSERT') AND NOT has_table_privilege('authenticated', 'public.machinery_entries', 'UPDATE') AND NOT has_table_privilege('authenticated', 'public.machinery_entries', 'DELETE'), 'signed-in browsers cannot write entries');

SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-00000000aa01';
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.machinery_entries), 'an owner sees only their own entry');
SELECT pg_temp.check((SELECT bool_and(user_id = '00000000-0000-4000-8000-00000000aa01') FROM public.machinery_entries), 'the row seen is the owner''s');
SELECT pg_temp.expect_error($q$INSERT INTO public.machinery_entries (user_id, machine_type, voice_transcript, photo_path, photo_sha256, photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source) SELECT user_id, machine_type, voice_transcript, 'u/z.jpg', repeat('9', 64), photo_taken_at, photo_lat, photo_lng, live_lat, live_lng, live_accuracy_m, live_at, distance_m, geo_source FROM good$q$, 'a signed-in session cannot insert');
SELECT pg_temp.expect_error($q$UPDATE public.machinery_entries SET machine_type = 'Boiler'$q$, 'a signed-in session cannot edit');
SET request.jwt.claim.sub = '';
SELECT pg_temp.check((SELECT count(*) = 0 FROM public.machinery_entries), 'a session with no user sees nothing');
RESET ROLE;
RESET request.jwt.claim.sub;
SET ROLE anon;
SELECT pg_temp.expect_error($q$SELECT * FROM public.machinery_entries$q$, 'an anonymous session is refused');
RESET ROLE;

SELECT pg_temp.check((SELECT NOT public AND allowed_mime_types = ARRAY['image/jpeg'] AND file_size_limit = 5242880 FROM storage.buckets WHERE id = 'machinery-photos'), 'the photo bucket is private, JPEG only, 5 MB');
SELECT pg_temp.check(NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid WHERE c.relname = 'objects' AND (pg_get_expr(p.polqual, p.polrelid) ILIKE '%machinery-photos%' OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%machinery-photos%')), 'no storage policy opens the photo bucket');

-- Deleting the account removes its entries.
DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-00000000bb02';
SELECT pg_temp.check((SELECT count(*) = 1 FROM public.machinery_entries), 'entries go with the account');
DO $$ BEGIN RAISE NOTICE 'ALL MACHINERY BETA TESTS PASSED'; END $$;
