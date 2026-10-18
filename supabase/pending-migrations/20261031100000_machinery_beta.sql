-- =============================================
-- PENDING (NOT APPLIED). Machinery beta (test only).
-- Rollback: rollback/20261031100000_machinery_beta.rollback.sql
--
-- A signed-in user adds a machine's details with live location on, a
-- geo-tagged photo of the machine taken now, and a voice description. The
-- machinery-beta edge function (service role) repeats the location and photo
-- checks and is the only writer. Purely additive: no existing table, policy or
-- function changes, and these rows never enter emission totals.
--
-- Every entry is Unverified. status and verification_source are pinned by
-- CHECK constraints, so nothing can mark an entry verified until a later,
-- reviewed migration adds document or IoT/sensor/live-feed matching.
-- Owners can read only their own rows; photos sit in a private bucket with no
-- storage policy, so only the service role reaches them.
-- =============================================
BEGIN;

CREATE TABLE public.machinery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_type text NOT NULL CHECK (char_length(machine_type) BETWEEN 2 AND 80),
  make_model text NOT NULL DEFAULT '' CHECK (char_length(make_model) <= 120),
  rated_power numeric CHECK (rated_power > 0 AND rated_power < 100000),
  power_unit text CHECK (power_unit IN ('kW', 'HP', 'kVA', 'TR')),
  fuel text CHECK (fuel IN ('electricity', 'diesel', 'petrol', 'lpg', 'png', 'cng', 'furnace_oil', 'coal', 'biomass', 'other')),
  hours_per_day numeric CHECK (hours_per_day BETWEEN 0 AND 24),
  voice_transcript text NOT NULL CHECK (char_length(voice_transcript) BETWEEN 3 AND 1000),
  photo_path text NOT NULL UNIQUE,
  photo_sha256 text NOT NULL CHECK (photo_sha256 ~ '^[0-9a-f]{64}$'),
  photo_taken_at timestamptz NOT NULL,
  photo_lat double precision NOT NULL CHECK (photo_lat BETWEEN -90 AND 90),
  photo_lng double precision NOT NULL CHECK (photo_lng BETWEEN -180 AND 180),
  live_lat double precision NOT NULL CHECK (live_lat BETWEEN -90 AND 90),
  live_lng double precision NOT NULL CHECK (live_lng BETWEEN -180 AND 180),
  live_accuracy_m numeric NOT NULL CHECK (live_accuracy_m > 0),
  live_at timestamptz NOT NULL,
  distance_m numeric NOT NULL CHECK (distance_m >= 0),
  geo_source text NOT NULL CHECK (geo_source IN ('photo_exif', 'app_capture')),
  status text NOT NULL DEFAULT 'unverified' CHECK (status = 'unverified'),
  verification_source text CHECK (verification_source IS NULL),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((rated_power IS NULL) = (power_unit IS NULL)),
  UNIQUE (user_id, photo_sha256)
);
CREATE INDEX machinery_entries_user_idx ON public.machinery_entries (user_id, created_at DESC);

ALTER TABLE public.machinery_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.machinery_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.machinery_entries TO authenticated;
GRANT ALL ON public.machinery_entries TO service_role;
CREATE POLICY machinery_entries_owner_read ON public.machinery_entries
  FOR SELECT TO authenticated USING (user_id = auth.uid());

COMMENT ON TABLE public.machinery_entries IS 'Machinery beta (test only): machine details with geo-tagged photo, live location and voice description. Always unverified; written only by the machinery-beta function; never part of emission totals.';

-- Private bucket: no storage.objects policy, so only the service role reaches it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('machinery-photos', 'machinery-photos', false, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

COMMIT;
