// Launch-price offer on the ad landing pages. The deadline is the date
// checkout starts charging the regular price (REGULAR_PRICING_STARTS_AT), so
// the countdown ends exactly when the price really changes: no evergreen or
// per-visitor timers. Struck prices are the regular prices from that date.
import { LAUNCH_PRICES, REGULAR_PRICING_STARTS_AT, regularPrice, type PaidPlan } from '../../../supabase/functions/_shared/planPricing';

/** When the launch offer was announced on these pages; the meter drains from here. */
export const OFFER_STARTS_AT = '2026-10-22T00:00:00+05:30';

export interface TimeLeft { over: boolean; days: number; hours: number; mins: number; secs: number; fraction: number; finalWeek: boolean }

export function timeLeft(now = new Date(), endsAt: string | null = REGULAR_PRICING_STARTS_AT, startsAt = OFFER_STARTS_AT): TimeLeft {
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
export const offerEndsLabel = (endsAt: string | null = REGULAR_PRICING_STARTS_AT) =>
  endsAt ? new Date(Date.parse(endsAt) - 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }) : '';

export interface YearlyOffer { launch: number; regular: number; perMonth: number; save: number; percentOff: number }

/** Yearly plan in rupees: launch price, the regular price it becomes, and the saving. */
export function yearlyOffer(plan: PaidPlan): YearlyOffer {
  const launch = LAUNCH_PRICES[plan].yearly / 100;
  const regular = regularPrice(plan, 'yearly') / 100;
  return { launch, regular, perMonth: Math.round(launch / 12), save: regular - launch, percentOff: Math.round((1 - launch / regular) * 100) };
}

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
