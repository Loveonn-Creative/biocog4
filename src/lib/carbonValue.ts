// One formula for the indicative carbon value shown on Dashboard, Verify,
// MRV, Reports and Monetize. It is verified tCO2e x a single reference rate.
// It is NOT an issued credit, a quote, or money owed: no registry has issued
// anything, and no buyer has agreed a price. Unverified emissions, invoice
// amounts and estimates never feed this number.
//
// Keep in sync with supabase/functions/_shared/carbonValue.ts.

/** Reference rate in INR per tCO2e. Source still to be confirmed by the business. */
export const INDICATIVE_RATE_INR_PER_T = 750;
export const INDICATIVE_RATE_SOURCE = 'Senseible reference rate, pending source confirmation';
export const INDICATIVE_RATE_AS_OF = '2026-10-11';
export const INDICATIVE_VALUE_LABEL = 'Indicative value at ₹750/t, not an issued credit';

/** Verified kilograms of CO2e to tonnes. Negative or non-finite inputs count as zero. */
export const kgToTonnes = (kg: number | null | undefined): number =>
  typeof kg === 'number' && Number.isFinite(kg) && kg > 0 ? kg / 1000 : 0;

/** Indicative INR value for a verified quantity in tonnes, rounded to whole rupees. */
export const indicativeValueInr = (verifiedTonnes: number): number =>
  Number.isFinite(verifiedTonnes) && verifiedTonnes > 0 ? Math.round(verifiedTonnes * INDICATIVE_RATE_INR_PER_T) : 0;

/** Same, from verified kilograms. */
export const indicativeValueFromKg = (verifiedKg: number | null | undefined): number =>
  indicativeValueInr(kgToTonnes(verifiedKg));

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
