/**
 * Net-Zero Goal Engine
 *
 * Every number here is either
 *   - a constant with a published source (the platform's own emission
 *     factors, IPCC 2006 defaults, or the GHG Protocol's accounting rules), or
 *   - an assumption about the site, labelled as one, with the default stated
 *     so it can be replaced from an energy audit.
 * Each reduction is a formula over the baseline split by scope, so the result
 * can be recomputed by hand. No costs are shown: none could be sourced to a
 * current official benchmark, and an invented price is worse than none.
 */

import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '@/lib/factors';

/* ------------------------------- Constants ------------------------------- */

export interface Param {
  label: string;
  value: number;
  unit: string;
  kind: 'constant' | 'assumption';
  /** Where a constant comes from, or why an assumption has this default. */
  source: string;
  /** Assumptions only: stable key for saving edits, the default, and the valid range. */
  key?: string;
  default?: number;
  min?: number;
  max?: number;
  step?: number;
}

/** Values a user entered for assumptions, by key. Missing keys use the default. */
export type AssumptionValues = Record<string, number>;

/** IPCC 2006 Guidelines, Vol. 2, Ch. 2, Table 2.2: default CO2 emission factors for stationary combustion. */
export const IPCC_CO2_KG_PER_TJ = { diesel: 74_100, naturalGas: 56_100 } as const;

const C = {
  grid: { label: 'Grid emission factor', value: INDIA_GRID_FACTOR_KG_PER_KWH, unit: 'kgCO2/kWh', kind: 'constant', source: 'CEA CO2 Baseline Database, India weighted average; the factor Senseible applies to electricity bills' },
  diesel: { label: 'Diesel emission factor', value: FUEL_FACTORS.DIESEL.value, unit: 'kgCO2/L', kind: 'constant', source: 'Platform factor for diesel (IPCC 2006 basis)' },
  dieselCo2PerTj: { label: 'Diesel CO2 per energy', value: IPCC_CO2_KG_PER_TJ.diesel, unit: 'kgCO2/TJ', kind: 'constant', source: 'IPCC 2006, Vol. 2, Table 2.2 (gas/diesel oil)' },
  gasCo2PerTj: { label: 'Natural gas CO2 per energy', value: IPCC_CO2_KG_PER_TJ.naturalGas, unit: 'kgCO2/TJ', kind: 'constant', source: 'IPCC 2006, Vol. 2, Table 2.2 (natural gas)' },
} satisfies Record<string, Param>;

/* ------------------------------- Baseline ------------------------------- */

export interface Baseline { scope1Kg: number; scope2Kg: number; scope3Kg: number; totalKg: number }

/** A baseline from monthly electricity (kWh) and diesel (litres), with the platform's own factors. */
export function baselineFromUsage(monthlyKwh: number, monthlyDieselL: number): Baseline {
  const scope2Kg = Math.max(0, monthlyKwh) * 12 * C.grid.value;
  const scope1Kg = Math.max(0, monthlyDieselL) * 12 * C.diesel.value;
  return { scope1Kg, scope2Kg, scope3Kg: 0, totalKg: scope1Kg + scope2Kg };
}

/* -------------------------------- Sectors -------------------------------- */

/** Sectors decide which actions apply. They carry no emission numbers. */
export const SECTOR_BENCHMARKS: { id: string; name: string }[] = [
  { id: 'textile', name: 'Textiles & Apparel' },
  { id: 'steel', name: 'Iron & Steel' },
  { id: 'chemical', name: 'Chemicals' },
  { id: 'agriculture', name: 'Agriculture & Food' },
  { id: 'logistics', name: 'Logistics & Transport' },
  { id: 'construction', name: 'Construction' },
  { id: 'auto', name: 'Automotive' },
  { id: 'pharma', name: 'Pharmaceuticals' },
  { id: 'it', name: 'IT & Services' },
  { id: 'other', name: 'Other / General' },
];

