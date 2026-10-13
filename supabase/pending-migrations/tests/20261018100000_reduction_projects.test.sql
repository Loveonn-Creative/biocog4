-- Behaviour tests for 20261018100000_reduction_projects.sql (run after it,
-- on top of 20261017100000_solar_signals.sql).
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF; RAISE NOTICE 'ok: %', p_label; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RAISE EXCEPTION 'FAIL (allowed): %', p_label USING ERRCODE = 'XX000';
EXCEPTION WHEN OTHERS THEN IF SQLSTATE = 'XX000' THEN RAISE; END IF; RAISE NOTICE 'ok rejected: %', p_label; END $$;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000a1', 'a@x.in'), ('00000000-0000-4000-8000-0000000000b2', 'b@x.in') ON CONFLICT DO NOTHING;

-- Lever-specific fields
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_projects (user_id, lever, name, started_on, old_fuel) VALUES ('00000000-0000-4000-8000-0000000000a1', 'fuel_switch', 'Boiler', '2026-04-01', 'DIESEL')$q$, 'fuel switch without the new energy is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_projects (user_id, lever, name, started_on, old_fuel, new_energy) VALUES ('00000000-0000-4000-8000-0000000000a1', 'fuel_switch', 'Boiler', '2026-04-01', 'PNG', 'PNG')$q$, 'switching a fuel to itself is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_projects (user_id, lever, name, started_on, old_fuel, new_energy) VALUES ('00000000-0000-4000-8000-0000000000a1', 'fuel_switch', 'Boiler', '2026-04-01', 'COAL', 'PNG')$q$, 'a fuel without a sourced factor is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_projects (user_id, lever, name, started_on, energy_carrier) VALUES ('00000000-0000-4000-8000-0000000000a1', 'energy_efficiency', 'Motors', '2026-04-01', 'GRID_ELECTRICITY')$q$, 'efficiency without an output unit is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_projects (user_id, lever, name, started_on, energy_carrier, output_unit, old_fuel) VALUES ('00000000-0000-4000-8000-0000000000a1', 'energy_efficiency', 'Motors', '2026-04-01', 'GRID_ELECTRICITY', 'tonnes', 'DIESEL')$q$, 'efficiency with fuel-switch fields is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_projects (user_id, lever, name, started_on) VALUES ('00000000-0000-4000-8000-0000000000a1', 'heat_recovery', 'X', '2026-04-01')$q$, 'unknown lever is refused');

INSERT INTO public.reduction_projects (id, user_id, lever, name, started_on, old_fuel, new_energy, old_equipment_retired, registered_elsewhere)
VALUES ('7f000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'fuel_switch', 'Boiler to PNG', '2026-04-01', 'DIESEL', 'PNG', true, false);
INSERT INTO public.reduction_projects (id, user_id, lever, name, started_on, energy_carrier, output_unit)
VALUES ('7f000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', 'energy_efficiency', 'IE3 motors', '2026-04-01', 'GRID_ELECTRICITY', 'tonnes');
SELECT pg_temp.check((SELECT count(*) FROM public.reduction_projects) = 2, 'both levers stored');

-- Periods
INSERT INTO public.reduction_periods (project_id, phase, period_start, period_end, old_fuel_qty, evidence)
VALUES ('7f000000-0000-4000-8000-000000000001', 'baseline', '2026-03-01', '2026-03-31', 4000, 'fuel_invoice');
INSERT INTO public.reduction_periods (project_id, phase, period_start, period_end, old_fuel_qty, new_energy_qty, evidence)
VALUES ('7f000000-0000-4000-8000-000000000001', 'project', '2026-04-01', '2026-04-30', 0, 4300, 'energy_bill');
INSERT INTO public.reduction_periods (project_id, phase, period_start, period_end, energy_qty, output_qty, evidence)
VALUES ('7f000000-0000-4000-8000-000000000002', 'baseline', '2026-03-01', '2026-03-31', 52000, 400, 'sub_meter');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_periods (project_id, phase, period_start, period_end, old_fuel_qty, evidence) VALUES ('7f000000-0000-4000-8000-000000000001', 'baseline', '2026-03-01', '2026-03-31', 10, 'fuel_invoice')$q$, 'same period twice is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_periods (project_id, phase, period_start, period_end, old_fuel_qty, evidence) VALUES ('7f000000-0000-4000-8000-000000000001', 'baseline', '2026-02-28', '2026-02-01', 10, 'fuel_invoice')$q$, 'period end before start is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_periods (project_id, phase, period_start, period_end, evidence) VALUES ('7f000000-0000-4000-8000-000000000001', 'baseline', '2026-01-01', '2026-01-31', 'fuel_invoice')$q$, 'a period with no figures is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_periods (project_id, phase, period_start, period_end, old_fuel_qty, evidence) VALUES ('7f000000-0000-4000-8000-000000000001', 'baseline', '2026-01-01', '2026-01-31', -1, 'fuel_invoice')$q$, 'negative quantities are refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_periods (project_id, phase, period_start, period_end, old_fuel_qty, evidence) VALUES ('7f000000-0000-4000-8000-000000000001', 'baseline', '2026-01-01', '2026-01-31', 5, 'guess')$q$, 'unknown evidence is refused');

