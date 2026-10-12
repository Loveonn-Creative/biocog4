// Rooftop solar reduction signal. Pure: shared by the solar-signal edge
// function (which stores signals) and the website (which previews them).
//
// Method (SOLAR_METHOD): ISO 14064-2 project accounting with the arithmetic
// of CDM small-scale methodology AMS-I.F (renewable electricity for captive
// use): the grid electricity a rooftop system displaces is its metered
// generation, and the reduction is that generation times the grid's
// combined-margin emission factor from the CDM "Tool to calculate the
// emission factor for an electricity system" (for India, the CEA CO2
// Baseline Database). No factor value is written in code: one with a source
// and version must be supplied, or tonnes are withheld.
//
// Conservative by construction:
// - only metered readings inside the monitoring period count; gaps are never
//   filled or extrapolated;
// - a reading above what the panels could physically produce is excluded;
// - the conservative figure deducts the meter's accuracy class.
// The result is a signal for an offline credit process, never a credit.

export const SOLAR_METHOD = {
  id: 'SENSEIBLE-SOLAR-01',
  version: '0.1',
  basis: 'ISO 14064-2; CDM AMS-I.F arithmetic; CDM grid emission factor tool (combined margin)',
} as const;

/** Above this share of round-the-clock output a reading is not physically credible for rooftop PV. */
export const MAX_CAPACITY_FACTOR = 0.3;

export type EvidenceKind = 'net_meter_bill' | 'generation_meter' | 'inverter_export';

export interface GridFactor { kgPerKwh: number; kind: 'combined_margin'; region: string; source: string; version: string }
export interface SolarReading { periodStart: string; periodEnd: string; kwh: number; evidence: EvidenceKind }
export interface SolarInput {
  capacityKwp: number;
  commissionedOn: string;
  readings: SolarReading[];
  /** Accuracy class of the generation meter, in percent (Class 1.0 = 1). */
  meterAccuracyPct: number;
  factor: GridFactor | null;
  /** Whether the same system is already registered under another carbon programme. */
  registeredElsewhere: boolean | null;
  additionality: 'not_assessed' | 'passed_with_evidence';
}

export type CheckId = 'commissioning' | 'readings' | 'no_overlap' | 'plausible' | 'not_double_counted' | 'factor';
export interface Check { id: CheckId; label: string; pass: boolean; detail: string }

export interface SolarSignal {
  status: 'ready' | 'withheld' | 'invalid';
  method: typeof SOLAR_METHOD;
  monitoringStart: string | null;
  monitoringEnd: string | null;
  coveredDays: number;
  spanDays: number;
  eligibleKwh: number;
  excludedReadings: number;
  centralTco2e: number | null;
  conservativeTco2e: number | null;
  uncertaintyPct: number;
  additionality: SolarInput['additionality'];
  checks: Check[];
}

