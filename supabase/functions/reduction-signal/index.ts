import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  computeEfficiencySignal, computeFuelSwitchSignal, ENERGY_UNIT, FUEL_SPECS,
  type Energy, type Fuel, type GridFactor, type Period, type ReductionSignal,
} from '../_shared/reductionSignal.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const missingTable = (e: { code?: string } | null) => e?.code === '42P01' || e?.code === 'PGRST205' || e?.code === 'PGRST202' || e?.code === '42703';
const NOT_ENABLED = { error: 'Fuel-switch and efficiency signals are not switched on yet.', code: 'not_enabled' };
const EVIDENCE = new Set(['fuel_invoice', 'energy_bill', 'sub_meter', 'production_log']);
const MAX_PROJECTS = 20;
const MAX_PERIODS = 120;
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const qty = (v: unknown) => { const n = Number(v); return v === null || v === undefined || v === '' || !Number.isFinite(n) || n < 0 || n >= 1e9 ? null : n; };
const isFuel = (v: unknown): v is Fuel => typeof v === 'string' && v in FUEL_SPECS;
const isEnergy = (v: unknown): v is Energy => typeof v === 'string' && v in ENERGY_UNIT;

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

interface CleanPeriod extends Period { phase: 'baseline' | 'project'; evidence: string }

