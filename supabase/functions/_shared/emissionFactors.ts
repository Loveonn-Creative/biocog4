// Deterministic emission-factor lookup, unit conversion and line-item
// classification for invoice extraction. Pure functions only (no Deno or
// browser APIs) so the edge function and the bun tests import the same code.
//
// Methodology: Quantity (in the factor's unit) x Factor = kgCO2e.
// Avoided emissions from green purchases are reported separately and are
// never subtracted from gross emissions.

import { fiscalPeriod } from './invoiceDate.ts';

export const METHODOLOGY_NAME = 'BIOCOG_MVR_INDIA';
// v1.2 / IND_EF_2026_11 (owner approved, November 2026): diesel, petrol and
// coal from published IPCC, CEA and PPAC values with the arithmetic stored as
// the citation, and grid electricity by the financial year of the bill. Rows
// written by v1.1 and earlier keep the factors they were saved with and are
// not re-derived (publishedFactorFor returns null for them).
export const METHODOLOGY_VERSION_TAG = 'v1.2';
export const FACTOR_SET_VERSION = 'IND_EF_2026_11';
const SRC = `${METHODOLOGY_NAME}_${METHODOLOGY_VERSION_TAG}`;

// ---------------------------------------------------------------------------
// Fuel factors (Scope 1)
//
// IPCC = 2006 IPCC Guidelines for National Greenhouse Gas Inventories, Vol. 2
// (Energy), Ch. 1, Table 1.2 (default net calorific values) and Table 1.4
// (default CO2 emission factors). Values are CO2 only; at IPCC stationary
// combustion defaults CH4 and N2O add well under 1%.
// Per-litre and per-scm values need a density, which IPCC does not give; the
// density used is stated next to each factor and is an assumption to replace
// with supplier data when available.
// ---------------------------------------------------------------------------
export type FuelType =
  | 'DIESEL' | 'PETROL' | 'CNG' | 'PNG' | 'LPG' | 'COAL'
  | 'FURNACE_OIL' | 'NAPHTHA' | 'KEROSENE' | 'BIOMASS';

export interface Factor {
  value: number;
  /** Canonical unit the value is expressed per (see normalizeUnit). */
  unit: string;
  source: string;
}

export const FUEL_FACTORS: Record<FuelType, Factor> = {
  // Was 2.68 (v1.0, unsourced). IPCC gas/diesel oil: NCV 43.0 TJ/Gg x
  // 74,100 kgCO2/TJ = 3.1863 kgCO2/kg, x 0.83 kg/L, the diesel density in CEA
  // CO2 Baseline Database v22.0 (Aug 2026) Appendix B = 2.6446.
  DIESEL: { value: 2.645, unit: 'litre', source: 'IPCC 2006 Vol 2 Ch 1, Table 1.2 NCV 43.0 TJ/Gg x Table 1.4 74,100 kgCO2/TJ = 3.186 kgCO2/kg x 0.83 kg/L (CEA CO2 Baseline Database v22.0, Appendix B) = 2.645 kgCO2/L' },
  // Was 2.31 (v1.0, unsourced). IPCC motor gasoline: NCV 44.3 TJ/Gg x
  // 69,300 kgCO2/TJ = 3.0700 kgCO2/kg. Density: PPAC Ready Reckoner FY 2025-26
  // (Ministry of Petroleum and Natural Gas, Aug 2026), Table 9.2 "Weight to
  // volume conversion": petrol 1 MT = 1.4110 KL (volume at 29.5 C, the retail
  // ambient basis), i.e. 0.7087 kg/L. 3.06999 / 1.411 = 2.1758. Source PDF:
  // https://ppac.gov.in/download.php?file=rep_studies/1784899305_The_PPAC_Ready_Reckoner_FY_2025%E2%80%9326_Final.pdf
  PETROL: { value: 2.176, unit: 'litre', source: 'IPCC 2006 Vol 2 Ch 1, Table 1.2 NCV 44.3 TJ/Gg x Table 1.4 69,300 kgCO2/TJ = 3.070 kgCO2/kg, at 1.411 kL per tonne (PPAC Ready Reckoner FY 2025-26, Table 9.2) = 2.176 kgCO2/L' },
  // Was 2.75 (v1.0, unsourced). CNG is natural gas sold by mass; IPCC natural
  // gas: 56,100 kgCO2/TJ x 48.0 TJ/Gg = 2.693 kgCO2/kg, the same basis as PNG.
  CNG: { value: 2.69, unit: 'kg', source: 'IPCC 2006 V2 Tables 1.2/1.4: natural gas (CNG, per kg)' },
  // Was 2.42 (v1.0, unsourced). Indian coal default, used when the bill states
  // no calorific value or grade (coalFactorFor): CEA CO2 Baseline Database
  // v21.0/v22.0 Appendix B, Indian coal 90.6 gCO2/MJ (GCV basis, oxidation
  // 0.98 included) x GCV 3,755 kcal/kg x 4.1868 kJ/kcal = 1.4244 kgCO2/kg.
  COAL: { value: 1.42, unit: 'kg', source: 'CEA CO2 Baseline Database v22.0 (Aug 2026), Appendix B, Indian coal 90.6 gCO2/MJ x 3,755 kcal/kg x 4.1868 kJ/kcal = 1.42 kgCO2/kg' },
  // Was 1.51. IPCC LPG: 63,100 kgCO2/TJ x 47.3 TJ/Gg = 2.985 kgCO2/kg.
  LPG: { value: 2.98, unit: 'kg', source: 'IPCC 2006 V2 Tables 1.2/1.4: LPG' },
  // Was 2.30. IPCC natural gas: 56,100 kgCO2/TJ x 48.0 TJ/Gg = 2.693 kgCO2/kg,
  // x assumed 0.76 kg/scm (typical pipeline gas at 15 C, 1 atm) = 2.05.
  // The density is an assumption; a supplier GCV per scm should replace it.
  PNG: { value: 2.05, unit: 'scm', source: 'IPCC 2006 V2 Tables 1.2/1.4: natural gas, 0.76 kg/scm assumed' },
  // Was 3.15 per litre (close to the per-kg value). IPCC residual fuel oil:
  // 77,400 kgCO2/TJ x 40.4 TJ/Gg = 3.127 kgCO2/kg, x assumed 0.95 kg/L = 2.97.
  FURNACE_OIL: { value: 2.97, unit: 'litre', source: 'IPCC 2006 V2 Tables 1.2/1.4: residual fuel oil, 0.95 kg/L assumed' },
  // Was 3.00 per litre. IPCC gives naphtha per mass only:
  // 73,300 kgCO2/TJ x 44.5 TJ/Gg = 3.262 kgCO2/kg. Kept per kg so no density
  // is assumed; naphtha lines in litres get no factor and are flagged.
  NAPHTHA: { value: 3.26, unit: 'kg', source: 'IPCC 2006 V2 Tables 1.2/1.4: naphtha' },
  // New (was mapped to diesel 2.68). IPCC other kerosene:
  // 71,900 kgCO2/TJ x 43.8 TJ/Gg = 3.149 kgCO2/kg, x assumed 0.80 kg/L = 2.52.
  KEROSENE: { value: 2.52, unit: 'litre', source: 'IPCC 2006 V2 Tables 1.2/1.4: other kerosene, 0.80 kg/L assumed' },
  // Biogenic CO2 is reported as zero here and never credited.
  BIOMASS: { value: 0, unit: 'kg', source: 'Biogenic CO2 reported as zero' },
};

