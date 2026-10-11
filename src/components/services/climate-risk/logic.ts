import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from "@/lib/factors";
import { DEFAULT_EU_ETS_PRICE } from "@/lib/cbamEngine";

/** The EU ETS reference price used in our CBAM calculator, € per tonne. */
export const ETS_REFERENCE = DEFAULT_EU_ETS_PRICE;
export const FAN_START = 2026;
export const FAN_END = 2034;

export interface Emissions { total: number; s1: number | null; s2: number | null }

/** Annual tCO2e from monthly bills x the shared factors, or a known annual total. */
export function annualEmissions(i: { kwhPerMonth: number; dieselLPerMonth: number; knownT?: number }): Emissions {
  if (i.knownT !== undefined) return { total: Math.max(0, i.knownT), s1: null, s2: null };
  const s2 = (Math.max(0, i.kwhPerMonth) * 12 * INDIA_GRID_FACTOR_KG_PER_KWH) / 1000;
  const s1 = (Math.max(0, i.dieselLPerMonth) * 12 * FUEL_FACTORS.DIESEL.value) / 1000;
  return { total: s1 + s2, s1, s2 };
}

export interface CostInput {
  tonnes: number;
  priceEur: number;
  /** EUR to INR rate entered by the visitor; INR is only shown when this is above 0. */
  eurInr?: number;
  /** Share of output exported to the EU, 0 to 100. */
  euSharePct?: number;
}

export interface Cost {
  eur: number;
  inr: number | null;
  /** Simplification: emissions x EU export share x price. */
  cbamEur: number | null;
  cbamInr: number | null;
}

export function carbonCost(i: CostInput): Cost | null {
  const t = Math.max(0, i.tonnes), p = Math.max(0, i.priceEur);
  if (!(t > 0) || !(p > 0)) return null;
  const eur = t * p;
  const rate = i.eurInr && i.eurInr > 0 ? i.eurInr : null;
  const share = i.euSharePct && i.euSharePct > 0 ? Math.min(100, i.euSharePct) / 100 : null;
  const cbamEur = share === null ? null : eur * share;
  return { eur, inr: rate ? eur * rate : null, cbamEur, cbamInr: rate && cbamEur !== null ? cbamEur * rate : null };
}

/**
 * Two price paths from FAN_START to FAN_END: flat at the chosen price, and an
 * illustrative linear rise to twice that price by FAN_END. Not a forecast.
 */
export function pricePaths(priceEur: number) {
  const n = FAN_END - FAN_START;
  const years: number[] = [], flat: number[] = [], rise: number[] = [];
  for (let k = 0; k <= n; k++) {
    years.push(FAN_START + k);
    flat.push(priceEur);
    rise.push(priceEur * (1 + k / n));
  }
  return { years, flat, rise };
}

export type Hazard = "flood" | "heat" | "water";
export const HAZARDS: Record<Hazard, { label: string; exposure: string }> = {
  flood: { label: "Our main site has flooded before", exposure: "Flood: past flooding at the main site. Check drainage, raised storage and insurance cover." },
  heat: { label: "Many days above 40°C", exposure: "Heat: frequent days above 40°C. Check worker heat stress, cooling load and equipment ratings." },
  water: { label: "Water shortages or tanker water", exposure: "Water: shortages or tanker supply. Check storage days, reuse and supply contracts." },
};

export const eur = (v: number) => `€${Math.round(v).toLocaleString("en-IN")}`;
export const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
/** Price as the buyer says it: whole euros above €10, else two decimals. */
export const priceLabel = (p: number) => `€${p >= 10 ? Math.round(p) : p.toFixed(2)}/t`;

export function costHeadline(c: Cost, priceEur: number, scope12: boolean): string {
  const what = scope12 ? "your Scope 1 and 2" : "your emissions";
  return `At ${priceLabel(priceEur)} ${what} would cost ${eur(c.eur)} a year${c.inr !== null ? ` (${inr(c.inr)})` : ""}.`;
}