/**
 * Fuel-switch and energy-efficiency signals for the signed-in user: load
 * their projects, or save one with its periods and store a freshly computed
 * signal (append-only). The method is the shared one in
 * _shared/reductionSignal.ts; grid electricity uses the latest sourced
 * combined-margin factor for the region, or none.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Sign in to save a reduction signal.' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action === 'save' ? 'save' : 'load';

    const { data: projects, error: projectsError } = await admin.from('reduction_projects').select('*').eq('user_id', user.id).order('created_at').limit(MAX_PROJECTS);
    if (missingTable(projectsError)) return json(NOT_ENABLED, 503);
    if (projectsError) return json({ error: 'Could not load your projects.' }, 500);

    const p = body?.project ?? {};
    const region = typeof p.region === 'string' && /^[A-Z]{2}$/.test(p.region) ? p.region : 'IN';
    const { data: factorRow } = await admin.from('grid_emission_factors').select('*').eq('region', region).eq('kind', 'combined_margin').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const factor: GridFactor | null = factorRow ? { kgPerKwh: Number(factorRow.kg_per_kwh), kind: 'combined_margin', region: factorRow.region, source: factorRow.source, version: factorRow.version } : null;

    if (action === 'load') {
      const ids = (projects ?? []).map((x: { id: string }) => x.id);
      if (!ids.length) return json({ projects: [], factor });
      const [{ data: periods }, { data: signals }] = await Promise.all([
        admin.from('reduction_periods').select('project_id, phase, period_start, period_end, old_fuel_qty, new_energy_qty, energy_qty, output_qty, evidence').in('project_id', ids).order('period_start'),
        admin.from('credit_signals').select('*').in('project_id', ids).order('created_at', { ascending: false }),
      ]);
      const latest = new Map<string, unknown>();
      for (const s of signals ?? []) if (!latest.has(s.project_id)) latest.set(s.project_id, s);
      return json({
        factor,
        projects: (projects ?? []).map((x: { id: string }) => ({ ...x, periods: (periods ?? []).filter((r: { project_id: string }) => r.project_id === x.id), signal: latest.get(x.id) ?? null })),
      });
    }

    // ---- save ----
    const lever = p.lever === 'energy_efficiency' ? 'energy_efficiency' : p.lever === 'fuel_switch' ? 'fuel_switch' : null;
    if (!lever) return json({ error: 'Choose fuel switch or energy efficiency.' }, 400);
    if (!isDate(p.startedOn)) return json({ error: 'Enter the date of the change.' }, 400);
    const existing = typeof p.id === 'string' ? (projects ?? []).find((x: { id: string }) => x.id === p.id) : null;
    if (typeof p.id === 'string' && !existing) return json({ error: 'Project not found.' }, 404);
    if (!existing && (projects ?? []).length >= MAX_PROJECTS) return json({ error: `Up to ${MAX_PROJECTS} projects per account.` }, 400);
    if (existing && existing.lever !== lever) return json({ error: 'A project keeps its lever. Start a new project instead.' }, 400);
    if (lever === 'fuel_switch' && (!isFuel(p.oldFuel) || !(p.newEnergy === 'PNG' || p.newEnergy === 'LPG' || p.newEnergy === 'GRID_ELECTRICITY') || p.oldFuel === p.newEnergy)) {
      return json({ error: 'Choose the old fuel and a different new energy.' }, 400);
    }
    const outputUnit = typeof p.outputUnit === 'string' ? p.outputUnit.trim().slice(0, 40) : '';
    if (lever === 'energy_efficiency' && (!isEnergy(p.energyCarrier) || !outputUnit)) return json({ error: 'Choose the energy measured and the output unit.' }, 400);

    const periods: CleanPeriod[] = [];
    for (const r of (Array.isArray(body?.periods) ? body.periods.slice(0, MAX_PERIODS) : []) as Record<string, unknown>[]) {
      if (!isDate(r?.periodStart) || !isDate(r?.periodEnd) || (r.phase !== 'baseline' && r.phase !== 'project') || !EVIDENCE.has(String(r.evidence))) continue;
      const row: CleanPeriod = {
        phase: r.phase, evidence: String(r.evidence), periodStart: r.periodStart, periodEnd: r.periodEnd,
        oldFuelQty: qty(r.oldFuelQty), newEnergyQty: qty(r.newEnergyQty), energyQty: qty(r.energyQty), outputQty: qty(r.outputQty),
      };
      if ([row.oldFuelQty, row.newEnergyQty, row.energyQty, row.outputQty].some((v) => v !== null) && r.periodEnd >= r.periodStart) periods.push(row);
    }
    const accuracy = Number(p.meterAccuracyPct ?? 1);
    const common = {
      startedOn: p.startedOn as string,
      baseline: periods.filter((r) => r.phase === 'baseline'),
      project: periods.filter((r) => r.phase === 'project'),
      meterAccuracyPct: Number.isFinite(accuracy) ? Math.min(10, Math.max(0, accuracy)) : 1,
      factor,
      registeredElsewhere: typeof p.registeredElsewhere === 'boolean' ? p.registeredElsewhere : null,
      oldEquipmentRetired: typeof p.oldEquipmentRetired === 'boolean' ? p.oldEquipmentRetired : null,
      additionality: p.additionality === 'passed_with_evidence' ? 'passed_with_evidence' as const : 'not_assessed' as const,
    };
    const signal: ReductionSignal = lever === 'fuel_switch'
      ? computeFuelSwitchSignal({ ...common, oldFuel: p.oldFuel, newEnergy: p.newEnergy })
      : computeEfficiencySignal({ ...common, carrier: p.energyCarrier, outputUnit });
    if (signal.checks.find((c) => c.id === 'no_overlap' && !c.pass)) return json({ error: 'Two periods cover the same days. Fix the dates and save again.', signal }, 400);

    const projectRow = {
      user_id: user.id, lever, region,
      name: (typeof p.name === 'string' && p.name.trim().slice(0, 120)) || (lever === 'fuel_switch' ? 'Fuel switch' : 'Energy efficiency'),
      equipment: typeof p.equipment === 'string' ? p.equipment.trim().slice(0, 160) || null : null,
      started_on: p.startedOn,
      old_fuel: lever === 'fuel_switch' ? p.oldFuel : null,
      new_energy: lever === 'fuel_switch' ? p.newEnergy : null,
      energy_carrier: lever === 'energy_efficiency' ? p.energyCarrier : null,
      output_unit: outputUnit || null,
      meter_accuracy_pct: common.meterAccuracyPct,
      old_equipment_retired: common.oldEquipmentRetired,
      registered_elsewhere: common.registeredElsewhere,
      additionality: common.additionality,
      updated_at: new Date().toISOString(),
    };
    const saved = existing
      ? await admin.from('reduction_projects').update(projectRow).eq('id', existing.id).eq('user_id', user.id).select('*').single()
      : await admin.from('reduction_projects').insert(projectRow).select('*').single();
    if (saved.error || !saved.data) return json({ error: 'Could not save the project.' }, 500);
    const projectId = saved.data.id;

    // Periods are replaced as a set (the form always sends the full list).
    const del = await admin.from('reduction_periods').delete().eq('project_id', projectId);
    if (del.error) return json({ error: 'Could not save the periods.' }, 500);
    if (periods.length) {
      const ins = await admin.from('reduction_periods').insert(periods.map((r) => ({
        project_id: projectId, phase: r.phase, period_start: r.periodStart, period_end: r.periodEnd,
        old_fuel_qty: r.oldFuelQty, new_energy_qty: r.newEnergyQty, energy_qty: r.energyQty, output_qty: r.outputQty, evidence: r.evidence,
      })));
      if (ins.error) return json({ error: 'Could not save the periods.' }, 500);
    }

    const usesGrid = lever === 'fuel_switch' ? p.newEnergy === 'GRID_ELECTRICITY' : p.energyCarrier === 'GRID_ELECTRICITY';
    const inputsHash = await sha256Hex(JSON.stringify({ lever, project: projectRow, periods, factorId: usesGrid ? factorRow?.id ?? null : null }));
    const stored = await admin.from('credit_signals').insert({
      project_id: projectId, method_id: signal.method.id, method_version: signal.method.version, status: signal.status,
      monitoring_start: signal.monitoringStart, monitoring_end: signal.monitoringEnd,
      eligible_kwh: usesGrid && lever === 'energy_efficiency' ? Math.max(0, signal.quantitySaved) : 0,
      factor_id: signal.status === 'ready' && usesGrid ? factorRow?.id ?? null : null,
      baseline_tco2e: signal.baselineTco2e, project_tco2e: signal.projectTco2e,
      central_tco2e: signal.centralTco2e, conservative_tco2e: signal.conservativeTco2e,
      uncertainty_pct: signal.conservativeDeductionPct, checks: signal.checks, inputs_hash: inputsHash,
      details: {
        lever, quantitySaved: signal.quantitySaved, quantityUnit: signal.quantityUnit,
        baselineStart: signal.baselineStart, baselineEnd: signal.baselineEnd, baselineDays: signal.baselineDays,
        monitoringDays: signal.monitoringDays, excludedPeriods: signal.excludedPeriods, periods: signal.periods,
        additionality: signal.additionality, notes: signal.notes,
      },
    }).select('*').single();
    if (stored.error) return json({ error: 'Could not store the signal.' }, 500);
    return json({ project: saved.data, signal: stored.data, preview: signal, factor });
  } catch (error) {
    console.error('reduction-signal failed:', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Something went wrong. Nothing was changed.' }, 500);
  }
});
