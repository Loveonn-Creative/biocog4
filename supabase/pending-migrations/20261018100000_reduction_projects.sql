-- =============================================
-- PENDING (NOT APPLIED). Fuel-switch and energy-efficiency reduction signals.
-- Requires: 20261017100000_solar_signals.sql (grid_emission_factors,
-- credit_signals). Rollback: rollback/20261018100000_reduction_projects.rollback.sql
--
-- - reduction_projects: a signed-in user's change at a site, one lever each:
--   'fuel_switch' (an old fuel replaced by a lower-carbon energy) or
--   'energy_efficiency' (less energy for the same output). Lever-specific
--   fields are required by CHECK constraints so a project is never half-set.
-- - reduction_periods: the monthly figures behind a project, split into the
--   baseline (before the change) and project (after) phases. Each row says
--   what evidence it came from and may point at the stored invoice.
-- - credit_signals: generalised so a signal belongs to exactly one solar
--   asset OR one reduction project, with baseline and project tonnes and the
--   method details. Existing solar rows are unchanged.
-- Owners read their own rows. All writes go through the reduction-signal edge
-- function (service role), which validates them with the shared method in
-- supabase/functions/_shared/reductionSignal.ts. No factor value is stored
-- here: fuel factors live in that module with their IPCC source, and grid
-- electricity uses the sourced combined-margin row in grid_emission_factors.
-- =============================================
BEGIN;

-- Energies a project can name. Fuels are the ones with an IPCC-derived factor
-- in supabase/functions/_shared/emissionFactors.ts; grid electricity uses the
-- combined-margin factor table.
CREATE TABLE public.reduction_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lever text NOT NULL CHECK (lever IN ('fuel_switch', 'energy_efficiency')),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  region text NOT NULL DEFAULT 'IN' CHECK (region ~ '^[A-Z]{2}$'),
  equipment text CHECK (equipment IS NULL OR length(equipment) <= 160),
  started_on date NOT NULL,
  -- fuel_switch: the fuel replaced and the energy that replaced it.
  old_fuel text CHECK (old_fuel IS NULL OR old_fuel IN ('DIESEL', 'FURNACE_OIL', 'KEROSENE', 'LPG', 'PNG')),
  new_energy text CHECK (new_energy IS NULL OR new_energy IN ('PNG', 'LPG', 'GRID_ELECTRICITY')),
  -- energy_efficiency: the energy measured, and what the output is counted in.
  energy_carrier text CHECK (energy_carrier IS NULL OR energy_carrier IN ('GRID_ELECTRICITY', 'DIESEL', 'FURNACE_OIL', 'KEROSENE', 'LPG', 'PNG')),
  output_unit text CHECK (output_unit IS NULL OR length(btrim(output_unit)) BETWEEN 1 AND 40),
  meter_accuracy_pct numeric NOT NULL DEFAULT 1 CHECK (meter_accuracy_pct >= 0 AND meter_accuracy_pct <= 10),
  -- Leakage guard: the replaced equipment is scrapped or idle, not moved elsewhere.
  old_equipment_retired boolean,
  registered_elsewhere boolean,
  additionality text NOT NULL DEFAULT 'not_assessed' CHECK (additionality IN ('not_assessed', 'passed_with_evidence')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reduction_projects_fuel_switch_fields CHECK (
    lever <> 'fuel_switch' OR (old_fuel IS NOT NULL AND new_energy IS NOT NULL AND old_fuel <> new_energy AND energy_carrier IS NULL)),
  CONSTRAINT reduction_projects_efficiency_fields CHECK (
    lever <> 'energy_efficiency' OR (energy_carrier IS NOT NULL AND output_unit IS NOT NULL AND old_fuel IS NULL AND new_energy IS NULL))
);
CREATE INDEX reduction_projects_user_idx ON public.reduction_projects (user_id, lever);

CREATE TABLE public.reduction_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reduction_projects(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('baseline', 'project')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  -- fuel_switch: old fuel used (baseline: all of it; project: any still used),
  -- in the fuel's own unit (litre, kg or scm).
  old_fuel_qty numeric CHECK (old_fuel_qty IS NULL OR old_fuel_qty >= 0),
  -- fuel_switch project periods: the new energy used by the switched equipment (kWh, scm or kg).
  new_energy_qty numeric CHECK (new_energy_qty IS NULL OR new_energy_qty >= 0),
  -- energy_efficiency: energy used in the period, in the carrier's unit.
  energy_qty numeric CHECK (energy_qty IS NULL OR energy_qty >= 0),
  -- Output in the project's output_unit (required for efficiency, optional for fuel switch).
  output_qty numeric CHECK (output_qty IS NULL OR output_qty >= 0),
  evidence text NOT NULL CHECK (evidence IN ('fuel_invoice', 'energy_bill', 'sub_meter', 'production_log')),
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  CHECK (num_nonnulls(old_fuel_qty, new_energy_qty, energy_qty, output_qty) > 0),
  UNIQUE (project_id, phase, period_start, period_end)
);
CREATE INDEX reduction_periods_project_idx ON public.reduction_periods (project_id, phase, period_start);

-- A signal now belongs to a solar asset or a reduction project, never both.
ALTER TABLE public.credit_signals ALTER COLUMN asset_id DROP NOT NULL;
ALTER TABLE public.credit_signals ADD COLUMN project_id uuid REFERENCES public.reduction_projects(id) ON DELETE CASCADE;
ALTER TABLE public.credit_signals ADD COLUMN baseline_tco2e numeric;
ALTER TABLE public.credit_signals ADD COLUMN project_tco2e numeric;
ALTER TABLE public.credit_signals ADD COLUMN details jsonb;
ALTER TABLE public.credit_signals ADD CONSTRAINT credit_signals_one_subject CHECK (num_nonnulls(asset_id, project_id) = 1);
CREATE INDEX credit_signals_project_idx ON public.credit_signals (project_id, created_at DESC) WHERE project_id IS NOT NULL;

ALTER TABLE public.reduction_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reduction_periods ENABLE ROW LEVEL SECURITY;

-- Owners read their own; no browser write policies (the edge function writes).
CREATE POLICY "Owners read their reduction projects" ON public.reduction_projects FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners read their reduction periods" ON public.reduction_periods FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reduction_projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners read their project signals" ON public.credit_signals FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.reduction_projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
GRANT SELECT ON public.reduction_projects, public.reduction_periods TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.reduction_projects, public.reduction_periods FROM anon, authenticated;

COMMIT;
