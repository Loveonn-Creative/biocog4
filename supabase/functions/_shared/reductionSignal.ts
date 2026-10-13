// Fuel-switch and energy-efficiency reduction signals. Pure: shared by the
// reduction-signal edge function (which stores signals) and the website
// (which previews them). Same contract as solarSignal.ts: every check is
// shown, tonnes appear only when the inputs can support them, and the result
// is a signal for an offline credit process, never a credit.
//
// Accounting (ISO 14064-2 project accounting): reduction = baseline emissions
// - project emissions, per monitoring period. Leakage is handled as a check:
// replaced equipment moved to another site stops the signal instead of being
// estimated (AMS-II.D treats transferred equipment as leakage).
//
// Method references (read from the CDM and BEE registries; paragraph numbers
// deliberately not cited until checked against the adopted PDFs):
// - Fuel switch: CDM AMS-III.B "Switching fossil fuels" v18.0 (active from
//   16 Apr 2015) covers switches between fossil fuels only. Its baseline is
//   the fuel that would have been burned to deliver the energy the project
//   delivered; that is option (b) below. A switch to grid electricity is
//   outside AMS-III.B (CDM SSC WG clarification), so it is never "ready".
// - Energy efficiency: CDM AMS-II.D "Energy efficiency and fuel switching
//   measures for industrial facilities" v13.0 (active from 4 Oct 2013), as
//   adopted for India's CCTS offset mechanism by BEE BM IN02.001 v1.0
//   (27 Mar 2025): baseline = specific energy consumption x output, allowed
//   only when baseline energy depends on production alone and stays within
//   +/-10% of its average; lower production is never credited.
// - Factors: IPCC 2006 Vol. 2 Ch. 1 Tables 1.2 and 1.4. Conservative figure
//   per CDM TOOL03 v3.0: the upper 95% limit for project fuel, and the lower
//   limit for baseline fuel. Grid electricity: the combined margin (CDM
//   TOOL05 v3.0 Option A1, computed per TOOL07; for India the CEA CO2
//   Baseline Database), supplied from the factor table with its source.
// Senseible-specific rules are marked as such.

import { FUEL_FACTORS } from './emissionFactors.ts';

export type Fuel = 'DIESEL' | 'FURNACE_OIL' | 'KEROSENE' | 'LPG' | 'PNG';
export type Energy = Fuel | 'GRID_ELECTRICITY';
export type Lever = 'fuel_switch' | 'energy_efficiency';
export type Bound = 'default' | 'lower' | 'upper';

export const FUEL_SWITCH_METHOD = {
  id: 'SENSEIBLE-FUELSWITCH-01',
  version: '0.1',
  basis: 'ISO 14064-2 project accounting; baseline structure of CDM AMS-III.B v18.0 (fossil to lower-carbon fossil); IPCC 2006 V2 Ch.1 factors with CDM TOOL03 bounds',
} as const;

export const EFFICIENCY_METHOD = {
  id: 'SENSEIBLE-EFFICIENCY-01',
  version: '0.1',
  basis: 'ISO 14064-2 project accounting; CDM AMS-II.D v13.0 as adopted by BEE BM IN02.001 v1.0 (energy per unit of output, +/-10% baseline); IPCC 2006 V2 Ch.1 factors; combined-margin grid factor (CDM TOOL05/TOOL07)',
} as const;

// ---------------------------------------------------------------------------
// Fuel data. IPCC 2006 Guidelines, Vol. 2 (Energy), Ch. 1: Table 1.2 default
// net calorific values (TJ/Gg = MJ/kg) and Table 1.4 default CO2 emission
// factors (kg CO2/TJ), each with the lower and upper limits of the 95%
// confidence interval. Volumetric fuels need a density, which IPCC does not
// give; the densities are the ones the platform's footprint factors use
// (emissionFactors.ts), so the default per-unit factor matches FUEL_FACTORS.
// ---------------------------------------------------------------------------
interface Range { default: number; lower: number; upper: number }
interface FuelSpec { unit: 'litre' | 'kg' | 'scm'; kgPerUnit: number; ncv: Range; co2PerTj: Range; label: string }

