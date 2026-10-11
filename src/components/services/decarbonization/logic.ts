import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from "@/lib/factors";

/**
 * SBTi near-term absolute contraction: Scope 1 and 2 fall by at least 4.2% of
 * base-year emissions each year, linear from the base year (page config answer).
 */
export const SBTI_ANNUAL_RATE = 0.042;

/**
 * Example solar yield, derived from the sample roadmap on this page
 * (150 kW avoiding 131 tCO2e a year at the CEA grid factor). An example only.
 */
export const EXAMPLE_SOLAR_YIELD = Math.round(131000 / INDIA_GRID_FACTOR_KG_PER_KWH / 150 / 10) * 10;

export interface Baseline { total: number; grid: number | null; diesel: number | null }

/** Annual base-year tonnes from monthly bills, or a known annual total (grid and diesel then unknown). */
export function baselineTonnes(i: { kwhPerMonth: number; dieselLPerMonth: number; knownT?: number }): Baseline {
  if (i.knownT !== undefined) return { total: Math.max(0, i.knownT), grid: null, diesel: null };
  const grid = (Math.max(0, i.kwhPerMonth) * 12 * INDIA_GRID_FACTOR_KG_PER_KWH) / 1000;
  const diesel = (Math.max(0, i.dieselLPerMonth) * 12 * FUEL_FACTORS.DIESEL.value) / 1000;
  return { total: grid + diesel, grid, diesel };
}

/** Annual tonnes avoided by rooftop solar replacing grid power: kW x yield x grid factor. */
export const solarAvoidedT = (kw: number, yieldKwhPerKw: number) =>
  (Math.max(0, kw) * Math.max(0, yieldKwhPerKw) * INDIA_GRID_FACTOR_KG_PER_KWH) / 1000;

export interface PathwayInput {
  baseline: Baseline;
  baseYear: number;
  targetYear: number;
  solarKw: number;
  solarYield: number;
  /** Share of base-year diesel removed (for example by electrifying), 0 to 100. */
  dieselSharePct: number;
}

export interface Pathway {
  years: number;
  /** Tonnes a year to cut by the target year: baseline x 4.2% x years (never more than the baseline). */
  requiredCut: number;
  /** Allowed annual emissions in the target year. */
  targetT: number;
  solar: number;
  /** True when solar was capped at the grid emissions it can replace. */
  solarCapped: boolean;
  /** Diesel tonnes removed. Added grid electricity is not counted here. */
  dieselRemoved: number;
  covered: number;
  gap: number;
  /** Share of the required cut covered by levers, 0 to 1 (capped). */
  coverShare: number;
  solarShare: number;
}

export function pathway(i: PathwayInput): Pathway | null {
  const years = Math.round(i.targetYear) - Math.round(i.baseYear);
  const base = i.baseline.total;
  if (!(base > 0) || years <= 0) return null;
  const requiredCut = Math.min(base, base * SBTI_ANNUAL_RATE * years);
  let solar = solarAvoidedT(i.solarKw, i.solarYield);
  const solarCapped = i.baseline.grid !== null && solar > i.baseline.grid;
  if (solarCapped) solar = i.baseline.grid as number;
  const share = Math.min(100, Math.max(0, i.dieselSharePct)) / 100;
  const dieselRemoved = (i.baseline.diesel ?? 0) * share;
  const covered = solar + dieselRemoved;
  return {
    years,
    requiredCut,
    targetT: base - requiredCut,
    solar,
    solarCapped,
    dieselRemoved,
    covered,
    gap: Math.max(0, requiredCut - covered),
    coverShare: Math.min(1, covered / requiredCut),
    solarShare: Math.min(1, solar / requiredCut),
  };
}

export const fmtT = (t: number) => t.toLocaleString("en-IN", { maximumFractionDigits: t < 1000 ? 1 : 0 });
export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function pathwayHeadline(p: Pathway, targetYear: number): string {
  const head = `Cut ${fmtT(p.requiredCut)} t by ${targetYear}.`;
  if (p.covered <= 0) return `${head} Add solar or dieselRemoved to see how much you can cover.`;
  if (p.covered >= p.requiredCut) return `${head} Your levers cover all of it.`;
  if (p.dieselRemoved <= 0) return `${head} Your solar covers ${pct(p.solarShare)} of it.`;
  if (p.solar <= 0) return `${head} Removing diesel covers ${pct(p.coverShare)} of it.`;
  return `${head} Your levers cover ${pct(p.coverShare)} of it, solar ${pct(p.solarShare)}.`;
}
