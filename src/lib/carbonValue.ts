// Carbon credit valuation, shared by Dashboard, Verify, MRV, Reports and
// Monetize. A credit is issued for a verified REDUCTION (or removal), never
// for emissions, so a value needs two things the platform does not have yet:
// verified reductions (verify-carbon records none, it has no certificate or
// meter evidence path) and a dated, sourced market price. Until both exist,
// every page shows that the value is withheld instead of a rupee figure.
// Unverified emissions, invoice amounts and estimates never feed this.
//
// Keep in sync with supabase/functions/_shared/carbonValue.ts.

/** A market price with its source and date. */
export interface CreditPrice { inrPerT: number; source: string; asOf: string }

/** No sourced, dated price is confirmed, so no value is computed. */
export const CONFIRMED_CREDIT_PRICE: CreditPrice | null = null;

export const CREDIT_VALUE_WITHHELD =
  'No rupee value is shown. Carbon credits are issued for verified reductions, and none are recorded yet. A value also needs a dated, sourced market price.';

export type CreditValuation =
  | { available: true; valueInr: number; price: CreditPrice }
  | { available: false; reason: 'no_verified_reductions' | 'no_dated_price' };

/** Verified kilograms of CO2e to tonnes. Negative or non-finite inputs count as zero. */
export const kgToTonnes = (kg: number | null | undefined): number =>
  typeof kg === 'number' && Number.isFinite(kg) && kg > 0 ? kg / 1000 : 0;

/** Value of verified reductions at a confirmed price; withheld otherwise. */
export function creditValuation(
  verifiedReductionsKg: number | null | undefined,
  price: CreditPrice | null = CONFIRMED_CREDIT_PRICE,
): CreditValuation {
  const tonnes = kgToTonnes(verifiedReductionsKg);
  if (tonnes <= 0) return { available: false, reason: 'no_verified_reductions' };
  if (!price || !(price.inrPerT > 0) || !price.source.trim() || !price.asOf.trim()) return { available: false, reason: 'no_dated_price' };
  return { available: true, valueInr: Math.round(tonnes * price.inrPerT), price };
}

/**
 * Sum verified kg once per emission. Rows with the same emission id (for
 * example from overlapping verifications) are counted once, using the last
 * row seen. Rows without an id are counted as they come.
 */
export function sumVerifiedKgOncePerEmission<T>(
  rows: T[],
  getId: (r: T) => string | null | undefined,
  getKg: (r: T) => number | null | undefined,
  isVerified: (r: T) => boolean = () => true,
): number {
  const byId = new Map<string, number>();
  let loose = 0;
  for (const r of rows) {
    if (!isVerified(r)) continue;
    const kg = getKg(r);
    const v = typeof kg === 'number' && Number.isFinite(kg) && kg > 0 ? kg : 0;
    const id = getId(r);
    if (id) byId.set(id, v); else loose += v;
  }
  let total = loose;
  for (const v of byId.values()) total += v;
  return total;
}