const DAY = 86_400_000;
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const t = (s: string) => Date.parse(`${s}T00:00:00Z`);
/** Days in a period, both ends included. */
export const periodDays = (start: string, end: string) => Math.round((t(end) - t(start)) / DAY) + 1;
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export function computeSolarSignal(input: SolarInput): SolarSignal {
  const checks: Check[] = [];
  const capacityOk = Number.isFinite(input.capacityKwp) && input.capacityKwp > 0 && input.capacityKwp <= 10_000;
  const commissionedOk = isDate(input.commissionedOn) && capacityOk;
  checks.push({ id: 'commissioning', label: 'System details', pass: commissionedOk,
    detail: commissionedOk ? `${input.capacityKwp} kWp, commissioned ${input.commissionedOn}` : 'Add the system size (kWp) and commissioning date' });

  // Readings: well-formed, after commissioning, sorted.
  const wellFormed = input.readings
    .filter((r) => isDate(r.periodStart) && isDate(r.periodEnd) && t(r.periodEnd) >= t(r.periodStart) && Number.isFinite(r.kwh) && r.kwh > 0)
    .filter((r) => !commissionedOk || t(r.periodStart) >= t(input.commissionedOn))
    .sort((a, b) => t(a.periodStart) - t(b.periodStart));
  checks.push({ id: 'readings', label: 'Metered readings', pass: wellFormed.length > 0,
    detail: wellFormed.length ? `${wellFormed.length} reading${wellFormed.length === 1 ? '' : 's'} after commissioning` : 'Add at least one metered reading after commissioning' });

  // Overlapping periods would count the same days twice.
  let overlap = false;
  for (let i = 1; i < wellFormed.length; i++) if (t(wellFormed[i].periodStart) <= t(wellFormed[i - 1].periodEnd)) overlap = true;
  checks.push({ id: 'no_overlap', label: 'No overlapping periods', pass: !overlap,
    detail: overlap ? 'Two readings cover the same days; fix the dates' : 'Each day is counted once' });

  // Physical ceiling per reading.
  let eligibleKwh = 0, excluded = 0, coveredDays = 0;
  for (const r of wellFormed) {
    const days = periodDays(r.periodStart, r.periodEnd);
    const ceiling = capacityOk ? input.capacityKwp * 24 * days * MAX_CAPACITY_FACTOR : Infinity;
    if (r.kwh > ceiling) { excluded++; continue; }
    eligibleKwh += r.kwh;
    coveredDays += days;
  }
  checks.push({ id: 'plausible', label: 'Realistic output', pass: wellFormed.length > 0 && excluded === 0,
    detail: excluded ? `${excluded} reading${excluded === 1 ? '' : 's'} above what ${input.capacityKwp} kWp can produce, left out` : 'Every reading is within what the panels can produce' });

  const doubleCounted = input.registeredElsewhere === true;
  checks.push({ id: 'not_double_counted', label: 'Not claimed elsewhere', pass: input.registeredElsewhere === false,
    detail: doubleCounted ? 'Already registered under another programme: it cannot be counted again' : input.registeredElsewhere === false ? 'Confirmed not registered under another programme' : 'Confirm the system is not registered elsewhere' });

  const f = input.factor;
  const factorOk = !!f && f.kind === 'combined_margin' && Number.isFinite(f.kgPerKwh) && f.kgPerKwh > 0 && f.kgPerKwh < 2 && !!f.source.trim() && !!f.version.trim();
  checks.push({ id: 'factor', label: 'Grid factor', pass: factorOk,
    detail: factorOk ? `${f!.kgPerKwh} kgCO2e/kWh, ${f!.source} ${f!.version}` : 'Waiting for a sourced combined-margin grid factor' });

  const monitoringStart = wellFormed[0]?.periodStart ?? null;
  const monitoringEnd = wellFormed.length ? wellFormed.reduce((m, r) => (t(r.periodEnd) > t(m) ? r.periodEnd : m), wellFormed[0].periodEnd) : null;
  const spanDays = monitoringStart && monitoringEnd ? periodDays(monitoringStart, monitoringEnd) : 0;
  const uncertaintyPct = Math.min(10, Math.max(0, Number.isFinite(input.meterAccuracyPct) ? input.meterAccuracyPct : 2));

  const invalid = !commissionedOk || overlap || doubleCounted || eligibleKwh <= 0;
  const status: SolarSignal['status'] = invalid ? 'invalid' : !factorOk || input.registeredElsewhere !== false ? 'withheld' : 'ready';
  const central = status === 'ready' ? round((eligibleKwh * f!.kgPerKwh) / 1000, 3) : null;
  const conservative = central === null ? null : round(central * (1 - uncertaintyPct / 100), 3);

  return {
    status, method: SOLAR_METHOD, monitoringStart, monitoringEnd, coveredDays, spanDays,
    eligibleKwh: round(eligibleKwh, 1), excludedReadings: excluded,
    centralTco2e: central, conservativeTco2e: conservative, uncertaintyPct,
    additionality: input.additionality, checks,
  };
}