// ---------------------------------------------------------------------------
// Grid electricity (Scope 2), by the financial year of the bill
//
// CEA CO2 Baseline Database, weighted average emission factor of the Indian
// grid including renewable generation (tCO2/MWh = kgCO2/kWh):
//   v21.0 (Nov 2025), Table S: FY 2024-25 = 0.710; Annexure-I lists each
//     year from FY 2013-14 to FY 2024-25.
//   v22.0 (Aug 2026), Table S: FY 2025-26 = 0.675.
//   https://cea.nic.in/api/cdm-report-version/view-pdf/en/78 (v21.0)
//   https://cea.nic.in/api/cdm-report-version/view-pdf/en/82 (v22.0)
// A bill dated in FY 2025-26 or later uses 0.675 (the latest published year);
// FY 2013-14 to FY 2024-25 use that year's own value; earlier bills, for which
// CEA lists no value, use 0.710. The bill's year comes from its invoice date,
// else its upload date (invoiceDate.ts activityDate and fiscalPeriod).
// ---------------------------------------------------------------------------
const V21_ANNEX = (fy: string) => `CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY ${fy} weighted average`;
export const INDIA_GRID_BY_FY: Readonly<Record<string, { value: number; source: string }>> = {
  FY2013_14: { value: 0.774, source: V21_ANNEX('2013-14') },
  FY2014_15: { value: 0.779, source: V21_ANNEX('2014-15') },
  FY2015_16: { value: 0.774, source: V21_ANNEX('2015-16') },
  FY2016_17: { value: 0.770, source: V21_ANNEX('2016-17') },
  FY2017_18: { value: 0.754, source: V21_ANNEX('2017-18') },
  FY2018_19: { value: 0.744, source: V21_ANNEX('2018-19') },
  FY2019_20: { value: 0.713, source: V21_ANNEX('2019-20') },
  FY2020_21: { value: 0.703, source: V21_ANNEX('2020-21') },
  FY2021_22: { value: 0.715, source: V21_ANNEX('2021-22') },
  FY2022_23: { value: 0.716, source: V21_ANNEX('2022-23') },
  FY2023_24: { value: 0.727, source: V21_ANNEX('2023-24') },
  FY2024_25: { value: 0.710, source: 'CEA CO2 Baseline Database v21.0 (Nov 2025), Table S, FY 2024-25 weighted average' },
  FY2025_26: { value: 0.675, source: 'CEA CO2 Baseline Database v22.0 (Aug 2026), Table S, FY 2025-26 weighted average' },
};
const GRID_FIRST_FY = 2013;
const GRID_LATEST_FY = 2025;
const GRID_BEFORE_FIRST_FY = 2024;

export interface GridFactorChoice {
  /** factorSource key, e.g. INDIA_GRID_FY2025_26 (the CEA year whose value applies). */
  key: string;
  value: number;
  source: string;
  /** The bill's financial year, e.g. 'FY 2026-27'. */
  billYear: string;
  /** The CEA year applied, e.g. 'FY 2025-26'. */
  factorYear: string;
}

const fyLabel = (start: number) => `FY ${start}-${String(start + 1).slice(-2)}`;
const fyKey = (start: number) => `FY${start}_${String(start + 1).slice(-2)}`;

/** The India grid factor for a record dated `iso` (YYYY-MM-DD or a timestamp), by Indian financial year. */
export function gridFactorFor(iso: string): GridFactorChoice {
  const start = Number(fiscalPeriod(iso).fiscalYear.slice(2, 6));
  const use = start >= GRID_LATEST_FY ? GRID_LATEST_FY : start >= GRID_FIRST_FY ? start : GRID_BEFORE_FIRST_FY;
  const f = INDIA_GRID_BY_FY[fyKey(use)];
  return { key: `INDIA_GRID_${fyKey(use)}`, value: f.value, source: f.source, billYear: fyLabel(start), factorYear: fyLabel(use) };
}

/** The plain statement stored with a grid line: which year the bill fell in and which CEA year applied. */
export function gridAssumption(choice: GridFactorChoice, dateFrom: 'invoice' | 'upload'): string {
  // Owner-approved short labels.
  const beforeCea = choice.billYear !== choice.factorYear && Number(choice.billYear.slice(3, 7)) <= GRID_LATEST_FY;
  const applied = beforeCea ? `${choice.factorYear} factor used` : `CEA ${choice.factorYear} factor`;
  return dateFrom === 'invoice' ? applied : `${applied} · Dated by upload`;
}

