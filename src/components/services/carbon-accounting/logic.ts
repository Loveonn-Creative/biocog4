import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from "@/lib/factors";
import { MANUFACTURING, type SectorKey } from "@/lib/nicSectors";

/** GHG Protocol Scope 3 categories (numbering from the Corporate Value Chain Standard). */
export const SCOPE3_CATEGORIES: Record<number, string> = {
  1: "Purchased goods and services", 2: "Capital goods", 3: "Fuel- and energy-related activities",
  4: "Upstream transport", 5: "Waste", 6: "Business travel", 7: "Employee commuting", 9: "Downstream transport",
  11: "Use of sold products", 12: "End-of-life of sold products",
};

/**
 * Categories that are usually the largest for a sector. A starting point to
 * confirm from purchase invoices, not a measurement.
 */
export function scope3Hotspots(sector?: SectorKey): number[] {
  if (!sector) return [1, 4, 3];
  if (sector === "it_services" || sector === "finance" || sector === "services") return [1, 6, 7];
  if (sector === "logistics") return [3, 1, 2];
  if (sector === "trade") return [1, 4, 9];
  if (sector === "electronics" || sector === "automotive") return [1, 11, 4];
  if (sector === "construction") return [1, 4, 5];
  if (sector === "agriculture" || sector === "food") return [1, 4, 5];
  if (sector === "energy") return [3, 11, 1];
  if (MANUFACTURING.includes(sector)) return [1, 4, 12];
  return [1, 4, 3];
}

export interface FootprintInput { kwhPerMonth: number; dieselLPerMonth: number; lpgKgPerMonth: number }

/** Annual Scope 1 and 2 in kg CO2, from monthly quantities x the shared factors. */
export function annualFootprint(i: FootprintInput) {
  const s2 = i.kwhPerMonth * 12 * INDIA_GRID_FACTOR_KG_PER_KWH;
  const diesel = i.dieselLPerMonth * 12 * FUEL_FACTORS.DIESEL.value;
  const lpg = i.lpgKgPerMonth * 12 * FUEL_FACTORS.LPG.value;
  return { s1: diesel + lpg, s2, diesel, lpg, total: diesel + lpg + s2 };
}