export const FUEL_SPECS: Record<Fuel, FuelSpec> = {
  // Gas/Diesel Oil. 0.84 kg/L assumed (gives the platform's 2.68 kgCO2/L).
  DIESEL: { unit: 'litre', kgPerUnit: 0.84, label: 'Diesel', ncv: { default: 43.0, lower: 41.4, upper: 43.3 }, co2PerTj: { default: 74_100, lower: 72_600, upper: 74_800 } },
  // Residual Fuel Oil. 0.95 kg/L assumed (emissionFactors.ts).
  FURNACE_OIL: { unit: 'litre', kgPerUnit: 0.95, label: 'Furnace oil', ncv: { default: 40.4, lower: 39.8, upper: 41.7 }, co2PerTj: { default: 77_400, lower: 75_500, upper: 78_800 } },
  // Other Kerosene. 0.80 kg/L assumed (emissionFactors.ts).
  KEROSENE: { unit: 'litre', kgPerUnit: 0.80, label: 'Kerosene', ncv: { default: 43.8, lower: 42.4, upper: 45.2 }, co2PerTj: { default: 71_900, lower: 70_800, upper: 73_700 } },
  // Liquefied Petroleum Gases, per kg.
  LPG: { unit: 'kg', kgPerUnit: 1, label: 'LPG', ncv: { default: 47.3, lower: 44.8, upper: 52.2 }, co2PerTj: { default: 63_100, lower: 61_600, upper: 65_600 } },
  // Natural Gas. 0.76 kg/scm assumed (emissionFactors.ts); a supplier GCV per scm should replace it.
  PNG: { unit: 'scm', kgPerUnit: 0.76, label: 'Piped natural gas', ncv: { default: 48.0, lower: 46.5, upper: 50.4 }, co2PerTj: { default: 56_100, lower: 54_300, upper: 58_300 } },
};

export const ENERGY_UNIT: Record<Energy, string> = {
  DIESEL: 'litre', FURNACE_OIL: 'litre', KEROSENE: 'litre', LPG: 'kg', PNG: 'scm', GRID_ELECTRICITY: 'kWh',
};
export const ENERGY_LABEL: Record<Energy, string> = {
  DIESEL: 'Diesel', FURNACE_OIL: 'Furnace oil', KEROSENE: 'Kerosene', LPG: 'LPG', PNG: 'Piped natural gas', GRID_ELECTRICITY: 'Grid electricity',
};
const MJ_PER_KWH = 3.6;

/** kg CO2 per unit of fuel at a chosen IPCC bound (factor and calorific value move together). */
export function fuelKgCo2PerUnit(fuel: Fuel, bound: Bound = 'default'): number {
  const s = FUEL_SPECS[fuel];
  return (s.co2PerTj[bound] * s.ncv[bound] * s.kgPerUnit) / 1e6;
}
/** Energy content (MJ, net) per unit of fuel at a chosen bound. */
export function fuelMjPerUnit(fuel: Fuel, bound: Bound = 'default'): number {
  const s = FUEL_SPECS[fuel];
  return s.ncv[bound] * s.kgPerUnit;
}
/** The platform's footprint factor for the fuel, for consistency checks. */
export const footprintFactor = (fuel: Fuel) => FUEL_FACTORS[fuel].value;

// ---------------------------------------------------------------------------
// Shared inputs and helpers
// ---------------------------------------------------------------------------
export interface GridFactor { kgPerKwh: number; kind: 'combined_margin'; region: string; source: string; version: string }

export interface Period {
  periodStart: string;
  periodEnd: string;
  /** Fuel switch: old fuel used (baseline: all; project: any still used). */
  oldFuelQty?: number | null;
  /** Fuel switch project periods: new energy used by the switched equipment. */
  newEnergyQty?: number | null;
  /** Efficiency: energy used. */
  energyQty?: number | null;
  /** Output in the project's unit. */
  outputQty?: number | null;
}

