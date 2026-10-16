-- Applied through Lovable (drizzle). Source: supabase/pending-migrations/20261017100000_solar_signals.sql
-- Rollback: supabase/pending-migrations/rollback/20261017100000_solar_signals.rollback.sql
-- =============================================
-- PENDING (NOT APPLIED). Rooftop solar reduction signals.
-- Rollback: rollback/20261017100000_solar_signals.rollback.sql
--
-- Additive only: four new tables, nothing existing is touched.
-- - grid_emission_factors: sourced grid factors (combined margin). Readable by
--   everyone; written only from the SQL editor or service role, so a factor
--   always carries its source and version. Ships empty.
-- - solar_assets, solar_readings: a signed-in user's rooftop system and its
--   metered readings.
-- - credit_signals: computed signals (method, period, kWh, tonnes, checks).
--   Append-only: a recalculation inserts a new row.
-- Owners read their own rows. All writes go through the solar-signal edge
-- function (service role), which validates them with the shared method in
-- supabase/functions/_shared/solarSignal.ts.
-- =============================================

CREATE TABLE public.grid_emission_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  kind text NOT NULL CHECK (kind = 'combined_margin'),
  kg_per_kwh numeric NOT NULL CHECK (kg_per_kwh > 0 AND kg_per_kwh < 2),
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  version text NOT NULL CHECK (length(btrim(version)) > 0),
  valid_from date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region, kind, version)
);

CREATE TABLE public.solar_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Rooftop solar' CHECK (length(name) <= 120),
  region text NOT NULL DEFAULT 'IN',
  capacity_kwp numeric NOT NULL CHECK (capacity_kwp > 0 AND capacity_kwp <= 10000),
  commissioned_on date NOT NULL,
  meter_accuracy_pct numeric NOT NULL DEFAULT 1 CHECK (meter_accuracy_pct >= 0 AND meter_accuracy_pct <= 10),
  registered_elsewhere boolean,
  additionality text NOT NULL DEFAULT 'not_assessed' CHECK (additionality IN ('not_assessed', 'passed_with_evidence')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX solar_assets_user_idx ON public.solar_assets (user_id);

CREATE TABLE public.solar_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.solar_assets(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  kwh numeric NOT NULL CHECK (kwh > 0),
  evidence text NOT NULL CHECK (evidence IN ('net_meter_bill', 'generation_meter', 'inverter_export')),
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  UNIQUE (asset_id, period_start, period_end)
);

CREATE TABLE public.credit_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.solar_assets(id) ON DELETE CASCADE,
  method_id text NOT NULL,
  method_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('ready', 'withheld', 'invalid')),
  monitoring_start date,
  monitoring_end date,
  eligible_kwh numeric NOT NULL DEFAULT 0,
  factor_id uuid REFERENCES public.grid_emission_factors(id),
  central_tco2e numeric,
  conservative_tco2e numeric,
  uncertainty_pct numeric NOT NULL,
  checks jsonb NOT NULL,
  inputs_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_signals_asset_idx ON public.credit_signals (asset_id, created_at DESC);

ALTER TABLE public.grid_emission_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_signals ENABLE ROW LEVEL SECURITY;

-- Reference data: readable by all; no write policies.
CREATE POLICY "Grid factors are readable" ON public.grid_emission_factors FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.grid_emission_factors TO anon, authenticated;

-- Owners read their own; no browser write policies (the edge function writes).
CREATE POLICY "Owners read their solar assets" ON public.solar_assets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners read their solar readings" ON public.solar_readings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.solar_assets a WHERE a.id = asset_id AND a.user_id = auth.uid()));
CREATE POLICY "Owners read their credit signals" ON public.credit_signals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.solar_assets a WHERE a.id = asset_id AND a.user_id = auth.uid()));
GRANT SELECT ON public.solar_assets, public.solar_readings, public.credit_signals TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.grid_emission_factors, public.solar_assets, public.solar_readings, public.credit_signals FROM anon, authenticated;

