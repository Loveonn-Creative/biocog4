// What a plan order costs. Used by create-razorpay-order; pure so the website
// tests run every branch.
//
// Launch prices are the prices charged today. A regular price, 2.5x the
// launch price, applies only once REGULAR_PRICING_STARTS_AT is set (null =
// not in force; set it only after the new pricing page and terms are
// published). From then:
//  - an account whose launch-priced plan is still in force (paid period or
//    grace) keeps the launch price when it renews that plan;
//  - an account whose plan has lapsed past grace, or that never had that
//    plan, pays the regular price.
// Existing subscriptions are never repriced: the amount is fixed per order,
// at order creation, and stored on the order row.
import { GRACE_DAYS } from './planLimits.ts';

export type PaidPlan = 'basic' | 'pro';
export type Cycle = 'monthly' | 'yearly';

/** Launch prices in paise, as charged today. 'basic' is the stored name of Essential. */
export const LAUNCH_PRICES: Record<PaidPlan, Record<Cycle, number> & { name: string }> = {
  basic: { monthly: 199900, yearly: 598800, name: 'Biocog Essential' },  // ₹1,999/mo or ₹5,988/yr
  pro: { monthly: 999900, yearly: 5998800, name: 'Biocog Pro' },         // ₹9,999/mo or ₹59,988/yr
};

export const REGULAR_MULTIPLIER = 2.5;

/** ISO date from which regular pricing applies. null: launch pricing for everyone.
 *  Owner, 22 October 2026: launch prices hold through 31 December 2026 (IST). */
export const REGULAR_PRICING_STARTS_AT: string | null = '2027-01-01T00:00:00+05:30';

/** True once regular pricing is in force for new buyers. */
export const regularPricingInForce = (now = new Date(), regularFrom: string | null = REGULAR_PRICING_STARTS_AT) =>
  !!regularFrom && now.getTime() >= Date.parse(regularFrom);

/** Regular price in paise: 2.5x launch, exact in paise (no rounding needed for current prices). */
export const regularPrice = (plan: PaidPlan, cycle: Cycle) => Math.round(LAUNCH_PRICES[plan][cycle] * REGULAR_MULTIPLIER);

/** List price a new buyer sees today, in paise (launch before the date, regular from it). */
export const listPrice = (plan: PaidPlan, cycle: Cycle, now = new Date(), regularFrom: string | null = REGULAR_PRICING_STARTS_AT) =>
  regularPricingInForce(now, regularFrom) ? regularPrice(plan, cycle) : LAUNCH_PRICES[plan][cycle];

export interface PriceHistoryRow { tier: string; amount: number | null; expires_at: string | null }

export interface OrderPrice { paise: number; name: string; basis: 'launch' | 'launch_retained' | 'regular' }

/**
 * Price for a new order. `history` is the account's subscription rows with
 * status 'active' (amount in rupees, as stored). A row keeps launch pricing
 * if its amount was a launch price for that plan and it is still in force.
 */
export function orderPrice(plan: PaidPlan, cycle: Cycle, history: PriceHistoryRow[], now = new Date(), regularFrom: string | null = REGULAR_PRICING_STARTS_AT): OrderPrice {
  const launch = LAUNCH_PRICES[plan];
  if (!regularPricingInForce(now, regularFrom)) return { paise: launch[cycle], name: launch.name, basis: 'launch' };
  const launchRupees = new Set([launch.monthly / 100, launch.yearly / 100]);
  const graceMs = GRACE_DAYS * 86_400_000;
  const retained = history.some((r) =>
    r.tier === plan && r.amount !== null && launchRupees.has(Number(r.amount))
    && !!r.expires_at && Date.parse(r.expires_at) + graceMs >= now.getTime());
  return retained
    ? { paise: launch[cycle], name: launch.name, basis: 'launch_retained' }
    : { paise: regularPrice(plan, cycle), name: launch.name, basis: 'regular' };
}