/* -------------------------------- Actions -------------------------------- */

export interface ReductionAction {
  id: string;
  title: string;
  scope: 1 | 2 | 3;
  effort: 'low' | 'medium' | 'high';
  applicableSectors: string[]; // 'all' or sector ids
  /** The formula in words, using the parameter labels below. */
  formula: string;
  params: Param[];
  /** Fraction of the scope's emissions this action removes. */
  fraction: number;
  note?: string;
}

const pct = (v: number) => v / 100;

// Physical ratios used below, computed once so tests can check them.
/** Diesel → natural gas at the same useful energy: 1 − 56,100 / 74,100. */
export const GAS_SWITCH_FRACTION = 1 - IPCC_CO2_KG_PER_TJ.naturalGas / IPCC_CO2_KG_PER_TJ.diesel;
/** kgCO2 per kWh of diesel fuel energy: 74,100 kg/TJ × 3.6 × 10⁻⁶ TJ/kWh. */
export const DIESEL_KG_PER_KWH_FUEL = IPCC_CO2_KG_PER_TJ.diesel * 3.6e-6;

/** Fraction of process-heat emissions a heat pump removes against a diesel boiler; negative means it adds emissions. */
export function heatPumpFraction(cop: number, boilerEff: number): number {
  // Emissions per kWh of useful heat: fuel = EF_fuel / η_boiler; heat pump = EF_grid / COP.
  const fuel = DIESEL_KG_PER_KWH_FUEL / boilerEff;
  const hp = C.grid.value / cop;
  return 1 - hp / fuel; // negative means electrification raises emissions on this grid
}

