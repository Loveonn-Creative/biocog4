// Launch-price offer on the ad landing pages. The countdown runs to the
// owner's launch-price review date (31 December 2026), one fixed date for every
// visitor: no evergreen or per-visitor timers. The struck price is a price
// anyone can pay today: the same plan billed monthly for twelve months.
import { LAUNCH_PRICES, type PaidPlan } from '../../../supabase/functions/_shared/planPricing';
import { checkoutTotal } from '../../../supabase/functions/_shared/checkoutTotals';
import { LAUNCH_REVIEW_AT, launchEndsLabel } from '../pricing/launchWindow';

/** When the launch offer was announced on these pages; the meter drains from here. */
export const OFFER_STARTS_AT = '2026-10-22T00:00:00+05:30';

export interface TimeLeft { over: boolean; days: number; hours: number; mins: number; secs: number; fraction: number; finalWeek: boolean }

export function timeLeft(now = new Date(), endsAt: string | null = LAUNCH_REVIEW_AT, startsAt = OFFER_STARTS_AT): TimeLeft {
  const end = endsAt ? Date.parse(endsAt) : NaN;
  const ms = end - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return { over: true, days: 0, hours: 0, mins: 0, secs: 0, fraction: 0, finalWeek: false };
  const s = Math.floor(ms / 1000);
  const total = Math.max(1, end - Date.parse(startsAt));
  return {
    over: false,
    days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60,
    fraction: Math.min(1, ms / total),
    finalWeek: ms <= 7 * 86_400_000,
  };
}

/** Last launch day, e.g. "31 December". */
export const offerEndsLabel = () => launchEndsLabel();

export interface YearlyOffer { launch: number; regular: number; perMonth: number; save: number; percentOff: number; upiTotal: number }

/** Yearly plan in rupees against the same plan billed monthly for a year (both chargeable today). */
export function yearlyOffer(plan: PaidPlan): YearlyOffer {
  const launch = LAUNCH_PRICES[plan].yearly / 100;
  const regular = (LAUNCH_PRICES[plan].monthly * 12) / 100;
  // upiTotal: what checkout charges by UPI (GST included, no platform fee), from the same function the server uses.
  return { launch, regular, perMonth: Math.round(launch / 12), save: regular - launch, percentOff: Math.round((1 - launch / regular) * 100), upiTotal: checkoutTotal(LAUNCH_PRICES[plan].yearly, 'upi').totalPaise / 100 };
}

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const inrPaise = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
