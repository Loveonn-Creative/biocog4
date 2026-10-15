// Checkout totals by payment method, in paise. One source for the Pricing
// page breakdown and for create-razorpay-order, which charges the result.
// Pure (no Deno or esm.sh imports), so the website tests run it.
//
// Owner decision (Oct 2026): listed plan prices exclude GST. UPI pays the
// listed price + 18% GST. Card, netbanking and wallet via Razorpay add a flat
// 4% platform fee, then 18% GST on price + fee. The fee can be waived for a
// customer by setting their method to UPI-equivalent server-side later; the
// rate is a constant so a provider change is one edit.

export const PLATFORM_FEE_RATE = 0.04;
export const GST_RATE = 0.18;

export type PaymentMethod = 'upi' | 'razorpay';
export const PAYMENT_METHODS: PaymentMethod[] = ['upi', 'razorpay'];

export const isPaymentMethod = (v: unknown): v is PaymentMethod => v === 'upi' || v === 'razorpay';

export interface CheckoutTotal {
  method: PaymentMethod;
  basePaise: number;
  feePaise: number;
  gstPaise: number;
  totalPaise: number;
}

/** Base, fee and GST each rounded to the paisa (2 decimals in rupees); total is their sum. */
export function checkoutTotal(basePaise: number, method: PaymentMethod): CheckoutTotal {
  if (!Number.isInteger(basePaise) || basePaise <= 0) throw new Error('base must be a positive whole number of paise');
  const feePaise = method === 'razorpay' ? Math.round(basePaise * PLATFORM_FEE_RATE) : 0;
  const gstPaise = Math.round((basePaise + feePaise) * GST_RATE);
  return { method, basePaise, feePaise, gstPaise, totalPaise: basePaise + feePaise + gstPaise };
}

/** What choosing UPI saves against Razorpay for the same plan, in paise. */
export const upiSavingPaise = (basePaise: number) =>
  checkoutTotal(basePaise, 'razorpay').totalPaise - checkoutTotal(basePaise, 'upi').totalPaise;

/** Every amount (rupees) a given list price can be charged at: legacy base-only and each method's total. */
export function chargedRupeesFor(basePaise: number): number[] {
  return [basePaise, ...PAYMENT_METHODS.map((m) => checkoutTotal(basePaise, m).totalPaise)].map((p) => p / 100);
}
