// Sustainability-linked loan saving. The margin step-down comes from the
// visitor's term sheet (or a labelled example), never a hidden default.
// Simplification: the full loan amount is outstanding for the whole tenor.
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from "@/lib/factors";

export interface LoanInput { loanInr: number; tenorYears: number; stepDownBps: number }

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Annual interest saved = loan x bps / 10,000 (full amount outstanding). */
export function annualSaving(loanInr: number, bps: number): number {
  return (pos(loanInr) * pos(bps)) / 10_000;
}

/** Saving over the tenor if the KPI is met every year. */
export function loanSaving(i: LoanInput) {
  const annual = annualSaving(i.loanInr, i.stepDownBps);
  const years = pos(i.tenorYears);
  return { annual, years, total: annual * years };
}

/** Annual baseline in kg CO2e, from tonnes or from monthly bills x shared factors. */
export function baselineKg(b: { mode: "tonnes"; tonnesPerYear: number } | { mode: "bills"; kwhPerMonth: number; dieselLPerMonth: number }): number {
  if (b.mode === "tonnes") return pos(b.tonnesPerYear) * 1000;
  return pos(b.kwhPerMonth) * 12 * INDIA_GRID_FACTOR_KG_PER_KWH + pos(b.dieselLPerMonth) * 12 * FUEL_FACTORS.DIESEL.value;
}

/** Annual reduction (kg) the KPI target asks for. Target is a percentage, capped at 100. */
export function kpiCutKg(baseKg: number, targetPct: number): number {
  return pos(baseKg) * Math.min(100, pos(targetPct)) / 100;
}

const fmt = (n: number, d = 2) => n.toLocaleString("en-IN", { maximumFractionDigits: d });

/** INR in buyer's words: crore and lakh where natural, en-IN grouping otherwise. */
export function inr(n: number): string {
  const v = pos(n);
  if (v >= 1e7) return `₹${fmt(v / 1e7)} crore`;
  if (v >= 1e5) return `₹${fmt(v / 1e5)} lakh`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

export const tonnes = (kg: number) => fmt(pos(kg) / 1000, 1);
