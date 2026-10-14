-- =============================================
-- PENDING (NOT APPLIED). Electricity (Scope 2) emissions engine.
-- Rollback: rollback/20261021100000_electricity_engine.rollback.sql
--
-- Additive only: seven new tables, one view, one service-role function.
-- Nothing existing changes; the current electricity rows in public.emissions
-- and their verifications stay exactly as they are.
--
-- - electricity_factors: versioned grid factors kept apart by KIND
--   (grid_average, residual_mix, supplier_specific, project_combined_margin),
--   with country, grid region, validity period, gases, GWP basis, source and
--   edition, uncertainty, licence note. Two-person approval; immutable once
--   approved (retire and add a new version). SHIPS EMPTY.
-- - reporting_frameworks: versioned framework rules (mandatory regulation,
--   voluntary standard or customer-selected), applicability, effective dates,
--   Scope 2 requirements and accepted evidence, each with its source.
--   Immutable once approved. Rows come from a reviewed template, not here.
-- - electricity_activities: one row per electricity bill consumption figure,
--   written by the server from billing details only (period, kWh as printed,
--   unit, country and how it was known, supplier reference). No consumer
--   name, address, phone, consumer, account or meter numbers.
-- - electricity_instruments: contractual instruments (certificates, PPAs,
--   green tariffs, supplier contracts) with registry reference, quantity,
--   generation market, vintage, retirement and evidence document. A
--   certificate reference can be registered once on the whole platform.
-- - electricity_allocations: instrument kWh allocated to consumption by
--   reporting year. Database rules: never more than the instrument's
--   quantity, never more than the activity's consumption.
-- - electricity_calculations: append-only results per activity, reporting
--   year and method (location / market), with factor snapshots, instrument
--   coverage, formula, status, warnings and reasons. A project
--   combined-margin factor can never appear in a Scope 2 result.
-- - scope2_totals view: dual reporting per owner and reporting year.
-- Owners read their own rows. All writes go through the scope2-engine and
-- extract-document functions (service role) and scope2_record.
-- =============================================
BEGIN;

-- ---------------------------------------------------------------------------
-- Factor registry
-- ---------------------------------------------------------------------------
CREATE TABLE public.electricity_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_key text NOT NULL CHECK (factor_key ~ '^[A-Z0-9_]{3,80}$'),
  version text NOT NULL CHECK (length(btrim(version)) BETWEEN 1 AND 30),
  kind text NOT NULL CHECK (kind IN ('grid_average', 'residual_mix', 'supplier_specific', 'project_combined_margin')),
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  grid_region text CHECK (grid_region IS NULL OR grid_region ~ '^[A-Z0-9_-]{2,20}$'),
  supplier_ref text CHECK (supplier_ref IS NULL OR length(btrim(supplier_ref)) BETWEEN 2 AND 80),
  kg_per_kwh numeric NOT NULL CHECK (kg_per_kwh >= 0 AND kg_per_kwh < 3),
  gases text NOT NULL CHECK (gases IN ('CO2', 'CO2e')),
  gwp_basis text CHECK (gwp_basis IS NULL OR length(btrim(gwp_basis)) > 0),
  methodology text NOT NULL CHECK (length(btrim(methodology)) > 0),   -- e.g. 'CEA weighted average of grid-connected generation, CO2 only'
  valid_from date NOT NULL,
  valid_to date,
  source_name text NOT NULL CHECK (length(btrim(source_name)) > 0),
  source_ref text NOT NULL CHECK (length(btrim(source_ref)) > 0),     -- table, sheet or page
  source_url text,
  publication_year smallint NOT NULL CHECK (publication_year BETWEEN 1990 AND 2100),
  uncertainty_pct numeric CHECK (uncertainty_pct IS NULL OR (uncertainty_pct >= 0 AND uncertainty_pct <= 100)),
  licence_note text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'retired')),
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (factor_key, version),
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CHECK (status = 'draft' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND approved_by <> created_by)),
  CHECK ((gases = 'CO2e') = (gwp_basis IS NOT NULL)),
  CHECK ((kind = 'supplier_specific') = (supplier_ref IS NOT NULL))
);
CREATE INDEX electricity_factors_lookup_idx ON public.electricity_factors (kind, country, grid_region) WHERE status = 'approved';