interface CommonInput {
  startedOn: string;
  baseline: Period[];
  project: Period[];
  /** Accuracy class of the meter or measurement, in percent. */
  meterAccuracyPct: number;
  factor: GridFactor | null;
  registeredElsewhere: boolean | null;
  /** True when the replaced equipment is scrapped or idle, not moved to another site. */
  oldEquipmentRetired: boolean | null;
  additionality: 'not_assessed' | 'passed_with_evidence';
}
export interface FuelSwitchInput extends CommonInput { oldFuel: Fuel; newEnergy: Energy }
export interface EfficiencyInput extends CommonInput { carrier: Energy; outputUnit: string }

export interface Check { id: string; label: string; pass: boolean; detail: string }
export interface PeriodResult { periodStart: string; periodEnd: string; baselineKg: number; projectKg: number; excluded?: string }

export interface ReductionSignal {
  lever: Lever;
  status: 'ready' | 'withheld' | 'invalid';
  method: typeof FUEL_SWITCH_METHOD | typeof EFFICIENCY_METHOD;
  baselineStart: string | null;
  baselineEnd: string | null;
  baselineDays: number;
  monitoringStart: string | null;
  monitoringEnd: string | null;
  monitoringDays: number;
  /** Central baseline and project emissions over the counted monitoring periods. */
  baselineTco2e: number | null;
  projectTco2e: number | null;
  centralTco2e: number | null;
  conservativeTco2e: number | null;
  /** How much lower the conservative figure is than the central one, in percent. */
  conservativeDeductionPct: number;
  /** Efficiency: energy saved in the carrier's unit; fuel switch: old fuel displaced. */
  quantitySaved: number;
  quantityUnit: string;
  periods: PeriodResult[];
  excludedPeriods: number;
  additionality: CommonInput['additionality'];
  checks: Check[];
  notes: string[];
}

const DAY = 86_400_000;
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const t = (s: string) => Date.parse(`${s}T00:00:00Z`);
export const periodDays = (start: string, end: string) => Math.round((t(end) - t(start)) / DAY) + 1;
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Senseible minimum: a year of baseline (12 monthly bills sum to 365 or 366; a few days of slack for billing cycles). */
export const MIN_BASELINE_DAYS = 360;
/** Credit methodologies commonly use three years of records; below this the signal says so. */
export const METHOD_BASELINE_DAYS = 3 * 365;
/** Baseline months older than this before the change are not used (Senseible rule). */
export const MAX_BASELINE_LOOKBACK_DAYS = 3 * 366;

/** Two-sided 90% Student t critical values (one-sided 95%) by degrees of freedom. */
const T90: Record<number, number> = {
  1: 6.314, 2: 2.92, 3: 2.353, 4: 2.132, 5: 2.015, 6: 1.943, 7: 1.895, 8: 1.86, 9: 1.833, 10: 1.812,
  11: 1.796, 12: 1.782, 13: 1.771, 14: 1.761, 15: 1.753, 16: 1.746, 17: 1.74, 18: 1.734, 19: 1.729, 20: 1.725,
  21: 1.721, 22: 1.717, 23: 1.714, 24: 1.711, 25: 1.708, 26: 1.706, 27: 1.703, 28: 1.701, 29: 1.699, 30: 1.697,
};
export function tCritical90(df: number): number {
  if (df < 1) return Infinity;
  if (T90[df]) return T90[df];
  if (df <= 40) return 1.684;
  if (df <= 60) return 1.671;
  if (df <= 120) return 1.658;
  return 1.645;
}

/**
 * Mean of a per-period ratio (weighted by the denominator) and the lower
 * limit of its two-sided 90% confidence interval, from the spread of the
 * per-period ratios. Never below zero.
 */