/** The actions, with any assumptions the user has edited. Values outside the valid range are clamped. */
export function buildActions(values: AssumptionValues = {}): ReductionAction[] {
  const assumption = (key: string, label: string, def: number, unit: string, source: string, min: number, max: number, step = 1): Param => {
    const raw = Number(values[key]);
    const value = Number.isFinite(raw) && key in values ? Math.min(max, Math.max(min, raw)) : def;
    return { key, label, value, default: def, unit, kind: 'assumption', source, min, max, step };
  };
  const solarShare = assumption('solarShare', 'Electricity covered by rooftop solar', 30, '%', 'Roof-limited; replace with your installer’s design', 0, 100);
  const lightShare = assumption('lightShare', 'Lighting share of electricity', 10, '%', 'Replace with your energy audit', 0, 100);
  const ledRatio = { label: 'LED tube vs 36 W fluorescent tube', value: 18 / 36, unit: 'W/W', kind: 'constant' as const, source: 'Nameplate ratings of standard 4-ft tubes: 18 W LED replacing 36 W T8 (ballast losses ignored, so the cut is conservative)' };
  const coolShare = assumption('coolShare', 'Cooling share of electricity', 20, '%', 'Replace with your energy audit', 0, 100);
  const iseerOld = assumption('iseerOld', 'Efficiency of existing ACs (ISEER)', 3.5, '', 'Older low-star split ACs; read it from the BEE label', 1, 10, 0.1);
  const iseerNew = assumption('iseerNew', 'Efficiency of new ACs (ISEER)', 5.0, '', 'High-star inverter split ACs; read it from the BEE label', 1, 10, 0.1);
  const lossShare = assumption('lossShare', 'In-plant cable and transformer losses', 2, '% of electricity', 'Replace with your energy audit', 0, 20, 0.5);
  const pf0 = assumption('pf0', 'Power factor before', 0.85, '', 'Typical uncorrected inductive load', 0.5, 1, 0.01);
  const pf1 = assumption('pf1', 'Power factor after', 0.99, '', 'Target with capacitor banks', 0.5, 1, 0.01);
  const boilerShare = assumption('boilerShare', 'Scope 1 fuel used in boilers', 50, '%', 'Replace with your fuel records', 0, 100);
  const eff0 = assumption('eff0', 'Boiler efficiency before', 75, '%', 'Replace with a boiler efficiency test', 30, 99);
  const eff1 = assumption('eff1', 'Boiler efficiency after', 85, '%', 'Achievable with economiser and tuning; confirm with the vendor', 30, 99);
  const fleetShare = assumption('fleetShare', 'Scope 1 fuel used by vehicles', 50, '%', 'Replace with your fuel records', 0, 100);
  const heatShare = assumption('heatShare', 'Scope 1 fuel used for low-temperature process heat', 30, '%', 'Heat pumps suit heat below about 100 °C', 0, 100);
  const cop = assumption('cop', 'Heat pump COP', 3, '', 'Seasonal coefficient of performance; confirm with the vendor', 1, 8, 0.1);
  const greenShare = assumption('greenShare', 'Grid electricity moved to a green tariff', 100, '%', 'Share contracted with the DISCOM or open access', 0, 100);
  const packShare = assumption('packShare', 'Packaging share of Scope 3', 10, '%', 'Replace with your purchase records', 0, 100);
  const freightShare = assumption('freightShare', 'Inbound freight share of Scope 3', 15, '%', 'Replace with your freight invoices', 0, 100);
  const distanceCut = assumption('distanceCut', 'Shorter average sourcing distance', 50, '%', 'Depends on the suppliers you can switch to', 0, 100);
  const materialShare = assumption('materialShare', 'Material share of Scope 3 switched to recycled', 20, '%', 'Replace with your purchase records', 0, 100);
  const recycledRatio = assumption('recycledRatio', 'Recycled material footprint vs virgin', 50, '%', 'Material-specific; use the supplier’s EPD', 0, 100);
  const wasteShare = assumption('wasteShare', 'Waste share of Scope 3', 5, '%', 'Replace with your waste contractor invoices', 0, 100);
  const diverted = assumption('diverted', 'Waste diverted from landfill', 90, '%', 'Target diversion rate', 0, 100);

  return [
    // GHG Protocol Scope 2 Guidance: a green tariff lowers market-based Scope 2
    // only. This baseline is location-based (grid factor × units), so the
    // tariff cuts nothing here; counting it would mix the two methods.
    { id: 'green-tariff', title: 'Switch to green power tariff (RE100)', scope: 2, effort: 'low', applicableSectors: ['all'],
      formula: 'No cut to location-based Scope 2', params: [greenShare], fraction: 0,
      note: 'Lowers market-based Scope 2 by the share contracted (GHG Protocol Scope 2 Guidance). The location-based baseline used here does not change, so it is reported alongside, not subtracted.' },
    { id: 'solar-rooftop', title: 'Install rooftop solar', scope: 2, effort: 'medium', applicableSectors: ['all'],
      formula: 'Scope 2 × share of electricity covered by solar', params: [solarShare, C.grid], fraction: pct(solarShare.value),
      note: 'Each kWh generated on site and used replaces one grid kWh at the grid factor.' },
    { id: 'led-lighting', title: 'Upgrade to LED lighting throughout', scope: 2, effort: 'low', applicableSectors: ['all'],
      formula: 'Scope 2 × lighting share × (1 − LED watts ÷ fluorescent watts)', params: [lightShare, ledRatio], fraction: Math.max(0, pct(lightShare.value) * (1 - ledRatio.value)) },
    { id: 'hvac-upgrade', title: 'Upgrade air conditioning to high-star inverter units', scope: 2, effort: 'medium', applicableSectors: ['all'],
      formula: 'Scope 2 × cooling share × (1 − old ISEER ÷ new ISEER)', params: [coolShare, iseerOld, iseerNew], fraction: Math.max(0, pct(coolShare.value) * (1 - iseerOld.value / iseerNew.value)),
      note: 'For the same cooling, electricity use is inversely proportional to efficiency.' },
    { id: 'power-factor', title: 'Improve power factor to 0.99', scope: 2, effort: 'low', applicableSectors: ['all'],
      formula: 'Scope 2 × in-plant losses × (1 − (PF before ÷ PF after)²)', params: [lossShare, pf0, pf1], fraction: Math.max(0, pct(lossShare.value) * (1 - (pf0.value / pf1.value) ** 2)),
      note: 'Resistive losses scale with current squared, and current with 1 ÷ power factor. The main gain is on kVAh charges, not emissions.' },
    { id: 'fuel-switch-gas', title: 'Switch from diesel/furnace oil to natural gas', scope: 1, effort: 'high', applicableSectors: ['steel', 'chemical', 'textile', 'construction'],
      formula: 'Scope 1 × (1 − natural gas CO2 per TJ ÷ diesel CO2 per TJ)', params: [C.gasCo2PerTj, C.dieselCo2PerTj], fraction: GAS_SWITCH_FRACTION,
      note: 'Same useful energy assumed; efficiency gains from new burners would add to this.' },
    { id: 'boiler-efficiency', title: 'Upgrade boiler efficiency', scope: 1, effort: 'medium', applicableSectors: ['textile', 'chemical', 'pharma'],
      formula: 'Scope 1 × boiler share × (1 − efficiency before ÷ efficiency after)', params: [boilerShare, eff0, eff1], fraction: Math.max(0, pct(boilerShare.value) * (1 - eff0.value / eff1.value)),
      note: 'Fuel for the same steam is inversely proportional to boiler efficiency.' },
    { id: 'ev-fleet', title: 'Move fleet from diesel to CNG', scope: 1, effort: 'high', applicableSectors: ['logistics', 'all'],
      formula: 'Scope 1 × vehicle share × (1 − natural gas CO2 per TJ ÷ diesel CO2 per TJ)', params: [fleetShare, C.gasCo2PerTj, C.dieselCo2PerTj], fraction: pct(fleetShare.value) * GAS_SWITCH_FRACTION,
      note: 'Combustion CO2 only, at equal energy per km. Electric vehicles are assessed separately against the grid factor.' },
    { id: 'process-heat', title: 'Electrify low-temperature process heat with heat pumps', scope: 1, effort: 'high', applicableSectors: ['steel', 'chemical', 'auto', 'textile', 'pharma', 'agriculture'],
      formula: 'Scope 1 × heat share × (1 − (grid factor ÷ COP) ÷ (diesel CO2 per kWh ÷ boiler efficiency))', params: [heatShare, cop, C.grid, eff0], fraction: pct(heatShare.value) * Math.max(0, heatPumpFraction(cop.value, pct(eff0.value))),
      note: 'Plain electric resistance heating would raise emissions on a 0.675 kg/kWh grid; only heat pumps with a COP above about 1.9 cut them (break-even COP = grid factor ÷ (diesel CO2 per kWh ÷ boiler efficiency)).' },
    { id: 'local-sourcing', title: 'Shift to local/regional suppliers', scope: 3, effort: 'medium', applicableSectors: ['all'],
      formula: 'Scope 3 × freight share × shorter distance', params: [freightShare, distanceCut], fraction: pct(freightShare.value) * pct(distanceCut.value),
      note: 'Freight emissions scale with tonne-kilometres.' },
    { id: 'packaging-reduce', title: 'Reduce packaging weight by 30%', scope: 3, effort: 'low', applicableSectors: ['all'],
      formula: 'Scope 3 × packaging share × 30% lighter', params: [packShare], fraction: pct(packShare.value) * 0.3,
      note: 'Material emissions scale with mass for the same material.' },
    { id: 'recycled-inputs', title: 'Switch to recycled raw materials', scope: 3, effort: 'medium', applicableSectors: ['textile', 'auto', 'construction'],
      formula: 'Scope 3 × material share × (1 − recycled ÷ virgin footprint)', params: [materialShare, recycledRatio], fraction: pct(materialShare.value) * (1 - pct(recycledRatio.value)) },
    { id: 'waste-diversion', title: 'Achieve 90% waste diversion from landfill', scope: 3, effort: 'medium', applicableSectors: ['all'],
      formula: 'Scope 3 × waste share × diverted share', params: [wasteShare, diverted], fraction: pct(wasteShare.value) * pct(diverted.value),
      note: 'Assumes diverted waste has negligible emissions next to landfill; recycling processes add some back.' },
    { id: 'supplier-engagement', title: 'Supplier carbon disclosure program', scope: 3, effort: 'low', applicableSectors: ['all'],
      formula: 'No direct cut', params: [], fraction: 0,
      note: 'Replaces spend estimates with suppliers’ own data. Cuts follow from what suppliers then change.' },
  ];
}