-- ---------------------------------------------------------------------------
-- Framework registry
-- ---------------------------------------------------------------------------
CREATE TABLE public.reporting_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL CHECK (code ~ '^[A-Z0-9_]{2,40}$'),
  version text NOT NULL CHECK (length(btrim(version)) BETWEEN 1 AND 30),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('mandatory', 'voluntary', 'customer')),
  jurisdiction text NOT NULL CHECK (jurisdiction ~ '^([A-Z]{2}|EU|GLOBAL|US-[A-Z]{2})$'),
  applicability jsonb NOT NULL,            -- machine-checkable criteria + plain text
  effective_from date,
  effective_to date,
  scope2_rules jsonb NOT NULL,             -- {"dual_reporting": bool, "accepted_instruments": [...], "vintage_tolerance_months": n, ...}
  status_note text,                        -- e.g. legal status (stayed, deferred, proposed)
  source_name text NOT NULL CHECK (length(btrim(source_name)) > 0),
  source_url text NOT NULL CHECK (source_url ~ '^https?://'),
  source_ref text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'retired')),
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, version),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  CHECK (status = 'draft' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND approved_by <> created_by))
);

-- ---------------------------------------------------------------------------
-- Activities, instruments, allocations, calculations
-- ---------------------------------------------------------------------------
CREATE TABLE public.electricity_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  line_key text NOT NULL CHECK (length(line_key) BETWEEN 1 AND 40),
  country text CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  country_source text NOT NULL CHECK (country_source IN ('profile', 'bill', 'unknown')),
  grid_region text,
  supplier_ref text,
  period_start date,
  period_end date,
  quantity_printed numeric,
  unit_printed text,
  kwh numeric CHECK (kwh IS NULL OR kwh > 0),
  status text NOT NULL CHECK (status IN ('valid', 'needs_data')),
  reasons text[] NOT NULL DEFAULT '{}',
  source_text text CHECK (source_text IS NULL OR length(source_text) <= 240),
  method_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, line_key),
  CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start),
  CHECK (status <> 'valid' OR (kwh IS NOT NULL AND country IS NOT NULL AND period_start IS NOT NULL AND period_end IS NOT NULL AND cardinality(reasons) = 0)),
  CHECK (status = 'valid' OR cardinality(reasons) > 0)
);
CREATE INDEX electricity_activities_user_idx ON public.electricity_activities (user_id);

CREATE TABLE public.electricity_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  type text NOT NULL CHECK (type IN ('eac', 'ppa', 'green_tariff', 'supplier_contract')),
  scheme text NOT NULL CHECK (length(btrim(scheme)) BETWEEN 2 AND 60),
  certificate_ref text CHECK (certificate_ref IS NULL OR length(btrim(certificate_ref)) BETWEEN 3 AND 120),
  mwh numeric NOT NULL CHECK (mwh > 0 AND mwh < 100000000),
  generation_country text NOT NULL CHECK (generation_country ~ '^[A-Z]{2}$'),
  generation_region text,
  vintage_start date NOT NULL,
  vintage_end date NOT NULL,
  kg_per_kwh numeric NOT NULL CHECK (kg_per_kwh >= 0 AND kg_per_kwh < 3),
  retired boolean NOT NULL DEFAULT false,
  retirement_ref text,
  beneficiary_confirmed boolean NOT NULL DEFAULT false,
  evidence_document_id uuid REFERENCES public.documents(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (vintage_end >= vintage_start),
  CHECK (NOT retired OR retirement_ref IS NOT NULL)
);
-- Duplicate-claim prevention: one registration per certificate on the platform.
CREATE UNIQUE INDEX electricity_instruments_certificate_once ON public.electricity_instruments (lower(btrim(scheme)), lower(btrim(certificate_ref))) WHERE certificate_ref IS NOT NULL;
CREATE INDEX electricity_instruments_user_idx ON public.electricity_instruments (user_id);

CREATE TABLE public.electricity_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES public.electricity_instruments(id) ON DELETE RESTRICT,
  activity_id uuid NOT NULL REFERENCES public.electricity_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporting_year text NOT NULL CHECK (reporting_year ~ '^(FY[0-9]{4}-[0-9]{2}|[0-9]{4})$'),
  kwh numeric NOT NULL CHECK (kwh > 0),
  is_current boolean NOT NULL DEFAULT true,
  method_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX electricity_allocations_current ON public.electricity_allocations (instrument_id, activity_id, reporting_year) WHERE is_current;

