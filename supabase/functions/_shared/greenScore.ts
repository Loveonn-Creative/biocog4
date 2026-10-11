// Green score (estimated), 0-100: how much of a business's energy-related
// carbon is already avoided by clean sources, from its own verified records.
//
//   score     = 100 x A / (E + A)
//   potential = 100 x (A + S2) / (E + A)
//
//   E  = verified gross emissions (kg CO2e)
//   A  = avoided emissions documented on the same invoices (kg CO2e): solar
//        or wind kWh x the grid factor, EV use x the displaced diesel, etc.
//   S2 = verified Scope 2 (grid electricity) emissions: the part a switch to
//        clean power (rooftop solar, green tariff, RECs) can remove.
//
// E + A is what the business would emit with no clean sources at all, so the
// score is the share of that already avoided, and the potential is the share
// that would be avoided if grid power were also clean. Both are estimates
// from the same factors as the emissions; neither is a credit, payment or
// loan eligibility.

export interface GreenScore { score: number; potential: number }

export function estimateGreenScore(grossKg: number, avoidedKg: number, scope2Kg: number): GreenScore | null {
  const E = Number.isFinite(grossKg) && grossKg > 0 ? grossKg : 0;
  const A = Number.isFinite(avoidedKg) && avoidedKg > 0 ? avoidedKg : 0;
  const S2 = Number.isFinite(scope2Kg) && scope2Kg > 0 ? Math.min(scope2Kg, E) : 0;
  const base = E + A;
  if (base <= 0) return null;
  return {
    score: Math.round((100 * A) / base),
    potential: Math.round((100 * (A + S2)) / base),
  };
}

/** Avoided emissions recorded on the invoices behind these emissions, each invoice counted once. */
export function avoidedFromDocuments(docs: Array<{ id: string; cached_result?: { avoidedCO2Kg?: unknown } | null } | null | undefined>): number {
  const seen = new Set<string>();
  let total = 0;
  for (const d of docs) {
    if (!d || seen.has(d.id)) continue;
    seen.add(d.id);
    const v = Number(d.cached_result?.avoidedCO2Kg);
    if (Number.isFinite(v) && v > 0) total += v;
  }
  return total;
}
