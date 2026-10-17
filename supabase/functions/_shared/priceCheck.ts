// Price check: quantity × unit price should be close to the printed line
// total. A warning flag only: it never changes a quantity, factor or total.
// Pure, unit tested.
//
// Tolerance: 2% of the line total, and never less than ₹1, so paise rounding
// and a rounded unit price do not raise a flag. A larger gap usually means a
// misread digit, a discount or tax inside the line total, or a unit mismatch
// (price per tonne, quantity in kg); the user checks the source line.

export const PRICE_CHECK_TOLERANCE = 0.02;
export const PRICE_CHECK_MIN_GAP = 1;
export const PRICE_CHECK_PREFIX = 'Price check';

export interface PriceCheck {
  expected: number;
  total: number;
  /** (expected - total) / total, as a percentage, 1 decimal. */
  diffPct: number;
  message: string;
}

const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const inr = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Null when any figure is missing or the line agrees within tolerance. */
export function priceCheck(quantity: unknown, unitPrice: unknown, total: unknown): PriceCheck | null {
  if (!ok(quantity) || !ok(unitPrice) || !ok(total)) return null;
  const expected = Math.round(quantity * unitPrice * 100) / 100;
  const gap = Math.abs(expected - total);
  if (gap <= Math.max(PRICE_CHECK_MIN_GAP, total * PRICE_CHECK_TOLERANCE)) return null;
  const diffPct = Math.round(((expected - total) / total) * 1000) / 10;
  return {
    expected, total, diffPct,
    message: `${PRICE_CHECK_PREFIX}: quantity × price = ${inr(expected)}, line total ${inr(total)} (${diffPct > 0 ? '+' : ''}${diffPct}%). Check the source line; figures are unchanged.`,
  };
}