CREATE TABLE public.electricity_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.electricity_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  reporting_year text NOT NULL CHECK (reporting_year ~ '^(FY[0-9]{4}-[0-9]{2}|[0-9]{4})$'),
  method text NOT NULL CHECK (method IN ('location', 'market')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  kwh numeric NOT NULL CHECK (kwh > 0),
  factor_id uuid REFERENCES public.electricity_factors(id) ON DELETE RESTRICT,
  factor_key text,
  factor_version text,
  factor_kind text CHECK (factor_kind IS NULL OR factor_kind IN ('grid_average', 'residual_mix', 'supplier_specific')),
  factor_value numeric,
  factor_gases text,
  factor_source text,
  factor_kwh numeric,
  instrument_kwh numeric NOT NULL DEFAULT 0 CHECK (instrument_kwh >= 0),
  instrument_kg numeric NOT NULL DEFAULT 0 CHECK (instrument_kg >= 0),
  kg numeric CHECK (kg IS NULL OR kg >= 0),
  status text NOT NULL CHECK (status IN ('calculated', 'calculated_with_warning', 'unresolved')),
  formula text,
  warnings text[] NOT NULL DEFAULT '{}',
  reasons text[] NOT NULL DEFAULT '{}',
  inputs_sha256 text NOT NULL CHECK (inputs_sha256 ~ '^[0-9a-f]{64}$'),
  is_current boolean NOT NULL DEFAULT true,
  method_version text NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  -- Location-based uses only the grid average and no instruments.
  CHECK (method = 'market' OR (instrument_kwh = 0 AND (factor_kind IS NULL OR factor_kind = 'grid_average'))),
  -- A number needs its parts and equals them.
  CHECK (kg IS NULL OR abs(kg - (instrument_kg + coalesce(factor_kwh * factor_value, 0))) <= 0.000001 * greatest(1, kg)),
  CHECK (kg IS NULL OR instrument_kwh + coalesce(factor_kwh, 0) BETWEEN kwh - 0.000001 AND kwh + 0.000001),
  CHECK ((status = 'unresolved') = (kg IS NULL)),
  CHECK (status <> 'unresolved' OR cardinality(reasons) > 0)
);
CREATE UNIQUE INDEX electricity_calculations_current ON public.electricity_calculations (activity_id, reporting_year, method) WHERE is_current;
CREATE INDEX electricity_calculations_user_idx ON public.electricity_calculations (user_id) WHERE is_current;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.scope2_guard_registry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'An approved or retired row cannot be deleted; retire it instead' USING ERRCODE = 'P0001'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' AND (to_jsonb(NEW) - ARRAY['status', 'approved_by', 'approved_at']) <> (to_jsonb(OLD) - ARRAY['status', 'approved_by', 'approved_at']) THEN
    RAISE EXCEPTION 'An approved row cannot be edited; add a new version' USING ERRCODE = 'P0001';
  END IF;
  IF NOT ((OLD.status = 'draft' AND NEW.status IN ('draft', 'approved'))
          OR (OLD.status = 'approved' AND NEW.status = 'retired' AND NEW.approved_by = OLD.approved_by AND NEW.approved_at = OLD.approved_at)
          OR (OLD.status = NEW.status AND OLD.status <> 'draft' AND to_jsonb(NEW) = to_jsonb(OLD))) THEN
    RAISE EXCEPTION 'Status can only move draft -> approved -> retired' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER electricity_factors_guard BEFORE UPDATE OR DELETE ON public.electricity_factors FOR EACH ROW EXECUTE FUNCTION public.scope2_guard_registry();
CREATE TRIGGER reporting_frameworks_guard BEFORE UPDATE OR DELETE ON public.reporting_frameworks FOR EACH ROW EXECUTE FUNCTION public.scope2_guard_registry();