/** The actions at their default assumptions. */
export const REDUCTION_STRATEGIES: ReductionAction[] = buildActions();

/** Keeps only known assumption keys with finite numbers, for saving and restoring. */
export function cleanAssumptions(input: unknown): AssumptionValues {
  const known = new Set(REDUCTION_STRATEGIES.flatMap(a => a.params.map(p => p.key).filter(Boolean) as string[]));
  const out: AssumptionValues = {};
  if (input && typeof input === 'object') {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (known.has(k) && typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
  }
  return out;
}

/** kgCO2e an action removes from a given baseline. */
export function actionCutKg(a: ReductionAction, b: Baseline): number {
  const scopeKg = a.scope === 1 ? b.scope1Kg : a.scope === 2 ? b.scope2Kg : b.scope3Kg;
  return Math.round(scopeKg * a.fraction);
}

/* ------------------------------ Feasibility ------------------------------ */

export interface RecommendedAction extends ReductionAction { cutKg: number }

export interface FeasibilityResult {
  baselineCo2Kg: number;
  targetReductionPct: number;
  targetReductionKg: number;
  targetCo2Kg: number;
  timelineMonths: number;
  isFeasible: boolean;
  feasibilityNote: string;
  recommendedActions: RecommendedAction[];
  /** kgCO2e the recommended actions would cut together. */
  totalEstimatedCutKg: number;
}

const EFFORT_WEIGHT = { low: 1, medium: 2, high: 3 } as const;

export function calculateFeasibility(baseline: Baseline, targetReductionPct: number, timelineMonths: number, sectorId: string, assumptions: AssumptionValues = {}): FeasibilityResult {
  const actions = Object.keys(assumptions).length ? buildActions(assumptions) : REDUCTION_STRATEGIES;
  const baselineCo2Kg = Math.round(baseline.totalKg);
  const targetReductionKg = Math.round(baselineCo2Kg * (targetReductionPct / 100));

  // Applicable actions with a real cut on this baseline, best cut for the effort first.
  // Actions on the same Scope 2 electricity overlap (a green tariff for all
  // units leaves nothing for solar to cut), so each pick is applied to what
  // the earlier picks left in its scope.
  const remaining = { 1: baseline.scope1Kg, 2: baseline.scope2Kg, 3: baseline.scope3Kg } as Record<1 | 2 | 3, number>;
  const candidates = actions
    .filter(a => a.applicableSectors.includes('all') || a.applicableSectors.includes(sectorId))
    .map(a => ({ a, score: actionCutKg(a, baseline) / EFFORT_WEIGHT[a.effort] }))
    .filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score);

  const recommended: RecommendedAction[] = [];
  let total = 0;
  for (const { a } of candidates) {
    if (total >= targetReductionKg) break;
    const cut = Math.round(remaining[a.scope] * a.fraction);
    if (cut <= 0) continue;
    remaining[a.scope] -= cut;
    total += cut;
    recommended.push({ ...a, cutKg: cut });
  }

  const isFeasible = targetReductionKg > 0 && total >= targetReductionKg;
  const feasibilityNote = baselineCo2Kg <= 0
    ? 'Add your electricity and fuel use, or upload bills, to size a target.'
    : isFeasible
      ? `${recommended.length} actions together cover the target cut on this baseline.`
      : `These actions cover about ${Math.round((total / Math.max(1, targetReductionKg)) * 100)}% of the target. Close the gap with deeper changes or a later date.`;

  return {
    baselineCo2Kg,
    targetReductionPct,
    targetReductionKg,
    targetCo2Kg: baselineCo2Kg - targetReductionKg,
    timelineMonths,
    isFeasible,
    feasibilityNote,
    recommendedActions: recommended,
    totalEstimatedCutKg: total,
  };
}