// The national constant the website's estimators and the avoided-emission
// factors use (FY 2024-25, CEA v21.0 Table S). Records use gridFactorFor.
export const INDIA_GRID_FACTOR_KG_PER_KWH = INDIA_GRID_BY_FY.FY2024_25.value;
export const INDIA_GRID_FACTOR_SOURCE = INDIA_GRID_BY_FY.FY2024_25.source;

// ---------------------------------------------------------------------------
// Coal: the rule depends on what the bill says (owner rule, November 2026)
//  1. A gross or net calorific value on the line (GCV, GAR, GAD or ADB; NCV
//     or NAR; in kcal/kg or MJ/kg): GCV x 90.6 gCO2/MJ (CEA v22.0 Appendix B,
//     coal, GCV basis with oxidation) or NCV x 94,600 kgCO2/TJ (IPCC 2006
//     Vol 2 Ch 1 Table 1.4, other bituminous coal).
//  2. Named imported, bituminous or steam coal: IPCC other bituminous coal,
//     25.8 TJ/Gg x 94,600 kgCO2/TJ = 2.4407 kgCO2/kg.
//  3. Otherwise the Indian coal default, FUEL_FACTORS.COAL (1.42).
// Lignite, anthracite, coking and sub-bituminous coal have their own factors,
// which this set does not hold: such lines get no factor and are flagged.
// The reader returns no calorific value field, so only the line text is read.
// ---------------------------------------------------------------------------
export const COAL_BITUMINOUS: Factor = { value: 2.44, unit: 'kg', source: 'IPCC 2006 Vol 2 Ch 1, other bituminous coal, Table 1.2 NCV 25.8 TJ/Gg x Table 1.4 94,600 kgCO2/TJ = 2.44 kgCO2/kg' };
const KJ_PER_KCAL = 4.1868;
const CEA_COAL_G_PER_MJ_GCV = 90.6;
const IPCC_BITUMINOUS_KG_PER_TJ_NCV = 94600;
// Plausible coal calorific values; anything outside is treated as not stated.
const CV_MIN_KCAL = 1500;
const CV_MAX_KCAL = 8500;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
const fmtInt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

function coalCvFactor(basis: 'GCV' | 'NCV', kcal: number): Factor | null {
  if (!Number.isInteger(kcal) || kcal < CV_MIN_KCAL || kcal > CV_MAX_KCAL) return null;
  const mj = kcal * KJ_PER_KCAL / 1000;
  if (basis === 'GCV') {
    const v = round4(CEA_COAL_G_PER_MJ_GCV * mj / 1000);
    return { value: v, unit: 'kg', source: `CEA CO2 Baseline Database v22.0 (Aug 2026), Appendix B, coal 90.6 gCO2/MJ x gross calorific value ${fmtInt(kcal)} kcal/kg x 4.1868 kJ/kcal = ${v} kgCO2/kg` };
  }
  const v = round4(IPCC_BITUMINOUS_KG_PER_TJ_NCV * mj / 1e6);
  return { value: v, unit: 'kg', source: `IPCC 2006 Vol 2 Ch 1, Table 1.4 94,600 kgCO2/TJ x net calorific value ${fmtInt(kcal)} kcal/kg x 4.1868 kJ/kcal = ${v} kgCO2/kg` };
}

export interface CoalChoice {
  /** factorSource key: COAL, COAL_BITUMINOUS, COAL_GCV_<kcal> or COAL_NCV_<kcal>. */
  key: string;
  factor: Factor;
  /** Which rule applied, stored with the line. */
  assumption: string;
}

const CV_NUM = '(\\d{1,2}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)';
const CV_UNIT = '(kcal\\s*/\\s*kg|kcal|k\\.?\\s?cal|mj\\s*/\\s*kg|mj)?';
const CV_WORD = '(gcv|gar|gad|adb|gross\\s+calorific(?:\\s+value)?|ncv|nar|net\\s+calorific(?:\\s+value)?)';
const CV_AFTER = new RegExp(`(?:^|[^a-z])${CV_WORD}[^0-9a-z]{0,6}(?:(?:value|of|approx|about)[^0-9a-z]{0,4})?${CV_NUM}\\s*${CV_UNIT}`, 'i');
const CV_BEFORE = new RegExp(`${CV_NUM}\\s*${CV_UNIT}[^0-9a-z]{0,4}${CV_WORD}(?:[^a-z]|$)`, 'i');

