// Electricity (Scope 2) emissions engine. Pure: no Deno imports, so the
// website tests run the same code the edge functions run.
//
// GHG Protocol Scope 2 Guidance (2015):
// - Location-based: consumption x the average emission factor of the grid
//   where it is consumed (regional, then national), for the period consumed.
// - Market-based: contractual instruments that meet the Scope 2 Quality
//   Criteria first (certificates, PPAs, supplier-specific rates), then a
//   residual mix for the uncovered consumption; where no residual mix exists,
//   the grid average may be used, and that is disclosed.
// - Both are reported (dual reporting) for operations in markets with choice.
// Rules this module enforces:
// - Factors are kept apart by kind. A project combined-margin factor (CEA,
//   CDM TOOL07) is for project baselines and credit signals only and is
//   NEVER returned for a corporate Scope 2 inventory.
// - Energy only: kVAh, kvarh, kW and kVA are refused, never converted.
// - Nothing is defaulted: no factor means an unresolved result with a reason,
//   never zero and never a factor from another country.
// - A bill that spans reporting years is split pro rata by days.

export const SCOPE2_METHOD = { id: 'SENSEIBLE-SCOPE2', version: '1.0' } as const;
export const SCOPE2_METHOD_VERSION = `${SCOPE2_METHOD.id}_v${SCOPE2_METHOD.version}`;

export type Method = 'location' | 'market';
export type FactorKind = 'grid_average' | 'residual_mix' | 'supplier_specific' | 'project_combined_margin';
export type Purpose = 'scope2_location' | 'scope2_market' | 'project_baseline';

/** Which factor kinds each purpose may use, in order of preference. */
export const KINDS_FOR: Record<Purpose, FactorKind[]> = {
  scope2_location: ['grid_average'],
  scope2_market: ['supplier_specific', 'residual_mix', 'grid_average'],
  project_baseline: ['project_combined_margin'],
};

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------
const ENERGY: Record<string, number> = {
  kwh: 1, 'kw.h': 1, 'kw-h': 1, kwhr: 1, 'kilowatt hour': 1, 'kilowatt hours': 1, 'kilowatt-hour': 1, 'kilowatt-hours': 1,
  mwh: 1000, 'megawatt hour': 1000, 'megawatt hours': 1000, gwh: 1_000_000, wh: 0.001,
};
const NOT_ENERGY = /^(kvah|kvarh|kw|kva|mw|mva|kvar)$/;

export type UnitResult = { kwh: number; multiplier: number } | { kwh: null; reason: 'apparent_or_reactive_energy' | 'power_not_energy' | 'unknown_unit' | 'missing_quantity' };

/**
 * Printed quantity and unit to kWh. "units" counts as kWh only on an
 * electricity bill (1 unit = 1 kWh on Indian bills) and only when asked.
 */
export function toKwh(quantity: number | null | undefined, unit: string | null | undefined, opts: { unitsMeanKwh?: boolean } = {}): UnitResult {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) return { kwh: null, reason: 'missing_quantity' };
  const u = String(unit ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '');
  if (NOT_ENERGY.test(u)) return { kwh: null, reason: u.endsWith('h') ? 'apparent_or_reactive_energy' : 'power_not_energy' };
  const m = ENERGY[u] ?? (opts.unitsMeanKwh && /^units?$/.test(u) ? 1 : undefined);
  if (m === undefined) return { kwh: null, reason: 'unknown_unit' };
  return { kwh: round6(quantity * m), multiplier: m };
}