export function ratioWithLowerBound(nums: number[], dens: number[]): { mean: number; lower: number; cv: number } {
  const sumN = nums.reduce((a, b) => a + b, 0), sumD = dens.reduce((a, b) => a + b, 0);
  const mean = sumD > 0 ? sumN / sumD : 0;
  const ratios = nums.map((n, i) => (dens[i] > 0 ? n / dens[i] : 0));
  const k = ratios.length;
  if (k < 2) return { mean, lower: 0, cv: Infinity };
  const avg = ratios.reduce((a, b) => a + b, 0) / k;
  const sd = Math.sqrt(ratios.reduce((a, r) => a + (r - avg) ** 2, 0) / (k - 1));
  const lower = Math.max(0, mean - tCritical90(k - 1) * (sd / Math.sqrt(k)));
  return { mean, lower, cv: avg > 0 ? sd / avg : Infinity };
}

interface Split { baseline: Period[]; project: Period[]; overlap: boolean; straddling: number }
function splitPeriods(input: CommonInput): Split {
  const clean = (ps: Period[]) => ps.filter((p) => isDate(p.periodStart) && isDate(p.periodEnd) && t(p.periodEnd) >= t(p.periodStart))
    .sort((a, b) => t(a.periodStart) - t(b.periodStart));
  const start = isDate(input.startedOn) ? t(input.startedOn) : NaN;
  const b = clean(input.baseline), p = clean(input.project);
  const baseline = b.filter((x) => t(x.periodEnd) < start && start - t(x.periodStart) <= MAX_BASELINE_LOOKBACK_DAYS * DAY);
  const project = p.filter((x) => t(x.periodStart) >= start);
  const straddling = b.length - baseline.length + (p.length - project.length);
  const overlaps = (ps: Period[]) => ps.some((x, i) => i > 0 && t(x.periodStart) <= t(ps[i - 1].periodEnd));
  return { baseline, project, overlap: overlaps(baseline) || overlaps(project), straddling };
}

function span(ps: Period[]) {
  if (!ps.length) return { start: null as string | null, end: null as string | null, days: 0 };
  const end = ps.reduce((m, x) => (t(x.periodEnd) > t(m) ? x.periodEnd : m), ps[0].periodEnd);
  return { start: ps[0].periodStart, end, days: ps.reduce((a, x) => a + periodDays(x.periodStart, x.periodEnd), 0) };
}

function factorOk(f: GridFactor | null): f is GridFactor {
  return !!f && f.kind === 'combined_margin' && Number.isFinite(f.kgPerKwh) && f.kgPerKwh > 0 && f.kgPerKwh < 2 && !!f.source?.trim() && !!f.version?.trim();
}

function commonChecks(input: CommonInput, needsGrid: boolean) {
  const checks: Check[] = [];
  const doubleCounted = input.registeredElsewhere === true;
  checks.push({ id: 'not_double_counted', label: 'Not claimed elsewhere', pass: input.registeredElsewhere === false,
    detail: doubleCounted ? 'Already registered under another programme: it cannot be counted again' : input.registeredElsewhere === false ? 'Confirmed not registered under another programme' : 'Confirm the change is not registered elsewhere' });
  const moved = input.oldEquipmentRetired === false;
  checks.push({ id: 'no_leakage', label: 'Old equipment retired', pass: input.oldEquipmentRetired === true,
    detail: moved ? 'The replaced equipment runs elsewhere, so its emissions moved instead of stopping' : input.oldEquipmentRetired === true ? 'Replaced equipment is scrapped or idle' : 'Confirm the replaced equipment is scrapped or idle, not moved to another site' });
  const gridOk = !needsGrid || factorOk(input.factor);
  if (needsGrid) checks.push({ id: 'factor', label: 'Grid factor', pass: gridOk,
    detail: gridOk ? `${input.factor!.kgPerKwh} kgCO2e/kWh, ${input.factor!.source} ${input.factor!.version}` : 'Waiting for a sourced combined-margin grid factor' });
  return { checks, doubleCounted, moved, gridOk, confirmed: input.registeredElsewhere === false && input.oldEquipmentRetired === true };
}