/** A calorific value stated in the line text, in whole kcal/kg, or null. */
export function statedCoalCv(text: string | null | undefined): { basis: 'GCV' | 'NCV'; kcal: number; printed: string } | null {
  const t = String(text ?? '');
  let word: string, num: string, unit: string | undefined;
  const a = CV_AFTER.exec(t);
  if (a) [word, num, unit] = [a[1], a[2], a[3]];
  else {
    const b = CV_BEFORE.exec(t);
    if (!b) return null;
    [num, unit, word] = [b[1], b[2], b[3]];
  }
  const n = Number(num.replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = (unit ?? '').toLowerCase();
  // MJ/kg when stated, or a bare number in the MJ/kg range (8 to 36).
  const isMj = u.startsWith('mj') || (!u && n >= 8 && n <= 36);
  const kcal = Math.round(isMj ? n * 1000 / KJ_PER_KCAL : n);
  if (kcal < CV_MIN_KCAL || kcal > CV_MAX_KCAL) return null;
  const basis = /^(ncv|nar|net)/i.test(word) ? 'NCV' : 'GCV';
  return { basis, kcal, printed: `${num} ${isMj ? 'MJ/kg' : 'kcal/kg'}` };
}

// "Non-coking coal" is ordinary Indian thermal coal, so it is not excluded.
const COAL_OTHER_RANK = /(^|[^a-z])(lignite|anthracite|(?<!non[\s-]?)coking|sub[\s-]?bituminous)([^a-z]|$)/i;
const COAL_BITUMINOUS_WORDS = /(^|[^a-z])(imported|bituminous|steam\s+coal)([^a-z]|$)/i;

/** The coal factor for a line from its text, or null when the rule cannot be determined. */
export function coalFactorFor(description: string | null | undefined): CoalChoice | null {
  const text = String(description ?? '');
  const cv = statedCoalCv(text);
  if (cv) {
    const f = coalCvFactor(cv.basis, cv.kcal);
    if (f) {
      return {
        key: `COAL_${cv.basis}_${cv.kcal}`,
        factor: f,
        assumption: `From bill: ${cv.printed}`,
      };
    }
  }
  if (COAL_OTHER_RANK.test(text)) return null;
  if (COAL_BITUMINOUS_WORDS.test(text)) {
    return { key: 'COAL_BITUMINOUS', factor: COAL_BITUMINOUS, assumption: 'Bituminous coal factor' };
  }
  return { key: 'COAL', factor: FUEL_FACTORS.COAL, assumption: 'Indian coal average' };
}

/** The coal factor a factorSource key names (COAL, COAL_BITUMINOUS, COAL_GCV_5500, ...), or null. */
function coalFactorForKey(key: string): Factor | null {
  if (key === 'COAL') return FUEL_FACTORS.COAL;
  if (key === 'COAL_BITUMINOUS') return COAL_BITUMINOUS;
  const m = /^COAL_(GCV|NCV)_(\d{4})$/.exec(key);
  return m ? coalCvFactor(m[1] as 'GCV' | 'NCV', Number(m[2])) : null;
}

// Scope 3 has no factors here. The former road-freight (0.18 kg/t-km) and
// landfill-organic (1.90 kg/kg) values had no publication, mode, material or
// geography, so they applied one number to air freight, sea freight and scrap
// metal alike. Scope 3 lines are calculated only in the supplier evidence
// trail (scope3.ts), from approved, sourced, material- and geography-specific
// factors; a freight or waste line here is flagged as having no verified factor.

// Avoided-emission factors for green purchases (positive numbers = kgCO2e
// avoided per unit). Reported separately; never netted against emissions.
export const AVOIDED_FACTORS: Record<string, Factor> = {
  SOLAR_ENERGY: { value: INDIA_GRID_FACTOR_KG_PER_KWH, unit: 'kWh', source: `${SRC}:SOLAR_AVOIDED_GRID` },
  WIND_ENERGY: { value: INDIA_GRID_FACTOR_KG_PER_KWH, unit: 'kWh', source: `${SRC}:WIND_AVOIDED_GRID` },
  EV_TRANSPORT: { value: 1.80, unit: 'litre', source: `${SRC}:EV_DIESEL_AVOIDED` },
  FORESTATION: { value: 22.0, unit: 'tree', source: `${SRC}:FORESTATION_IPCC` },
  BIOGAS: { value: FUEL_FACTORS.PNG.value, unit: 'scm', source: `${SRC}:BIOGAS_NG_AVOIDED` },
  ORGANIC_INPUT: { value: 0.50, unit: 'kg', source: `${SRC}:ORGANIC_CHEM_AVOIDED` },
  ENERGY_EFFICIENCY: { value: 0.30, unit: 'kWh', source: `${SRC}:EFFICIENCY_REDUCTION` },
  WATER_CONSERVATION: { value: 0.20, unit: 'kl', source: `${SRC}:WATER_ENERGY_SAVED` },
  RECYCLED_MATERIAL: { value: 1.50, unit: 'kg', source: `${SRC}:RECYCLED_VIRGIN_AVOIDED` },
};

export const GREEN_PRODUCT_CATEGORIES = Object.keys(AVOIDED_FACTORS);

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------
export interface NormalizedUnit {
  /** Canonical unit: kWh, litre, kg, scm, ton-km, tree. */
  unit: string;
  /** Multiply a quantity in the raw unit by this to get the canonical unit. */
  multiplier: number;
}

const UNIT_ALIASES: Record<string, NormalizedUnit> = {
  // Energy
  kwh: { unit: 'kWh', multiplier: 1 },
  'kw.h': { unit: 'kWh', multiplier: 1 },
  'kw-h': { unit: 'kWh', multiplier: 1 },
  kwhr: { unit: 'kWh', multiplier: 1 },
  mwh: { unit: 'kWh', multiplier: 1000 },
  // Volume (liquid)
  l: { unit: 'litre', multiplier: 1 },
  lt: { unit: 'litre', multiplier: 1 },
  ltr: { unit: 'litre', multiplier: 1 },
  ltrs: { unit: 'litre', multiplier: 1 },
  litre: { unit: 'litre', multiplier: 1 },
  litres: { unit: 'litre', multiplier: 1 },
  liter: { unit: 'litre', multiplier: 1 },
  liters: { unit: 'litre', multiplier: 1 },
  kl: { unit: 'litre', multiplier: 1000 },
  kilolitre: { unit: 'litre', multiplier: 1000 },
  kiloliter: { unit: 'litre', multiplier: 1000 },
  // Mass. "ton"/"tons" on Indian invoices denote the metric tonne.
  kg: { unit: 'kg', multiplier: 1 },
  kgs: { unit: 'kg', multiplier: 1 },
  kilogram: { unit: 'kg', multiplier: 1 },
  kilograms: { unit: 'kg', multiplier: 1 },
  t: { unit: 'kg', multiplier: 1000 },
  mt: { unit: 'kg', multiplier: 1000 },
  tonne: { unit: 'kg', multiplier: 1000 },
  tonnes: { unit: 'kg', multiplier: 1000 },
  ton: { unit: 'kg', multiplier: 1000 },
  tons: { unit: 'kg', multiplier: 1000 },
  'metric ton': { unit: 'kg', multiplier: 1000 },
  'metric tonne': { unit: 'kg', multiplier: 1000 },
  // Gas volume (standard cubic metres)
  scm: { unit: 'scm', multiplier: 1 },
  sm3: { unit: 'scm', multiplier: 1 },
  m3: { unit: 'scm', multiplier: 1 },
  'cu.m': { unit: 'scm', multiplier: 1 },
  'cubic metre': { unit: 'scm', multiplier: 1 },
  'cubic meter': { unit: 'scm', multiplier: 1 },
  // Freight
  'ton-km': { unit: 'ton-km', multiplier: 1 },
  'tonne-km': { unit: 'ton-km', multiplier: 1 },
  tkm: { unit: 'ton-km', multiplier: 1 },
  // Counts
  tree: { unit: 'tree', multiplier: 1 },
  trees: { unit: 'tree', multiplier: 1 },
  sapling: { unit: 'tree', multiplier: 1 },
  saplings: { unit: 'tree', multiplier: 1 },
};

/** Map a raw unit string to its canonical unit and multiplier, or null. */
export function normalizeUnit(raw: string | null | undefined): NormalizedUnit | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase().replace(/³/g, '3').replace(/\s+/g, ' ').replace(/\.$/, '');
  return UNIT_ALIASES[key] ?? null;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------
export interface HsnClass {
  productCategory: string;
  industryCode: string;
  industryName: string;
  scope: number;
}

const HSN_MASTER: Record<string, { productCategory: string; industryCode: string; industryName: string; defaultScope: number }> = {
  // 4-digit codes are checked before 2-digit chapters.
  '2716': { productCategory: 'ELECTRICITY', industryCode: 'POWER', industryName: 'Electrical Energy', defaultScope: 2 },
  '8541': { productCategory: 'SOLAR_ENERGY', industryCode: 'GREEN_ENERGY', industryName: 'Solar Cells & PV Modules', defaultScope: 2 },
  '8711': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', industryName: 'Electric Motorcycles', defaultScope: 1 },
  '0602': { productCategory: 'FORESTATION', industryCode: 'GREEN_LAND', industryName: 'Live Plants & Saplings', defaultScope: 3 },
  '8501': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', industryName: 'Electric Motors', defaultScope: 1 },
  // Chapters. Chapter 10 (cereals) is food, not fuel biomass, and is not mapped.
  '27': { productCategory: 'FUEL', industryCode: 'ENERGY', industryName: 'Mineral Fuels & Oils', defaultScope: 1 },
  '12': { productCategory: 'BIOMASS', industryCode: 'AGRI', industryName: 'Oil Seeds & Biomass', defaultScope: 1 },
  '72': { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', industryName: 'Iron & Steel', defaultScope: 3 },
  '73': { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL_PRODUCTS', industryName: 'Steel Articles', defaultScope: 3 },
  '74': { productCategory: 'RAW_MATERIAL', industryCode: 'COPPER', industryName: 'Copper', defaultScope: 3 },
  '76': { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', industryName: 'Aluminium', defaultScope: 3 },
  '25': { productCategory: 'RAW_MATERIAL', industryCode: 'CEMENT', industryName: 'Cement & Minerals', defaultScope: 3 },
  '39': { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', industryName: 'Plastics & Polymers', defaultScope: 3 },
  '28': { productCategory: 'CHEMICALS', industryCode: 'CHEMICALS', industryName: 'Inorganic Chemicals', defaultScope: 3 },
  '29': { productCategory: 'CHEMICALS', industryCode: 'CHEMICALS', industryName: 'Organic Chemicals', defaultScope: 3 },
  '40': { productCategory: 'RAW_MATERIAL', industryCode: 'RUBBER', industryName: 'Rubber & Elastomers', defaultScope: 3 },
  '48': { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', industryName: 'Paper & Pulp', defaultScope: 3 },
  '44': { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', industryName: 'Wood & Timber', defaultScope: 3 },
  '52': { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', industryName: 'Cotton Textiles', defaultScope: 3 },
  '54': { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', industryName: 'Synthetic Textiles', defaultScope: 3 },
  '84': { productCategory: 'CAPITAL_GOODS', industryCode: 'MACHINERY', industryName: 'Industrial Machinery', defaultScope: 3 },
  '85': { productCategory: 'ELECTRICAL_EQUIPMENT', industryCode: 'ELECTRICAL', industryName: 'Electrical Equipment', defaultScope: 3 },
  '90': { productCategory: 'INSTRUMENTS', industryCode: 'INSTRUMENTATION', industryName: 'Measuring Instruments', defaultScope: 3 },
  '86': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'RAILWAYS', industryName: 'Railway Equipment', defaultScope: 3 },
  '87': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'AUTOMOTIVE', industryName: 'Vehicles & Transport', defaultScope: 3 },
  '88': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'AVIATION', industryName: 'Aircraft & Parts', defaultScope: 3 },
  '89': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'MARINE', industryName: 'Ships & Boats', defaultScope: 3 },
  '99': { productCategory: 'SERVICES', industryCode: 'PROFESSIONAL', industryName: 'Professional & Business Services', defaultScope: 3 },
};

export function classifyByHSN(hsnCode: string | null | undefined): HsnClass | null {
  if (!hsnCode) return null;
  const code = String(hsnCode).replace(/\s+/g, '');
  for (const prefix of [code.substring(0, 4), code.substring(0, 2)]) {
    const hit = HSN_MASTER[prefix];
    if (hit) {
      return {
        productCategory: hit.productCategory,
        industryCode: hit.industryCode,
        industryName: hit.industryName,
        scope: hit.defaultScope,
      };
    }
  }
  return null;
}

export interface KeywordClass {
  productCategory: string;
  industryCode: string;
  scope: number;
  fuelType?: FuelType;
}

const fuel = (fuelType: FuelType): KeywordClass => ({ productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType });
const elec: KeywordClass = { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 };
const c = (productCategory: string, industryCode: string, scope: number): KeywordClass => ({ productCategory, industryCode, scope });

// Only specific terms, matched as whole words. Short or generic words that
// produced false matches were removed: ms, fo, tel, kw, unit, units, power,
// fuel, server, switch, plus furnace (equipment, not oil), carrier (AC brand),
// organic (matched "organic chemicals" as green), led (verb), cloud, compute
// and subscription.
export const KEYWORD_MAP: Record<string, KeywordClass> = {
  // Fuels - Scope 1 (including common OCR misreads)
  diesel: fuel('DIESEL'), deisel: fuel('DIESEL'), disel: fuel('DIESEL'), d1esel: fuel('DIESEL'),
  hsd: fuel('DIESEL'), 'high speed diesel': fuel('DIESEL'),
  petrol: fuel('PETROL'), petro: fuel('PETROL'), petr0l: fuel('PETROL'), gasoline: fuel('PETROL'), 'motor spirit': fuel('PETROL'),
  cng: fuel('CNG'),
  lpg: fuel('LPG'), 'l.p.g': fuel('LPG'),
  coal: fuel('COAL'),
  'furnace oil': fuel('FURNACE_OIL'),
  naphtha: fuel('NAPHTHA'),
  png: fuel('PNG'), 'piped gas': fuel('PNG'), 'piped natural gas': fuel('PNG'), 'natural gas': fuel('PNG'),
  kerosene: fuel('KEROSENE'), sko: fuel('KEROSENE'),
  // Electricity - always Scope 2
  electricity: elec, electy: elec, elec: elec, 'elec bill': elec, 'electric bill': elec, 'power bill': elec,
  'energy charges': elec, 'units consumed': elec, kwh: elec,
  bijli: elec, vidyut: elec, discom: elec, msedcl: elec, tpddl: elec, bses: elec, cesc: elec,
  bescom: elec, tneb: elec, pspcl: elec, 'punjab state power': elec,
  // Transport - Scope 3
  freight: c('TRANSPORT', 'LOGISTICS', 3), transport: c('TRANSPORT', 'LOGISTICS', 3),
  logistics: c('TRANSPORT', 'LOGISTICS', 3), courier: c('TRANSPORT', 'LOGISTICS', 3),
  shipping: c('TRANSPORT', 'LOGISTICS', 3), trucking: c('TRANSPORT', 'LOGISTICS', 3),
  lorry: c('TRANSPORT', 'LOGISTICS', 3), dhl: c('TRANSPORT', 'LOGISTICS', 3),
  fedex: c('TRANSPORT', 'LOGISTICS', 3), bluedart: c('TRANSPORT', 'LOGISTICS', 3),
  delhivery: c('TRANSPORT', 'LOGISTICS', 3), delivery: c('TRANSPORT', 'LOGISTICS', 3),
  // Raw materials - Scope 3
  steel: c('RAW_MATERIAL', 'STEEL', 3), iron: c('RAW_MATERIAL', 'STEEL', 3), tmt: c('RAW_MATERIAL', 'STEEL', 3), rebar: c('RAW_MATERIAL', 'STEEL', 3),
  plastic: c('RAW_MATERIAL', 'PLASTIC', 3), polymer: c('RAW_MATERIAL', 'PLASTIC', 3),
  hdpe: c('RAW_MATERIAL', 'PLASTIC', 3), ldpe: c('RAW_MATERIAL', 'PLASTIC', 3), pvc: c('RAW_MATERIAL', 'PLASTIC', 3),
  paper: c('RAW_MATERIAL', 'PAPER', 3), cardboard: c('RAW_MATERIAL', 'PAPER', 3), carton: c('RAW_MATERIAL', 'PAPER', 3),
  cement: c('RAW_MATERIAL', 'CEMENT', 3), concrete: c('RAW_MATERIAL', 'CEMENT', 3),
  aluminium: c('RAW_MATERIAL', 'ALUMINIUM', 3), aluminum: c('RAW_MATERIAL', 'ALUMINIUM', 3),
  copper: c('RAW_MATERIAL', 'COPPER', 3),
  textile: c('RAW_MATERIAL', 'TEXTILE', 3), fabric: c('RAW_MATERIAL', 'TEXTILE', 3),
  cotton: c('RAW_MATERIAL', 'TEXTILE', 3), yarn: c('RAW_MATERIAL', 'TEXTILE', 3),
  wood: c('RAW_MATERIAL', 'WOOD', 3), timber: c('RAW_MATERIAL', 'WOOD', 3), plywood: c('RAW_MATERIAL', 'WOOD', 3),
  rubber: c('RAW_MATERIAL', 'RUBBER', 3), glass: c('RAW_MATERIAL', 'GLASS', 3),
  // Waste - Scope 3
  waste: c('WASTE', 'WASTE_MANAGEMENT', 3), disposal: c('WASTE', 'WASTE_MANAGEMENT', 3),
  recycling: c('WASTE', 'WASTE_MANAGEMENT', 3), scrap: c('WASTE', 'WASTE_MANAGEMENT', 3),
  garbage: c('WASTE', 'WASTE_MANAGEMENT', 3), kachra: c('WASTE', 'WASTE_MANAGEMENT', 3),
  // Green categories (avoided emissions, reported separately)
  solar: c('SOLAR_ENERGY', 'GREEN_ENERGY', 2), 'solar panel': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2), 'solar power': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2),
  'solar energy': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2), 'pv module': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2),
  photovoltaic: c('SOLAR_ENERGY', 'GREEN_ENERGY', 2), 'solar inverter': c('SOLAR_ENERGY', 'GREEN_ENERGY', 2),
  'electric vehicle': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1), 'ev charging': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1),
  'ev battery': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1), 'e-rickshaw': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1),
  'e-scooter': c('EV_TRANSPORT', 'GREEN_TRANSPORT', 1),
  forestation: c('FORESTATION', 'GREEN_LAND', 3), sapling: c('FORESTATION', 'GREEN_LAND', 3),
  saplings: c('FORESTATION', 'GREEN_LAND', 3), 'tree planting': c('FORESTATION', 'GREEN_LAND', 3),
  afforestation: c('FORESTATION', 'GREEN_LAND', 3),
  'wind turbine': c('WIND_ENERGY', 'GREEN_ENERGY', 2), windmill: c('WIND_ENERGY', 'GREEN_ENERGY', 2),
  'wind energy': c('WIND_ENERGY', 'GREEN_ENERGY', 2),
  biogas: c('BIOGAS', 'GREEN_ENERGY', 1), biomethane: c('BIOGAS', 'GREEN_ENERGY', 1), 'bio-gas': c('BIOGAS', 'GREEN_ENERGY', 1),
  compost: c('ORGANIC_INPUT', 'GREEN_AGRI', 3), 'bio-fertilizer': c('ORGANIC_INPUT', 'GREEN_AGRI', 3),
  vermicompost: c('ORGANIC_INPUT', 'GREEN_AGRI', 3),
  'led light': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2), 'led bulb': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2),
  'led lamp': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2), 'energy efficient': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2),
  bldc: c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2), 'star rated': c('ENERGY_EFFICIENCY', 'GREEN_TECH', 2),
  rainwater: c('WATER_CONSERVATION', 'GREEN_WATER', 3), 'water recycling': c('WATER_CONSERVATION', 'GREEN_WATER', 3),
  'rain harvesting': c('WATER_CONSERVATION', 'GREEN_WATER', 3),
  'recycled material': c('RECYCLED_MATERIAL', 'GREEN_MATERIAL', 3), 'r-pet': c('RECYCLED_MATERIAL', 'GREEN_MATERIAL', 3),
  'recycled plastic': c('RECYCLED_MATERIAL', 'GREEN_MATERIAL', 3), 'recycled paper': c('RECYCLED_MATERIAL', 'GREEN_MATERIAL', 3),
  // Cloud, software, IT hardware - Scope 3 (spend-based; no activity factor applied here)
  aws: c('CLOUD_SERVICES', 'CLOUD', 3), 'amazon web services': c('CLOUD_SERVICES', 'CLOUD', 3),
  azure: c('CLOUD_SERVICES', 'CLOUD', 3), gcp: c('CLOUD_SERVICES', 'CLOUD', 3),
  'google cloud': c('CLOUD_SERVICES', 'CLOUD', 3), 'cloud hosting': c('CLOUD_SERVICES', 'CLOUD', 3),
  'data center': c('CLOUD_SERVICES', 'CLOUD', 3), 'data centre': c('CLOUD_SERVICES', 'CLOUD', 3),
  'software license': c('SOFTWARE', 'SOFTWARE', 3), saas: c('SOFTWARE', 'SOFTWARE', 3), 'platform fee': c('SOFTWARE', 'SOFTWARE', 3),
  laptop: c('IT_HARDWARE', 'IT_EQUIPMENT', 3), 'rack server': c('IT_HARDWARE', 'IT_EQUIPMENT', 3),
  'network switch': c('IT_HARDWARE', 'IT_EQUIPMENT', 3), router: c('IT_HARDWARE', 'IT_EQUIPMENT', 3), networking: c('IT_HARDWARE', 'IT_EQUIPMENT', 3),
  // Professional services and travel - Scope 3
  consulting: c('PROFESSIONAL_SERVICES', 'PROFESSIONAL', 3), advisory: c('PROFESSIONAL_SERVICES', 'PROFESSIONAL', 3),
  legal: c('PROFESSIONAL_SERVICES', 'PROFESSIONAL', 3), audit: c('PROFESSIONAL_SERVICES', 'PROFESSIONAL', 3),
  airfare: c('BUSINESS_TRAVEL', 'TRAVEL', 3), flight: c('BUSINESS_TRAVEL', 'TRAVEL', 3),
  hotel: c('BUSINESS_TRAVEL', 'TRAVEL', 3), taxi: c('BUSINESS_TRAVEL', 'TRAVEL', 3), cab: c('BUSINESS_TRAVEL', 'TRAVEL', 3),
  commute: c('BUSINESS_TRAVEL', 'TRAVEL', 3), ola: c('BUSINESS_TRAVEL', 'TRAVEL', 3), uber: c('BUSINESS_TRAVEL', 'TRAVEL', 3),
};