-- Signals: exactly one subject; solar signals keep working.
INSERT INTO public.grid_emission_factors (region, kind, kg_per_kwh, source, version) VALUES ('TEST', 'combined_margin', 0.8, 'Test source', 'vTest');
INSERT INTO public.solar_assets (id, user_id, capacity_kwp, commissioned_on) VALUES ('5a000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b2', 10, '2026-01-01');
INSERT INTO public.credit_signals (asset_id, method_id, method_version, status, eligible_kwh, uncertainty_pct, checks, inputs_hash)
VALUES ('5a000000-0000-4000-8000-000000000001', 'SENSEIBLE-SOLAR-01', '0.1', 'withheld', 1200, 1, '[]', 'h-solar');
INSERT INTO public.credit_signals (project_id, method_id, method_version, status, uncertainty_pct, checks, inputs_hash, baseline_tco2e, project_tco2e, central_tco2e, conservative_tco2e, details)
VALUES ('7f000000-0000-4000-8000-000000000001', 'SENSEIBLE-FUELSWITCH-01', '0.1', 'ready', 1, '[]', 'h-fs', 10.7, 8.8, 1.9, 1.7, '{"months":1}');
SELECT pg_temp.expect_error($q$INSERT INTO public.credit_signals (asset_id, project_id, method_id, method_version, status, uncertainty_pct, checks, inputs_hash) VALUES ('5a000000-0000-4000-8000-000000000001', '7f000000-0000-4000-8000-000000000001', 'X', '0.1', 'ready', 1, '[]', 'h')$q$, 'a signal for both a solar asset and a project is refused');
SELECT pg_temp.expect_error($q$INSERT INTO public.credit_signals (method_id, method_version, status, uncertainty_pct, checks, inputs_hash) VALUES ('X', '0.1', 'ready', 1, '[]', 'h')$q$, 'a signal with no subject is refused');

-- Row-level security
GRANT USAGE ON SCHEMA public TO authenticated, anon;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
SELECT pg_temp.check((SELECT count(*) FROM public.reduction_projects) = 2 AND (SELECT count(*) FROM public.reduction_periods) = 3, 'owner reads own projects and periods');
SELECT pg_temp.check((SELECT count(*) FROM public.credit_signals) = 1 AND (SELECT count(*) FROM public.credit_signals WHERE project_id IS NOT NULL) = 1, 'owner reads own project signal and not the other user''s solar signal');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_projects (user_id, lever, name, started_on, energy_carrier, output_unit) VALUES ('00000000-0000-4000-8000-0000000000a1', 'energy_efficiency', 'Mine', '2026-04-01', 'LPG', 'kg')$q$, 'browser cannot write projects');
SELECT pg_temp.expect_error($q$INSERT INTO public.reduction_periods (project_id, phase, period_start, period_end, energy_qty, evidence) VALUES ('7f000000-0000-4000-8000-000000000002', 'project', '2026-04-01', '2026-04-30', 1, 'sub_meter')$q$, 'browser cannot write periods');
SELECT pg_temp.expect_error($q$UPDATE public.credit_signals SET central_tco2e = 999$q$, 'browser cannot edit signals');
SELECT pg_temp.expect_error($q$DELETE FROM public.reduction_projects$q$, 'browser cannot delete projects');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
SELECT pg_temp.check((SELECT count(*) FROM public.reduction_projects) = 0 AND (SELECT count(*) FROM public.reduction_periods) = 0, 'other users read no projects or periods');
SELECT pg_temp.check((SELECT count(*) FROM public.credit_signals) = 1 AND (SELECT count(*) FROM public.credit_signals WHERE project_id IS NOT NULL) = 0, 'other users see only their own solar signal');
RESET ROLE;

-- Deleting a project removes its periods and signals; solar rows stay.
DELETE FROM public.reduction_projects WHERE id = '7f000000-0000-4000-8000-000000000002';
SELECT pg_temp.check((SELECT count(*) FROM public.reduction_periods WHERE project_id = '7f000000-0000-4000-8000-000000000002') = 0, 'periods go with their project');
SELECT pg_temp.check((SELECT count(*) FROM public.credit_signals WHERE asset_id IS NOT NULL) = 1, 'solar signal untouched');
SELECT 'ALL REDUCTION PROJECT TESTS PASSED' AS result;