function finish(
  lever: Lever, method: ReductionSignal['method'], input: CommonInput, split: Split, checks: Check[],
  periods: PeriodResult[], central: { be: number; pe: number }, conservativeKg: number,
  quantitySaved: number, quantityUnit: string, invalid: boolean, withheld: boolean, notes: string[],
  /** Whether the inputs can say if emissions fell: a year of baseline and every factor present. */
  canJudge: boolean,
): ReductionSignal {
  const b = span(split.baseline), m = span(split.project.filter((_, i) => !periods[i]?.excluded));
  const centralKg = central.be - central.pe;
  const counted = periods.some((p) => !p.excluded);
  const noReduction = !invalid && canJudge && counted && centralKg <= 0;
  if (!canJudge || !counted) checks.push({ id: 'reduction', label: 'Emissions fall', pass: false, detail: 'Shown once the baseline year and factors are in place' });
  else if (noReduction) checks.push({ id: 'reduction', label: 'Emissions fall', pass: false, detail: 'On these figures the change does not lower emissions' });
  else checks.push({ id: 'reduction', label: 'Emissions fall', pass: true, detail: 'Project emissions are below the baseline' });
  const status: ReductionSignal['status'] = invalid || noReduction ? 'invalid' : withheld ? 'withheld' : 'ready';
  const ready = status === 'ready';
  const c = ready ? round(centralKg / 1000, 3) : null;
  const cons = ready ? round(Math.max(0, Math.min(conservativeKg, centralKg)) / 1000, 3) : null;
  return {
    lever, status, method,
    baselineStart: b.start, baselineEnd: b.end, baselineDays: b.days,
    monitoringStart: m.start, monitoringEnd: m.end, monitoringDays: m.days,
    baselineTco2e: ready ? round(central.be / 1000, 3) : null,
    projectTco2e: ready ? round(central.pe / 1000, 3) : null,
    centralTco2e: c, conservativeTco2e: cons,
    conservativeDeductionPct: c && cons !== null && c > 0 ? round((1 - cons / c) * 100, 1) : 0,
    quantitySaved: round(quantitySaved, 1), quantityUnit,
    periods, excludedPeriods: periods.filter((p) => p.excluded).length,
    additionality: input.additionality, checks, notes,
  };
}

// ---------------------------------------------------------------------------
// Fuel switch
// ---------------------------------------------------------------------------
/**
 * Baseline per monitoring period is the LOWER of (Senseible rule, both sides
 * conservative):
 *  (a) historical old-fuel use: the baseline rate per day, or per unit of
 *      output when output is recorded for every period (output capped at the
 *      highest daily output seen in the baseline), so growth is not credited;
 *  (b) the old fuel needed to supply the energy the new source delivered, at
 *      equal efficiency, so lower production is not credited either.
 * Project emissions are any old fuel still used plus the new energy.
 * Conservative figure: baseline rate at the lower 90% confidence limit,
 * baseline fuel factor at the IPCC lower limit, project fuel factor at the
 * IPCC upper limit, and the meter accuracy added to the new energy.
 */
