// Offer maths for the ad landing pages.
//
// Urgency is the onboarding batch, not the price (owner, 22 October 2026: the
// team onboards new customers in batches that start every 10 days). The clock
// counts down to the next real batch start, the same for every visitor, and
// rolls to the following batch when one starts. The struck price is a price
// anyone can pay today: the same plan billed monthly for twelve months.
import { LAUNCH_PRICES, type PaidPlan } from '../../../supabase/functions/_shared/planPricing';
import { checkoutTotal } from '../../../supabase/functions/_shared/checkoutTotals';

/** First onboarding batch; later batches start every BATCH_DAYS after it (IST midnight). */
export const BATCH_ANCHOR = '2026-11-02T00:00:00+05:30';
export const BATCH_DAYS = 10;
const DAY = 86_400_000;

export interface TimeLeft { over: boolean; days: number; hours: number; mins: number; secs: number; fraction: number; finalDays: boolean }

/** Time until `endsAt`, with the meter fraction measured over [startsAt, endsAt]. */
export function timeLeft(now: Date, endsAt: number, startsAt: number): TimeLeft {
  const ms = endsAt - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return { over: true, days: 0, hours: 0, mins: 0, secs: 0, fraction: 0, finalDays: false };
  const s = Math.floor(ms / 1000);
  return {
    over: false,
    days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60,
    fraction: Math.min(1, ms / Math.max(1, endsAt - startsAt)),
    finalDays: ms <= 2 * DAY,
  };
}

export interface Batch { startsAt: number; label: string; nextLabel: string; left: TimeLeft }

const dayLabel = (t: number) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

/** The next batch to join at `now` (strictly in the future) and the one after it. */
export function nextBatch(now = new Date()): Batch {
  const anchor = Date.parse(BATCH_ANCHOR);
  const period = BATCH_DAYS * DAY;
  const t = now.getTime();
  const startsAt = t < anchor ? anchor : anchor + (Math.floor((t - anchor) / period) + 1) * period;
  return { startsAt, label: dayLabel(startsAt), nextLabel: dayLabel(startsAt + period), left: timeLeft(now, startsAt, startsAt - period) };
}

export interface YearlyOffer { launch: number; regular: number; perMonth: number; save: number; percentOff: number; withGst: number }

/** Yearly plan in rupees against the same plan billed monthly for a year (both chargeable today). */
export function yearlyOffer(plan: PaidPlan): YearlyOffer {
  const launch = LAUNCH_PRICES[plan].yearly / 100;
  const regular = (LAUNCH_PRICES[plan].monthly * 12) / 100;
  // withGst: what checkout charges by UPI, from the same function the server uses.
  return { launch, regular, perMonth: Math.round(launch / 12), save: regular - launch, percentOff: Math.round((1 - launch / regular) * 100), withGst: checkoutTotal(LAUNCH_PRICES[plan].yearly, 'upi').totalPaise / 100 };
}

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const inrPaise = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