/* ------------------------------ Progress ------------------------------ */

/**
 * SBTi near-term criteria: a 1.5°C-aligned Scope 1 and 2 target needs at
 * least a 4.2% linear absolute reduction a year (SBTi Corporate Near-Term
 * Criteria, absolute contraction approach).
 */
export const SBTI_MIN_ANNUAL_PCT = 4.2;

export function sbtiPace(targetReductionPct: number, timelineMonths: number): { annualPct: number; meets: boolean } {
  const years = Math.max(timelineMonths, 1) / 12;
  const annualPct = targetReductionPct / years;
  return { annualPct: Math.round(annualPct * 10) / 10, meets: annualPct >= SBTI_MIN_ANNUAL_PCT };
}

/** kgCO2e cut by the recommended actions marked done. Never above the baseline. */
export function estimatedCutKg(baselineCo2Kg: number, actions: RecommendedAction[], statuses: Record<string, string>): number {
  const kg = actions.filter(a => statuses[a.id] === 'done').reduce((s, a) => s + a.cutKg, 0);
  return Math.min(baselineCo2Kg, Math.round(kg));
}

export type BadgeKey = 'baseline' | 'locked' | 'pace' | 'first' | 'halfway' | 'target' | 'report';

export interface GameState {
  hasBaselineData: boolean;
  goalSaved: boolean;
  paceMeets: boolean;
  doneCount: number;
  progressPct: number;
  reportExported: boolean;
}