export function computeFuelSwitchSignal(input: FuelSwitchInput): ReductionSignal {
  const checks: Check[] = [];
  const notes: string[] = [];
  const validSetup = !!FUEL_SPECS[input.oldFuel] && !!ENERGY_UNIT[input.newEnergy] && input.oldFuel !== input.newEnergy && isDate(input.startedOn);
  checks.push({ id: 'setup', label: 'What changed', pass: validSetup,
    detail: validSetup ? `${ENERGY_LABEL[input.oldFuel]} to ${ENERGY_LABEL[input.newEnergy].toLowerCase()} from ${input.startedOn}` : 'Choose the old fuel, the new energy and the date of the change' });

  const split = splitPeriods(input);
  const base = split.baseline.filter((p) => num(p.oldFuelQty) !== null && p.oldFuelQty! >= 0);
  const proj = split.project.filter((p) => num(p.newEnergyQty) !== null && p.newEnergyQty! >= 0);
  const bSpan = span(base);
  const baselineOk = bSpan.days >= MIN_BASELINE_DAYS && base.some((p) => p.oldFuelQty! > 0);
  checks.push({ id: 'baseline', label: 'A year before the change', pass: baselineOk,
    detail: baselineOk ? `${base.length} periods, ${bSpan.days} days of ${ENERGY_LABEL[input.oldFuel].toLowerCase()} use before ${input.startedOn}` : `Add at least 12 months of ${validSetup ? ENERGY_LABEL[input.oldFuel].toLowerCase() : 'old fuel'} use before the change (${bSpan.days} days so far)` });
  checks.push({ id: 'monitoring', label: 'Readings after the change', pass: proj.length > 0,
    detail: proj.length ? `${proj.length} period${proj.length === 1 ? '' : 's'} after the change` : 'Add the new energy used in at least one period after the change' });
  checks.push({ id: 'no_overlap', label: 'No overlapping periods', pass: !split.overlap,
    detail: split.overlap ? 'Two periods cover the same days; fix the dates' : split.straddling ? `${split.straddling} period${split.straddling === 1 ? '' : 's'} crossing the change date left out` : 'Each day is counted once' });

  const needsGrid = input.newEnergy === 'GRID_ELECTRICITY';
  const common = commonChecks(input, needsGrid);
  checks.push(...common.checks);
  // AMS-III.B covers switches between fossil fuels; electrification is outside it.
  checks.push({ id: 'method_scope', label: 'Covered by the method', pass: !needsGrid,
    detail: needsGrid ? 'A switch from fuel to grid electricity is outside CDM AMS-III.B: shown for planning, not for a credit' : 'A switch between fossil fuels, as in CDM AMS-III.B' });
  if (baselineOk && bSpan.days < METHOD_BASELINE_DAYS) notes.push('Credit methodologies commonly use three years of records before the change; this signal uses at least one.');

  // Historical rate: per output when every baseline and monitoring period records it.
  const withOutput = base.length > 0 && proj.length > 0 && [...base, ...proj].every((p) => (num(p.outputQty) ?? 0) > 0);
  const dens = base.map((p) => (withOutput ? p.outputQty! : periodDays(p.periodStart, p.periodEnd)));
  const rate = ratioWithLowerBound(base.map((p) => p.oldFuelQty!), dens);
  const maxDailyOutput = withOutput ? Math.max(...base.map((p) => p.outputQty! / periodDays(p.periodStart, p.periodEnd))) : 0;
  notes.push(withOutput ? `Baseline is fuel per unit of output (output recorded every period).` : 'Baseline is fuel per day; record output every period to normalise it.');

  const mjOld = validSetup && FUEL_SPECS[input.oldFuel] ? fuelMjPerUnit(input.oldFuel) : 0;
  const mjNew = !validSetup ? 0 : needsGrid ? MJ_PER_KWH : fuelMjPerUnit(input.newEnergy as Fuel);
  const efOld = (b: Bound) => (validSetup ? fuelKgCo2PerUnit(input.oldFuel, b) : 0);
  const efNew = (b: Bound) => (!validSetup ? 0 : needsGrid ? (common.gridOk ? input.factor!.kgPerKwh : 0) : fuelKgCo2PerUnit(input.newEnergy as Fuel, b));
  const acc = Math.min(10, Math.max(0, Number.isFinite(input.meterAccuracyPct) ? input.meterAccuracyPct : 2)) / 100;

  let be = 0, pe = 0, consBe = 0, consPe = 0, displaced = 0;
  const periods: PeriodResult[] = proj.map((p) => {
    const days = periodDays(p.periodStart, p.periodEnd);
    const out = withOutput ? Math.min(p.outputQty!, maxDailyOutput * days) : days;
    const remaining = num(p.oldFuelQty) ?? 0;
    const newQty = p.newEnergyQty!;
    // (a) historical, (b) energy-equivalent; the lower one counts.
    const histQty = rate.mean * out, histQtyLow = rate.lower * out;
    const equivQty = mjOld > 0 ? remaining + (newQty * mjNew) / mjOld : 0;
    const equivQtyLow = mjOld > 0 ? remaining + (newQty * (1 - acc) * mjNew) / mjOld : 0;
    const baseQty = Math.min(histQty, equivQty), baseQtyLow = Math.min(histQtyLow, equivQtyLow);
    const bKg = baseQty * efOld('default');
    const pKg = remaining * efOld('default') + newQty * efNew('default');
    be += bKg; pe += pKg;
    consBe += baseQtyLow * efOld('lower');
    consPe += remaining * efOld('upper') + newQty * (1 + acc) * efNew('upper');
    displaced += Math.max(0, baseQty - remaining);
    return { periodStart: p.periodStart, periodEnd: p.periodEnd, baselineKg: round(bKg, 1), projectKg: round(pKg, 1) };
  });
  if (needsGrid) notes.push('Electrification lowers emissions only when the grid factor is below the old fuel\'s emissions for the same energy; equal efficiency is assumed.');

  const invalid = !validSetup || split.overlap || common.doubleCounted || common.moved || proj.length === 0;
  const withheld = !baselineOk || !common.gridOk || !common.confirmed || needsGrid;
  return finish('fuel_switch', FUEL_SWITCH_METHOD, input, { ...split, project: proj }, checks, periods,
    { be, pe }, consBe - consPe, displaced, validSetup ? ENERGY_UNIT[input.oldFuel] : '', invalid, withheld, notes, baselineOk && common.gridOk);
}