-- Allocations: within the instrument's quantity and the activity's consumption.
CREATE OR REPLACE FUNCTION public.scope2_guard_allocation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE i public.electricity_instruments; a public.electricity_activities; used numeric; taken numeric;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'is_current') <> (to_jsonb(OLD) - 'is_current') OR (NEW.is_current AND NOT OLD.is_current) THEN
      RAISE EXCEPTION 'An allocation is append-only' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO i FROM public.electricity_instruments WHERE id = NEW.instrument_id FOR UPDATE;
  SELECT * INTO a FROM public.electricity_activities WHERE id = NEW.activity_id FOR UPDATE;
  IF i.user_id <> NEW.user_id OR a.user_id <> NEW.user_id THEN RAISE EXCEPTION 'Instrument and consumption must belong to the same owner' USING ERRCODE = 'P0001'; END IF;
  IF a.status <> 'valid' THEN RAISE EXCEPTION 'Only valid consumption can receive instruments' USING ERRCODE = 'P0001'; END IF;
  SELECT coalesce(sum(kwh), 0) INTO used FROM public.electricity_allocations WHERE instrument_id = NEW.instrument_id AND is_current;
  IF used + NEW.kwh > i.mwh * 1000 + 0.000001 THEN RAISE EXCEPTION 'Allocation exceeds the instrument quantity' USING ERRCODE = 'P0001'; END IF;
  SELECT coalesce(sum(kwh), 0) INTO taken FROM public.electricity_allocations WHERE activity_id = NEW.activity_id AND is_current;
  IF taken + NEW.kwh > a.kwh + 0.000001 THEN RAISE EXCEPTION 'Allocation exceeds the consumption' USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER electricity_allocations_guard BEFORE INSERT OR UPDATE ON public.electricity_allocations FOR EACH ROW EXECUTE FUNCTION public.scope2_guard_allocation();

-- Calculations: append-only; the factor must be approved and of a Scope 2 kind.
CREATE OR REPLACE FUNCTION public.scope2_guard_calculation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE f public.electricity_factors; a public.electricity_activities;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'is_current') <> (to_jsonb(OLD) - 'is_current') OR (NEW.is_current AND NOT OLD.is_current) THEN
      RAISE EXCEPTION 'A Scope 2 calculation is append-only' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO a FROM public.electricity_activities WHERE id = NEW.activity_id;
  IF a.user_id <> NEW.user_id THEN RAISE EXCEPTION 'Calculation does not belong to its activity' USING ERRCODE = 'P0001'; END IF;
  IF NEW.factor_id IS NOT NULL THEN
    SELECT * INTO f FROM public.electricity_factors WHERE id = NEW.factor_id;
    IF f.status <> 'approved' OR f.kind = 'project_combined_margin' OR f.kind <> NEW.factor_kind OR f.kg_per_kwh <> NEW.factor_value
       OR f.factor_key <> NEW.factor_key OR f.version <> NEW.factor_version OR f.gases <> NEW.factor_gases OR f.country <> a.country THEN
      RAISE EXCEPTION 'Calculation factor does not match an approved Scope 2 factor for this country' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.factor_kind IS NOT NULL OR NEW.factor_value IS NOT NULL THEN
    RAISE EXCEPTION 'Factor fields need a factor' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER electricity_calculations_guard BEFORE INSERT OR UPDATE ON public.electricity_calculations FOR EACH ROW EXECUTE FUNCTION public.scope2_guard_calculation();