const SORTED_KEYWORDS = Object.entries(KEYWORD_MAP).sort((a, b) => b[0].length - a[0].length);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KEYWORD_PATTERNS: Array<[RegExp, KeywordClass]> = SORTED_KEYWORDS.map(([kw, cls]) => [
  // Whole-word match: the keyword may not touch other letters or digits.
  new RegExp(`(^|[^a-z0-9])${escapeRe(kw)}([^a-z0-9]|$)`, 'i'),
  cls,
]);

/** Longest whole-word keyword match wins. */
export function classifyByKeyword(text: string | null | undefined): KeywordClass | null {
  const lower = (text || '').toLowerCase();
  if (!lower) return null;
  for (const [re, cls] of KEYWORD_PATTERNS) {
    if (re.test(lower)) return cls;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------
export interface EmissionCalc {
  kind: 'emission';
  /** Quantity converted to the factor's canonical unit. */
  quantity: number;
  unit: string;
  /** kgCO2e per canonical unit, so quantity x emissionFactor = co2Kg. */
  emissionFactor: number;
  co2Kg: number;
  factorSource: string;
  /** Which factor rule applied (grid year, coal rule), to store with the line. */
  assumption?: string;
}

export interface AvoidedCalc {
  kind: 'avoided';
  quantity: number;
  unit: string;
  avoidedFactor: number;
  /** Always >= 0. Never subtracted from gross emissions. */
  avoidedCo2Kg: number;
  factorSource: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function applyFactor(quantity: number, rawUnit: string, factor: Factor): { quantity: number; unit: string; perUnit: number; kg: number } | null {
  const input = normalizeUnit(rawUnit);
  const factorUnit = normalizeUnit(factor.unit);
  if (!input || !factorUnit || input.unit !== factorUnit.unit) return null;
  const canonicalQty = quantity * input.multiplier;
  const perCanonical = factor.value / factorUnit.multiplier;
  return {
    quantity: round6(canonicalQty),
    unit: factorUnit.unit,
    perUnit: round6(perCanonical),
    kg: round2(canonicalQty * perCanonical),
  };
}

/** Countries whose grid factor this file holds. Electricity elsewhere is not calculated here. */
export const GRID_FACTOR_COUNTRIES: readonly string[] = ['IN'];
const GRID_DEPENDENT = new Set(['ELECTRICITY', 'SOLAR_ENERGY', 'WIND_ENERGY']);

/**
 * Deterministic emission calculation for one classified line item.
 * Returns null when no factor applies to this category and unit.
 * opts.gridCountry: the country the electricity was supplied in. The India
 * grid factor (and the avoided-emission factors built on it) applies only to
 * 'IN'; any other country, or null, gets no factor. Omitted = India, for
 * callers that only ever handle Indian data.
 * opts.activityDate: the record's date for its period (invoice date, else
 * upload date; YYYY-MM-DD or a timestamp). Grid electricity takes the factor
 * of that financial year; omitted = today (an upload with no invoice date).
 * opts.activityDateFrom says which of the two it is, for the stored note.
 * opts.description: the line text, read for a coal calorific value or grade.
 */
export function calculateEmissions(
  quantity: number,
  unit: string,
  scope: number,
  productCategory: string,
  fuelType?: string,
  opts?: { gridCountry?: string | null; activityDate?: string | null; activityDateFrom?: 'invoice' | 'upload'; description?: string | null },
): EmissionCalc | AvoidedCalc | null {
  if (!Number.isFinite(quantity) || quantity <= 0 || !unit) return null;
  if (opts && 'gridCountry' in opts && GRID_DEPENDENT.has(productCategory) && !GRID_FACTOR_COUNTRIES.includes(String(opts.gridCountry ?? ''))) return null;

  if (scope === 1 && productCategory === 'FUEL' && fuelType === 'COAL') {
    const choice = coalFactorFor(opts?.description);
    if (!choice) return null;
    const r = applyFactor(quantity, unit, choice.factor);
    if (r) return { kind: 'emission', quantity: r.quantity, unit: r.unit, emissionFactor: r.perUnit, co2Kg: r.kg, factorSource: `${SRC}:${choice.key}`, assumption: choice.assumption };
    return null;
  }

  if (scope === 1 && productCategory === 'FUEL' && fuelType && fuelType in FUEL_FACTORS) {
    const f = FUEL_FACTORS[fuelType as FuelType];
    const r = applyFactor(quantity, unit, f);
    if (r) return { kind: 'emission', quantity: r.quantity, unit: r.unit, emissionFactor: r.perUnit, co2Kg: r.kg, factorSource: `${SRC}:${fuelType}` };
    return null;
  }

  if (scope === 2 && productCategory === 'ELECTRICITY') {
    const dated = opts?.activityDate ? String(opts.activityDate) : new Date().toISOString();
    const grid = gridFactorFor(dated);
    const r = applyFactor(quantity, unit, { value: grid.value, unit: 'kWh', source: grid.source });
    const from = opts?.activityDateFrom ?? (opts?.activityDate ? 'invoice' : 'upload');
    if (r) return { kind: 'emission', quantity: r.quantity, unit: r.unit, emissionFactor: r.perUnit, co2Kg: r.kg, factorSource: `${SRC}:${grid.key}`, assumption: gridAssumption(grid, from) };
    return null;
  }

  const avoided = AVOIDED_FACTORS[productCategory];
  if (avoided) {
    const r = applyFactor(quantity, unit, avoided);
    if (r) return { kind: 'avoided', quantity: r.quantity, unit: r.unit, avoidedFactor: r.perUnit, avoidedCo2Kg: Math.max(0, r.kg), factorSource: avoided.source };
  }
  return null;
}

/**
 * The published factor (per canonical unit) behind a factorSource this
 * methodology version writes, e.g. 'BIOCOG_MVR_INDIA_v1.2:DIESEL',
 * 'BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2025_26' or
 * 'BIOCOG_MVR_INDIA_v1.2:COAL_GCV_5500'. null for sources from other
 * versions (v1.1 and earlier keep their saved factors and are not
 * re-derived) or methods, which are checked elsewhere.
 */
export function publishedFactorFor(factorSource: string | null | undefined): number | null {
  const f = currentFactorFor(factorSource);
  if (!f) return null;
  const u = normalizeUnit(f.unit);
  return u ? round6(f.value / u.multiplier) : null;
}

function currentFactorFor(factorSource: string | null | undefined): Factor | null {
  const [src, key] = String(factorSource ?? '').split(':');
  if (src !== SRC || !key) return null;
  const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
  if (key.startsWith('INDIA_GRID_')) {
    const fy = key.slice('INDIA_GRID_'.length);
    return own(INDIA_GRID_BY_FY, fy) ? { value: INDIA_GRID_BY_FY[fy].value, unit: 'kWh', source: INDIA_GRID_BY_FY[fy].source } : null;
  }
  if (key.startsWith('COAL')) return coalFactorForKey(key);
  if (own(FUEL_FACTORS, key)) return FUEL_FACTORS[key as FuelType];
  return null;
}

/**
 * The published citation behind a factorSource this methodology version
 * writes (the `source` defined with the factor above), e.g. 'IPCC 2006 V2
 * Tables 1.2/1.4: LPG'. null for sources from other versions or methods.
 */
export function factorCitationFor(factorSource: string | null | undefined): string | null {
  return currentFactorFor(factorSource)?.source ?? null;
}

// Factors a source key carried before a correction. Rows saved with them stay
// valid (they are not recalculated); new rows use the current value.
const EARLIER_PUBLISHED: Partial<Record<FuelType, number[]>> = { CNG: [2.75] };

/** True when the stored factor is the current published value, or one this key published before. */
export function isPublishedFactor(factorSource: string | null | undefined, value: number): boolean {
  const current = publishedFactorFor(factorSource);
  if (current === null || Math.abs(value - current) <= 1e-6) return true;
  const key = String(factorSource ?? '').split(':')[1] as FuelType;
  return (EARLIER_PUBLISHED[key] ?? []).some((v) => Math.abs(value - v) <= 1e-6);
}

/** Sum line-item emissions and avoided emissions separately, both >= 0. */
export function totalsFor(items: Array<{ co2Kg?: number | null; avoidedCo2Kg?: number | null }>): { grossCo2Kg: number; avoidedCo2Kg: number } {
  let gross = 0;
  let avoided = 0;
  for (const i of items) {
    if (typeof i.co2Kg === 'number' && Number.isFinite(i.co2Kg) && i.co2Kg > 0) gross += i.co2Kg;
    if (typeof i.avoidedCo2Kg === 'number' && Number.isFinite(i.avoidedCo2Kg) && i.avoidedCo2Kg > 0) avoided += i.avoidedCo2Kg;
  }
  return { grossCo2Kg: round2(gross), avoidedCo2Kg: round2(avoided) };
}