// ---------------------------------------------------------------------------
// Energy efficiency
// ---------------------------------------------------------------------------
/** BEE BM IN02.001 (from AMS-II.D): energy per unit of output may be used only if it stays within +/-10% of its average. */
export const MAX_SEC_DEVIATION = 0.1;
/** Monitoring periods whose daily output is outside the baseline range by more than this are left out (Senseible rule). */
export const OUTPUT_RANGE_TOLERANCE = 0.1;

/**
 * Savings per monitoring period = baseline energy per unit of output x the
 * period's output - energy actually used; reduction = savings x the
 * carrier's factor. Periods whose daily output lies outside the baseline's
 * range (+/-10%) are left out, so the baseline is never extrapolated.
 * Conservative figure: baseline energy per unit at the lower 90% confidence
 * limit, meter accuracy added to the energy used, and the IPCC lower limit
 * for a fuel carrier.
 */
export function computeEfficiencySignal(input: EfficiencyInput): ReductionSignal {
  const checks: Check[] = [];
  const notes: string[] = [];
  const unitOk = typeof input.outputUnit === 'string' && input.outputUnit.trim().length > 0;
  const validSetup = !!ENERGY_UNIT[input.carrier] && isDate(input.startedOn) && unitOk;
  checks.push({ id: 'setup', label: 'What changed', pass: validSetup,
    detail: validSetup ? `${ENERGY_LABEL[input.carrier]} per ${input.outputUnit.trim()}, changed ${input.startedOn}` : 'Choose the energy measured, the output unit and the date of the change' });

  const split = splitPeriods(input);
  const good = (p: Period) => (num(p.energyQty) ?? -1) >= 0 && (num(p.outputQty) ?? 0) > 0;
  const base = split.baseline.filter(good), proj = split.project.filter(good);
  const bSpan = span(base);
  const baselineOk = bSpan.days >= MIN_BASELINE_DAYS;
  checks.push({ id: 'baseline', label: 'A year before the change', pass: baselineOk,
    detail: baselineOk ? `${base.length} periods, ${bSpan.days} days with energy and output before ${input.startedOn}` : `Add at least 12 months of energy and output before the change (${bSpan.days} days so far)` });
  checks.push({ id: 'monitoring', label: 'Readings after the change', pass: proj.length > 0,
    detail: proj.length ? `${proj.length} period${proj.length === 1 ? '' : 's'} with energy and output after the change` : 'Add energy and output for at least one period after the change' });
  const missingOutput = split.baseline.length + split.project.length - base.length - proj.length;
  checks.push({ id: 'no_overlap', label: 'No overlapping periods', pass: !split.overlap,
    detail: split.overlap ? 'Two periods cover the same days; fix the dates' : missingOutput ? `${missingOutput} period${missingOutput === 1 ? '' : 's'} without output left out` : 'Each day is counted once' });

  const sec = ratioWithLowerBound(base.map((p) => p.energyQty!), base.map((p) => p.outputQty!));
  const maxDev = base.length && sec.mean > 0 ? Math.max(...base.map((p) => Math.abs(p.energyQty! / p.outputQty! / sec.mean - 1))) : Infinity;
  const stable = base.length >= 2 && maxDev <= MAX_SEC_DEVIATION;
  const devPct = Number.isFinite(maxDev) ? Math.round(maxDev * 100) : null;
  checks.push({ id: 'stable_baseline', label: 'Steady baseline', pass: stable,
    detail: base.length < 2 ? 'Needs at least two baseline periods to judge' : stable ? `Energy per ${input.outputUnit} stays within ${devPct}% of its average (limit 10%)` : `Energy per ${input.outputUnit} moves up to ${devPct}% from its average; the method allows 10%` });
  if (baselineOk && bSpan.days < METHOD_BASELINE_DAYS) notes.push('Credit methodologies commonly use three years of records before the change; this signal uses at least one.');

  const needsGrid = input.carrier === 'GRID_ELECTRICITY';
  const common = commonChecks(input, needsGrid);
  checks.push(...common.checks);

  const dailyOut = base.map((p) => p.outputQty! / periodDays(p.periodStart, p.periodEnd));
  const lo = dailyOut.length ? Math.min(...dailyOut) * (1 - OUTPUT_RANGE_TOLERANCE) : 0;
  const hi = dailyOut.length ? Math.max(...dailyOut) * (1 + OUTPUT_RANGE_TOLERANCE) : 0;
  const ef = (b: Bound) => (!ENERGY_UNIT[input.carrier] ? 0 : needsGrid ? (common.gridOk ? input.factor!.kgPerKwh : 0) : fuelKgCo2PerUnit(input.carrier as Fuel, b));
  const acc = Math.min(10, Math.max(0, Number.isFinite(input.meterAccuracyPct) ? input.meterAccuracyPct : 2)) / 100;

  let be = 0, pe = 0, cons = 0, saved = 0;
  const periods: PeriodResult[] = proj.map((p) => {
    const days = periodDays(p.periodStart, p.periodEnd);
    const d = p.outputQty! / days;
    if (d < lo || d > hi) return { periodStart: p.periodStart, periodEnd: p.periodEnd, baselineKg: 0, projectKg: 0, excluded: 'Output outside the range seen before the change' };
    const baseEnergy = sec.mean * p.outputQty!;
    const bKg = baseEnergy * ef('default'), pKg = p.energyQty! * ef('default');
    be += bKg; pe += pKg; saved += baseEnergy - p.energyQty!;
    cons += (sec.lower * p.outputQty! - p.energyQty! * (1 + acc)) * ef('lower');
    return { periodStart: p.periodStart, periodEnd: p.periodEnd, baselineKg: round(bKg, 1), projectKg: round(pKg, 1) };
  });
  const excluded = periods.filter((p) => p.excluded).length;
  checks.push({ id: 'output_range', label: 'Output in the baseline range', pass: proj.length > 0 && excluded === 0,
    detail: excluded ? `${excluded} period${excluded === 1 ? '' : 's'} with output outside the range seen before the change left out` : 'Every period is within the output range of the baseline' });
  notes.push('Lower output alone is never counted as a saving: the baseline scales with output.');
  notes.push('The products made after the change must be the same as before, and savings count only for the remaining life of the replaced equipment.');

  const counted = periods.some((p) => !p.excluded);
  const invalid = !validSetup || split.overlap || common.doubleCounted || common.moved || !counted;
  const withheld = !baselineOk || !stable || !common.gridOk || !common.confirmed;
  return finish('energy_efficiency', EFFICIENCY_METHOD, input, { ...split, project: proj }, checks, periods,
    { be, pe }, cons, saved, ENERGY_UNIT[input.carrier] ?? '', invalid, withheld, notes, baselineOk && common.gridOk);
}