/** Badges are earned from real state only: data uploaded, goal saved, actions marked done, report exported. */
export function earnedBadges(s: GameState): BadgeKey[] {
  const out: BadgeKey[] = [];
  if (s.hasBaselineData) out.push('baseline');
  if (s.goalSaved) out.push('locked');
  if (s.paceMeets) out.push('pace');
  if (s.doneCount > 0) out.push('first');
  if (s.progressPct >= 50) out.push('halfway');
  if (s.progressPct >= 100) out.push('target');
  if (s.reportExported) out.push('report');
  return out;
}

/** Target date stored for a timeline choice: 12 or 36 months from `from`, or the end of 2030. */
export function targetDateFor(timelineMonths: number, from = new Date()): string {
  if (timelineMonths >= 60) return '2030-12-31';
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + timelineMonths, from.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

/** The timeline choice a stored goal was saved with. */
export function timelineFromGoal(targetDate: string, createdAt: string): '12' | '36' | '60' {
  if (targetDate.startsWith('2030-12-31')) return '60';
  const months = (new Date(targetDate).getTime() - new Date(createdAt).getTime()) / (30.44 * 86_400_000);
  return months > 24 ? '36' : '12';
}

export function formatCo2(kgValue: number): string {
  if (kgValue >= 1000000) return `${(kgValue / 1000).toFixed(0)} tCO₂`;
  if (kgValue >= 1000) return `${(kgValue / 1000).toFixed(1)} tCO₂`;
  return `${Math.round(kgValue)} kgCO₂`;
}

/** Formats a parameter value with its unit. */
export function formatParam(p: Param): string {
  const v = p.unit === 'W/W' ? `${Math.round(p.value * 100)}%` : p.value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
  return p.unit && p.unit !== 'W/W' ? `${v} ${p.unit}` : v;
}