// ---------------------------------------------------------------------------
// Reporting periods
// ---------------------------------------------------------------------------
const DAY = 86_400_000;
const t = (s: string) => Date.parse(`${s}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(t(s));
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const fmt = (n: number) => String(round6(n));

/** Month (1-12) a country's reporting year starts. India reports by April-March fiscal year; others by calendar year unless configured. */
export const REPORTING_YEAR_START: Record<string, number> = { IN: 4 };
export const yearStartMonth = (country: string) => REPORTING_YEAR_START[country] ?? 1;

/** Label of the reporting year containing a date: "FY2025-26" (April start) or "2025" (calendar). */
export function reportingYearOf(date: string, startMonth: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  if (startMonth === 1) return String(y);
  const first = m >= startMonth ? y : y - 1;
  return `FY${first}-${String((first + 1) % 100).padStart(2, '0')}`;
}
function yearBounds(label: string, startMonth: number): { start: string; end: string } {
  const first = startMonth === 1 ? Number(label) : Number(label.slice(2, 6));
  const start = Date.UTC(first, startMonth - 1, 1);
  const end = Date.UTC(startMonth === 1 ? first + 1 : first + 1, startMonth - 1, 1) - DAY;
  return { start: iso(start), end: iso(end) };
}

export interface Portion { reportingYear: string; periodStart: string; periodEnd: string; days: number; kwh: number; share: number }

/** Split consumption over the reporting years its billing period touches, pro rata by days. */
export function splitByReportingYear(kwh: number, periodStart: string, periodEnd: string, startMonth: number): Portion[] {
  if (!isDate(periodStart) || !isDate(periodEnd) || t(periodEnd) < t(periodStart)) return [];
  const total = Math.round((t(periodEnd) - t(periodStart)) / DAY) + 1;
  const out: Portion[] = [];
  let cur = periodStart;
  while (t(cur) <= t(periodEnd)) {
    const label = reportingYearOf(cur, startMonth);
    const b = yearBounds(label, startMonth);
    const end = t(b.end) < t(periodEnd) ? b.end : periodEnd;
    const days = Math.round((t(end) - t(cur)) / DAY) + 1;
    out.push({ reportingYear: label, periodStart: cur, periodEnd: end, days, kwh: 0, share: days / total });
    cur = iso(t(end) + DAY);
  }
  // Shares sum to 1; the last portion takes the rounding remainder so kWh is conserved exactly.
  let assigned = 0;
  out.forEach((p, i) => { p.kwh = i === out.length - 1 ? round6(kwh - assigned) : round6(kwh * p.share); assigned = round6(assigned + p.kwh); });
  return out;
}

// ---------------------------------------------------------------------------
// Factors
// ---------------------------------------------------------------------------
export interface ElectricityFactor {
  id: string;
  factorKey: string;
  version: string;
  kind: FactorKind;
  country: string;
  /** Grid region inside the country (e.g. an eGRID subregion); null = national. */
  gridRegion: string | null;
  /** For supplier_specific: the supplier this rate belongs to. */
  supplierRef: string | null;
  kgPerKwh: number;
  gases: 'CO2' | 'CO2e';
  validFrom: string;
  validTo: string | null;
  sourceName: string;
  sourceRef: string;
  publicationYear: number;
}

export type FactorPick =
  | { factor: ElectricityFactor; tier: 'region' | 'national'; vintage: 'covers_period' | 'prior_vintage' }
  | { factor: null; reason: 'no_factor' | 'factor_ambiguous' | 'kind_not_allowed' };

/**
 * One factor of one kind for a period: the grid region's, then the country's.
 * A factor whose validity covers the whole period wins; failing that, the most
 * recent factor published before the period (the "prior vintage" grid data
 * lag), which is flagged. Never a later vintage, another country, or a kind
 * the purpose does not allow.
 */
export function pickFactor(kind: FactorKind, purpose: Purpose, a: { country: string; gridRegion: string | null; supplierRef?: string | null; periodStart: string; periodEnd: string }, factors: ElectricityFactor[]): FactorPick {
  if (!KINDS_FOR[purpose].includes(kind)) return { factor: null, reason: 'kind_not_allowed' };
  const pool = factors.filter((f) => f.kind === kind && f.country === a.country && (kind !== 'supplier_specific' || (!!a.supplierRef && f.supplierRef === a.supplierRef)));
  const tiers: Array<['region' | 'national', ElectricityFactor[]]> = [
    ['region', a.gridRegion ? pool.filter((f) => f.gridRegion === a.gridRegion) : []],
    ['national', pool.filter((f) => f.gridRegion === null)],
  ];
  for (const [tier, list] of tiers) {
    if (!list.length) continue;
    const covering = list.filter((f) => f.validFrom <= a.periodStart && (!f.validTo || a.periodEnd <= f.validTo));
    if (covering.length) {
      if (new Set(covering.map((f) => f.factorKey)).size > 1) return { factor: null, reason: 'factor_ambiguous' };
      return { factor: latest(covering), tier, vintage: 'covers_period' };
    }
    const prior = list.filter((f) => f.validFrom <= a.periodStart);
    if (prior.length) return { factor: latest(prior), tier, vintage: 'prior_vintage' };
  }
  return { factor: null, reason: 'no_factor' };
}
const latest = (l: ElectricityFactor[]) => [...l].sort((x, y) => (x.validFrom < y.validFrom ? 1 : x.validFrom > y.validFrom ? -1 : x.publicationYear < y.publicationYear ? 1 : -1))[0];

// ---------------------------------------------------------------------------
// Contractual instruments (market-based)
// ---------------------------------------------------------------------------
export type InstrumentType = 'eac' | 'ppa' | 'green_tariff' | 'supplier_contract';
export interface Instrument {
  id: string;
  type: InstrumentType;
  /** Scheme or registry, e.g. 'I-REC', 'REC (India)', 'GO (AIB)', 'Green-e REC'. */
  scheme: string;
  /** Registry certificate id or serial range; uniqueness is enforced in the database. */
  certificateRef: string | null;
  mwh: number;
  generationCountry: string;
  generationRegion: string | null;
  vintageStart: string;
  vintageEnd: string;
  /** Emission rate the instrument conveys (0 for renewable generation). */
  kgPerKwh: number;
  retired: boolean;
  retirementRef: string | null;
  /** Evidence document (retirement statement, contract, supplier disclosure) on file. */
  evidenceDocumentId: string | null;
  /** Retired in the name of the reporting company (or on its behalf). */
  beneficiaryConfirmed: boolean;
}

/** Markets inside which certificates can be used (Scope 2 Guidance "market boundary"); otherwise the same country. */
export const MARKET_GROUPS: string[][] = [
  ['US', 'CA'],
  // European energy market for Guarantees of Origin (AIB members and EU/EEA).
  ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'NO', 'IS', 'CH'],
];
export const sameMarket = (a: string, b: string) => a === b || MARKET_GROUPS.some((g) => g.includes(a) && g.includes(b));

export interface InstrumentRules {
  /** Months before the start / after the end of the reporting year a vintage may fall (0 = the vintage must overlap the reporting year). */
  vintageToleranceMonths: number;
}
export const DEFAULT_RULES: InstrumentRules = { vintageToleranceMonths: 0 };

export interface Eligibility { eligible: boolean; reasons: string[] }

/** Scope 2 Quality Criteria checks that can be decided from the record. */
export function checkInstrument(i: Instrument, consumption: { country: string; reportingYear: string; startMonth: number }, rules: InstrumentRules = DEFAULT_RULES): Eligibility {
  const reasons: string[] = [];
  if (!(i.mwh > 0)) reasons.push('no_quantity');
  if (!(i.kgPerKwh >= 0)) reasons.push('no_emission_rate');
  if (!i.evidenceDocumentId) reasons.push('no_evidence_document');
  if (i.type === 'eac' || i.type === 'ppa') {
    if (!i.retired || !i.retirementRef) reasons.push('not_retired');
    if (!i.certificateRef) reasons.push('no_certificate_reference');
    if (!i.beneficiaryConfirmed) reasons.push('beneficiary_not_confirmed');
  }
  if (!sameMarket(i.generationCountry, consumption.country)) reasons.push('outside_market_boundary');
  if (!isDate(i.vintageStart) || !isDate(i.vintageEnd) || i.vintageEnd < i.vintageStart) reasons.push('no_vintage');
  else {
    const y = yearBounds(consumption.reportingYear, consumption.startMonth);
    const tol = rules.vintageToleranceMonths * 31 * DAY;
    if (t(i.vintageEnd) < t(y.start) - tol || t(i.vintageStart) > t(y.end) + tol) reasons.push('vintage_outside_reporting_year');
  }
  return { eligible: reasons.length === 0, reasons };
}

export interface ActivityPortion {
  activityId: string;
  country: string;
  gridRegion: string | null;
  supplierRef: string | null;
  reportingYear: string;
  periodStart: string;
  periodEnd: string;
  kwh: number;
}
export interface Allocation { instrumentId: string; activityId: string; reportingYear: string; kwh: number }

/**
 * Deterministic allocation of eligible instruments to consumption in the
 * same market and reporting year: instruments by vintage then id, consumption
 * by period then id. Never more than an instrument's remaining quantity
 * (after allocations already recorded elsewhere) nor more than a portion's kWh.
 */
export function allocate(portions: ActivityPortion[], instruments: Instrument[], already: Allocation[], startMonthOf: (country: string) => number, rules: InstrumentRules = DEFAULT_RULES): { allocations: Allocation[]; rejected: Array<{ instrumentId: string; reportingYear: string; reasons: string[] }> } {
  const used = new Map<string, number>();
  for (const a of already) used.set(a.instrumentId, round6((used.get(a.instrumentId) ?? 0) + a.kwh));
  const left = new Map(portions.map((p) => [`${p.activityId}|${p.reportingYear}`, p.kwh]));
  const allocations: Allocation[] = [];
  const rejected: Array<{ instrumentId: string; reportingYear: string; reasons: string[] }> = [];
  const insts = [...instruments].sort((a, b) => a.vintageStart.localeCompare(b.vintageStart) || a.id.localeCompare(b.id));
  const ports = [...portions].sort((a, b) => a.periodStart.localeCompare(b.periodStart) || a.activityId.localeCompare(b.activityId));
  for (const inst of insts) {
    let remaining = round6(inst.mwh * 1000 - (used.get(inst.id) ?? 0));
    const seenYears = new Set<string>();
    for (const p of ports) {
      if (remaining <= 0) break;
      const e = checkInstrument(inst, { country: p.country, reportingYear: p.reportingYear, startMonth: startMonthOf(p.country) }, rules);
      if (!e.eligible) {
        const k = `${p.reportingYear}`;
        if (!seenYears.has(k)) { seenYears.add(k); rejected.push({ instrumentId: inst.id, reportingYear: p.reportingYear, reasons: e.reasons }); }
        continue;
      }
      const key = `${p.activityId}|${p.reportingYear}`;
      const need = left.get(key) ?? 0;
      if (need <= 0) continue;
      const take = round6(Math.min(need, remaining));
      allocations.push({ instrumentId: inst.id, activityId: p.activityId, reportingYear: p.reportingYear, kwh: take });
      left.set(key, round6(need - take));
      remaining = round6(remaining - take);
    }
  }
  return { allocations, rejected };
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------
export type CalcStatus = 'calculated' | 'calculated_with_warning' | 'unresolved';
export interface FactorUse { factor: ElectricityFactor; kwh: number; kg: number; tier: string; vintage: string }
export interface Scope2Result {
  method: Method;
  activityId: string;
  reportingYear: string;
  kwh: number;
  kg: number | null;
  status: CalcStatus;
  /** Factor snapshots used (one for location; possibly several for market). */
  factors: FactorUse[];
  instrumentKwh: number;
  instrumentKg: number;
  formula: string | null;
  warnings: string[];
  reasons: string[];
}

export const SCOPE2_REASONS: Record<string, string> = {
  no_factor: 'No approved grid factor for this country, region and period',
  factor_ambiguous: 'More than one approved factor fits; retire the one that does not apply',
  prior_vintage: 'The latest published factor predates this period (grid data lag); disclosed',
  residual_mix_unavailable: 'No residual mix for this market; the grid average is used for uncovered consumption, as the Scope 2 Guidance allows with disclosure',
  co2_only: 'The factor covers CO2 only (no CH4 or N2O)',
  apparent_or_reactive_energy: 'Billed in kVAh or kvarh, not kWh: it cannot be converted without the power factor; a printed kWh figure is needed',
  power_not_energy: 'A demand or load figure (kW, kVA), not energy consumed',
  unknown_unit: 'The unit is not an energy unit this engine converts',
  missing_quantity: 'No consumption figure printed',
  missing_period: 'No billing period printed, so the reporting year cannot be assigned',
  net_metered: 'Net units printed: grid import is needed for Scope 2 (exports are not subtracted)',
  ambiguous_consumption: 'One reading equals the sum of the others but is not labelled as the total: a total or another meter? Confirm on the bill',
  no_country: 'The country of consumption is not known',
  no_quantity: 'Instrument quantity missing',
  no_emission_rate: 'Instrument emission rate missing',
  no_evidence_document: 'No evidence document (retirement statement, contract or supplier disclosure) on file',
  not_retired: 'Certificates are not shown as retired or cancelled',
  no_certificate_reference: 'No registry certificate reference',
  beneficiary_not_confirmed: 'Not confirmed as retired in the company\'s name',
  outside_market_boundary: 'Generated outside the market where the electricity is consumed',
  no_vintage: 'Vintage (generation period) missing',
  vintage_outside_reporting_year: 'Vintage does not fall in the reporting year',
};

export function calculateLocation(p: ActivityPortion, factors: ElectricityFactor[]): Scope2Result {
  const base = { method: 'location' as const, activityId: p.activityId, reportingYear: p.reportingYear, kwh: p.kwh, instrumentKwh: 0, instrumentKg: 0 };
  const pick = pickFactor('grid_average', 'scope2_location', p, factors);
  if (!pick.factor) return { ...base, kg: null, status: 'unresolved', factors: [], formula: null, warnings: [], reasons: [pick.reason] };
  const f = pick.factor;
  const kg = round6(p.kwh * f.kgPerKwh);
  const warnings = [...(pick.vintage === 'prior_vintage' ? ['prior_vintage'] : []), ...(f.gases === 'CO2' ? ['co2_only'] : [])];
  return {
    ...base, kg, status: warnings.includes('prior_vintage') ? 'calculated_with_warning' : 'calculated',
    factors: [{ factor: f, kwh: p.kwh, kg, tier: pick.tier, vintage: pick.vintage }],
    formula: `${fmt(p.kwh)} kWh x ${fmt(f.kgPerKwh)} kg${f.gases}/kWh (${f.factorKey} v${f.version}) = ${fmt(kg)} kg${f.gases}`,
    warnings, reasons: [],
  };
}

/**
 * Market-based: allocated instruments at their conveyed rate, then for the
 * uncovered kWh the supplier's specific rate, the residual mix, or (disclosed)
 * the grid average. No factor for the uncovered part leaves the result
 * unresolved; it is never set to zero.
 */
export function calculateMarket(p: ActivityPortion, allocations: Allocation[], instruments: Instrument[], factors: ElectricityFactor[]): Scope2Result {
  const mine = allocations.filter((a) => a.activityId === p.activityId && a.reportingYear === p.reportingYear);
  const byId = new Map(instruments.map((i) => [i.id, i]));
  let instrumentKwh = 0, instrumentKg = 0;
  const parts: string[] = [];
  for (const a of mine) {
    const i = byId.get(a.instrumentId);
    if (!i) continue;
    instrumentKwh = round6(instrumentKwh + a.kwh);
    const kg = round6(a.kwh * i.kgPerKwh);
    instrumentKg = round6(instrumentKg + kg);
    parts.push(`${fmt(a.kwh)} kWh x ${fmt(i.kgPerKwh)} (${i.scheme} ${i.certificateRef ?? i.id})`);
  }
  const uncovered = round6(Math.max(0, p.kwh - instrumentKwh));
  const base = { method: 'market' as const, activityId: p.activityId, reportingYear: p.reportingYear, kwh: p.kwh, instrumentKwh, instrumentKg };
  if (uncovered === 0) {
    return { ...base, kg: instrumentKg, status: 'calculated', factors: [], formula: `${parts.join(' + ')} = ${fmt(instrumentKg)} kgCO2e`, warnings: [], reasons: [] };
  }
  const warnings: string[] = [];
  let pick: FactorPick = { factor: null, reason: 'no_factor' };
  for (const kind of KINDS_FOR.scope2_market) {
    pick = pickFactor(kind, 'scope2_market', p, factors);
    if (pick.factor) { if (kind === 'grid_average') warnings.push('residual_mix_unavailable'); break; }
    if (pick.reason === 'factor_ambiguous') break;
  }
  if (!pick.factor) return { ...base, kg: null, status: 'unresolved', factors: [], formula: null, warnings, reasons: [pick.reason] };
  const f = pick.factor;
  if (pick.vintage === 'prior_vintage') warnings.push('prior_vintage');
  if (f.gases === 'CO2') warnings.push('co2_only');
  const ukg = round6(uncovered * f.kgPerKwh);
  const kg = round6(instrumentKg + ukg);
  parts.push(`${fmt(uncovered)} kWh x ${fmt(f.kgPerKwh)} (${f.kind} ${f.factorKey} v${f.version})`);
  return {
    ...base, kg, status: warnings.some((w) => w === 'residual_mix_unavailable' || w === 'prior_vintage') ? 'calculated_with_warning' : 'calculated',
    factors: [{ factor: f, kwh: uncovered, kg: ukg, tier: pick.tier, vintage: pick.vintage }],
    formula: `${parts.join(' + ')} = ${fmt(kg)} kg`, warnings, reasons: [],
  };
}

// ---------------------------------------------------------------------------
// Consumption from an electricity bill (billing details only)
// ---------------------------------------------------------------------------
/** Country names as saved in profiles.location (src/lib/countryConfig.ts LOCATION_TO_CODE), to ISO codes. */
export const LOCATION_TO_CODE: Record<string, string> = {
  india: 'IN', philippines: 'PH', indonesia: 'ID', bangladesh: 'BD', pakistan: 'PK', singapore: 'SG', vietnam: 'VN',
  thailand: 'TH', malaysia: 'MY', 'sri lanka': 'LK', 'united states': 'US', usa: 'US', 'united kingdom': 'GB', uk: 'GB',
  germany: 'DE', france: 'FR', netherlands: 'NL', 'united arab emirates': 'AE', uae: 'AE', australia: 'AU', japan: 'JP', 'south korea': 'KR',
};
/** ISO code for a saved location, or null when it is not recognised (never a default country). */
export function countryFromLocation(location: string | null | undefined): string | null {
  if (typeof location !== 'string' || !location.trim()) return null;
  const v = location.trim();
  if (/^[A-Z]{2}$/.test(v)) return v;
  return LOCATION_TO_CODE[v.toLowerCase()] ?? null;
}

const INDIAN_DISCOM = /\b(discom|bescom|msedcl|mahadiscom|tata\s*power|adani\s*electricity|bses|tpddl|tangedco|tneb|uppcl|pspcl|dhbvn|uhbvn|jvvnl|avvnl|jdvvnl|cesc|wbsedcl|apspdcl|apepdcl|tsspdcl|tsnpdcl|kseb|torrent\s*power|mpez|mppkvvcl|cspdcl|tpcodl|nbpdcl|sbpdcl|gescom|hescom|mescom|cescom|dgvcl|mgvcl|pgvcl|ugvcl)\b/i;

export interface BillInput {
  vendor?: string | null;
  currency?: string | null;
  unitsConsumedKwh?: number | string | null;
  unitsConsumedText?: string | null;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  lineItems?: Array<{ description?: string | null; quantity?: number | string | null; unit?: string | null; hsn_code?: string | null; sourceText?: string | null }> | null;
}
export interface ActivityDraft {
  lineKey: string;
  country: string | null;
  countrySource: 'profile' | 'bill' | 'unknown';
  supplierRef: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  quantityPrinted: number | null;
  unitPrinted: string | null;
  kwh: number | null;
  status: 'valid' | 'needs_data';
  reasons: string[];
  sourceText: string | null;
}

const numOrNull = (v: unknown) => { const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
const ELEC_LINE = /\b(electricity|energy|units?\s*(consumed|billed)|billed\s*units|consumption|kwh)\b/i;
const NET = /\b(net\s*(units|consumption|import)?|export(ed)?)\b/i;
const TOTAL_LABEL = /\b(total|billed)\b/i;

/**
 * The consumption a bill prints, as one activity (or one per meter when the
 * bill lists separate readings without a total). Billing details only.
 * - The printed billed consumption wins; then a single energy line; then a
 *   line labelled as the total that equals the sum of the others; then the
 *   sum of separate readings. An unlabelled line equal to the sum of the
 *   others is ambiguous (a total, or a third meter?) and is not guessed.
 * - Net or export figures are not grid import: Needs Data.
 * - kVAh / kvarh is not kWh: Needs Data.
 */
export function activitiesFromBill(bill: BillInput, profileLocation: string | null): ActivityDraft[] {
  const profileCountry = countryFromLocation(profileLocation);
  const billSaysIndia = (bill.currency ?? '').toUpperCase() === 'INR' || INDIAN_DISCOM.test(bill.vendor ?? '');
  const country = profileCountry ?? (billSaysIndia ? 'IN' : null);
  const countrySource: ActivityDraft['countrySource'] = profileCountry ? 'profile' : billSaysIndia ? 'bill' : 'unknown';
  const periodStart = isDate(bill.billingPeriodStart) ? bill.billingPeriodStart : null;
  const periodEnd = isDate(bill.billingPeriodEnd) && (!periodStart || bill.billingPeriodEnd >= periodStart) ? bill.billingPeriodEnd : null;
  const supplierRef = typeof bill.vendor === 'string' && bill.vendor.trim() ? bill.vendor.trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 80) : null;
  const unitsMeanKwh = country === 'IN';

  const make = (lineKey: string, qty: number | null, unit: string | null, text: string | null, extra: string[] = []): ActivityDraft => {
    const reasons = [...extra];
    const conv = toKwh(qty, unit, { unitsMeanKwh });
    if (conv.kwh === null && !(qty === null && extra.length)) reasons.push(conv.reason);
    if (!periodStart || !periodEnd) reasons.push('missing_period');
    if (!country) reasons.push('no_country');
    if (text && NET.test(text)) reasons.push('net_metered');
    const uniq = [...new Set(reasons)];
    return {
      lineKey, country, countrySource, supplierRef, periodStart, periodEnd, quantityPrinted: qty, unitPrinted: unit,
      kwh: conv.kwh, status: uniq.length ? 'needs_data' : 'valid', reasons: uniq, sourceText: text ? text.slice(0, 240) : null,
    };
  };

  const printed = numOrNull(bill.unitsConsumedKwh);
  if (printed !== null) {
    const text = bill.unitsConsumedText ?? null;
    const unit = text && /kvarh/i.test(text) ? 'kvarh' : text && /kvah/i.test(text) ? 'kVAh' : 'kWh';
    return [make('billed', printed, unit, text)];
  }
  const lines = (bill.lineItems ?? [])
    .map((l, i) => ({ i, qty: numOrNull(l.quantity), unit: l.unit ?? null, text: `${l.description ?? ''} ${l.sourceText ?? ''}`.trim(), hsn: String(l.hsn_code ?? '') }))
    .filter((l) => l.qty !== null && (l.hsn.startsWith('2716') || ELEC_LINE.test(l.text) || /kv?a?r?h/i.test(l.unit ?? '')));
  if (!lines.length) return [make('billed', null, null, null)];
  if (lines.length === 1) return [make(`line:${lines[0].i}`, lines[0].qty, lines[0].unit, lines[0].text)];
  const energy = lines.filter((l) => toKwh(l.qty, l.unit, { unitsMeanKwh }).kwh !== null);
  const kwhOf = (l: typeof lines[number]) => (toKwh(l.qty, l.unit, { unitsMeanKwh }) as { kwh: number }).kwh;
  const sum = energy.reduce((a, l) => a + kwhOf(l), 0);
  const totals = energy.filter((l) => energy.length >= 3 && Math.abs(kwhOf(l) - (sum - kwhOf(l))) <= Math.max(0.5, kwhOf(l) * 0.005));
  if (totals.length === 1 && TOTAL_LABEL.test(totals[0].text)) return [make(`line:${totals[0].i}`, totals[0].qty, totals[0].unit, totals[0].text)];
  if (totals.length >= 1) return [make('billed', null, null, null, ['ambiguous_consumption'])];
  // Separate readings (meters or slabs) without a total: each counts once.
  return lines.map((l) => make(`line:${l.i}`, l.qty, l.unit, l.text));
}