-- ---------------------------------------------------------------------------
-- The write path for a recalculation, atomic per owner
-- ---------------------------------------------------------------------------
-- p = { user_id, method_version, allocations: [{instrument_id, activity_id, reporting_year, kwh}],
--       calculations: [{activity_id, reporting_year, method, ..., inputs_sha256}] }
-- The owner's current allocations are replaced as a set (history kept);
-- calculations are replaced only when their inputs changed.
CREATE OR REPLACE FUNCTION public.scope2_record(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := (p->>'user_id')::uuid;
  v_version text := p->>'method_version';
  r jsonb; c public.electricity_calculations; cur public.electricity_calculations;
  v_alloc int := 0; v_written int := 0; v_kept int := 0; v_keys text[] := '{}';
BEGIN
  IF v_user IS NULL OR v_version IS NULL THEN RAISE EXCEPTION 'user_id and method_version are required' USING ERRCODE = 'P0001'; END IF;
  -- One recalculation per owner at a time: no concurrent double allocation.
  PERFORM pg_advisory_xact_lock(hashtextextended('scope2|' || v_user::text, 0));

  UPDATE public.electricity_allocations SET is_current = false WHERE user_id = v_user AND is_current;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p->'allocations', '[]'::jsonb)) LOOP
    INSERT INTO public.electricity_allocations (instrument_id, activity_id, user_id, reporting_year, kwh, method_version)
    VALUES ((r->>'instrument_id')::uuid, (r->>'activity_id')::uuid, v_user, r->>'reporting_year', (r->>'kwh')::numeric, v_version);
    v_alloc := v_alloc + 1;
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p->'calculations', '[]'::jsonb)) LOOP
    c := jsonb_populate_record(NULL::public.electricity_calculations, r);
    c.id := gen_random_uuid(); c.user_id := v_user; c.is_current := true; c.method_version := v_version; c.calculated_at := now();
    c.warnings := coalesce(c.warnings, '{}'); c.reasons := coalesce(c.reasons, '{}');
    c.instrument_kwh := coalesce(c.instrument_kwh, 0); c.instrument_kg := coalesce(c.instrument_kg, 0);
    SELECT organization_id INTO c.organization_id FROM public.electricity_activities WHERE id = c.activity_id;
    v_keys := v_keys || (c.activity_id::text || '|' || c.reporting_year || '|' || c.method);
    SELECT * INTO cur FROM public.electricity_calculations WHERE activity_id = c.activity_id AND reporting_year = c.reporting_year AND method = c.method AND is_current;
    IF cur.id IS NOT NULL AND cur.inputs_sha256 = c.inputs_sha256 THEN v_kept := v_kept + 1; CONTINUE; END IF;
    IF cur.id IS NOT NULL THEN UPDATE public.electricity_calculations SET is_current = false WHERE id = cur.id; END IF;
    INSERT INTO public.electricity_calculations SELECT c.*;
    v_written := v_written + 1;
  END LOOP;
  -- Results for consumption that no longer yields that year/method stop being current.
  UPDATE public.electricity_calculations SET is_current = false
   WHERE user_id = v_user AND is_current AND NOT ((activity_id::text || '|' || reporting_year || '|' || method) = ANY (v_keys));
  RETURN jsonb_build_object('allocations', v_alloc, 'written', v_written, 'kept', v_kept);
END $$;
REVOKE ALL ON FUNCTION public.scope2_record(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scope2_record(jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- Dual reporting
-- ---------------------------------------------------------------------------
CREATE VIEW public.scope2_totals WITH (security_invoker = true) AS
SELECT c.user_id, c.organization_id, c.reporting_year, c.method,
       sum(c.kwh) AS kwh,
       sum(c.kg) FILTER (WHERE c.status <> 'unresolved') AS kg,
       sum(c.kwh) FILTER (WHERE c.status = 'unresolved') AS unresolved_kwh,
       count(*) FILTER (WHERE c.status = 'calculated_with_warning') AS warning_rows,
       sum(c.instrument_kwh) AS instrument_kwh
FROM public.electricity_calculations c
WHERE c.is_current
GROUP BY c.user_id, c.organization_id, c.reporting_year, c.method;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
ALTER TABLE public.electricity_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read approved electricity factors" ON public.electricity_factors FOR SELECT TO authenticated USING (status IN ('approved', 'retired'));
CREATE POLICY "Signed-in users read approved frameworks" ON public.reporting_frameworks FOR SELECT TO authenticated USING (status IN ('approved', 'retired'));
CREATE POLICY "Owners read their electricity activities" ON public.electricity_activities FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners read their instruments" ON public.electricity_instruments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners read their allocations" ON public.electricity_allocations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners read their Scope 2 calculations" ON public.electricity_calculations FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.electricity_factors, public.reporting_frameworks, public.electricity_activities, public.electricity_instruments,
  public.electricity_allocations, public.electricity_calculations, public.scope2_totals FROM anon, authenticated;
GRANT SELECT ON public.electricity_factors, public.reporting_frameworks, public.electricity_activities, public.electricity_instruments,
  public.electricity_allocations, public.electricity_calculations, public.scope2_totals TO authenticated;
GRANT ALL ON public.electricity_factors, public.reporting_frameworks, public.electricity_activities, public.electricity_instruments,
  public.electricity_allocations, public.electricity_calculations TO service_role;
GRANT SELECT ON public.scope2_totals TO service_role;
REVOKE ALL ON FUNCTION public.scope2_guard_registry(), public.scope2_guard_allocation(), public.scope2_guard_calculation() FROM PUBLIC, anon, authenticated;

COMMIT;
