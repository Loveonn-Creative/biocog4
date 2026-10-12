// Display arithmetic for the Pricing page. Prices are the ones the page has
// always shown; checkout amounts are set on the server (create-razorpay-order),
// so nothing here can change what anyone is charged.
import { PLAN_INVOICE_SCANS_PER_MONTH, type PlanTier } from '../../../supabase/functions/_shared/planLimits';

export type BillingCycle = 'yearly' | 'monthly';

/** Per-month price: yearly = monthly equivalent billed annually; monthly = billed monthly. */
export const TIER_PRICES = {
  essential: { yearly: 499, monthly: 1999 },
  pro: { yearly: 4999, monthly: 9999 },
} as const;

export type PaidTier = keyof typeof TIER_PRICES;

export interface YearlySaving { perYear: number; percent: number; billedYearly: number }

/** What yearly billing saves against paying monthly for twelve months. */
export function yearlySaving(tier: PaidTier): YearlySaving {
  const { yearly, monthly } = TIER_PRICES[tier];
  return {
    perYear: (monthly - yearly) * 12,
    percent: Math.round((1 - yearly / monthly) * 100),
    billedYearly: yearly * 12,
  };
}

/** The largest yearly saving across paid plans, for the toggle badge. */
export const MAX_SAVING_PERCENT = Math.max(...(Object.keys(TIER_PRICES) as PaidTier[]).map((t) => yearlySaving(t).percent));

export const PLAN_ORDER: PlanTier[] = ['snapshot', 'essential', 'pro', 'scale'];

/** The smallest plan whose monthly invoice allowance covers this volume. */
export function recommendPlan(invoicesPerMonth: number): PlanTier {
  const n = Math.max(0, Math.round(invoicesPerMonth));
  return PLAN_ORDER.find((p) => n <= PLAN_INVOICE_SCANS_PER_MONTH[p]) ?? 'scale';
}

/** Slider position (0 to 1000) to invoices a month, on a log scale from 1 to 12,000. */
export function sliderToInvoices(v: number): number {
  const k = Math.min(1000, Math.max(0, v)) / 1000;
  return Math.max(1, Math.round(Math.pow(10, k * Math.log10(12000))));
}
export function invoicesToSlider(n: number): number {
  return Math.round((Math.log10(Math.max(1, n)) / Math.log10(12000)) * 1000);
}

// ---- Add-ons ----

export type AddonCadence = 'monthly' | 'one-time' | 'per-report' | 'per-pack';
export interface Addon { id: string; name: string; price: string; amount: number; cadence: AddonCadence; unit?: string }

/** Labels and prices exactly as published; amount and cadence drive the builder. */
export const ADDONS: Addon[] = [
  { id: 'scans', name: 'Extra Invoice Scans', price: '₹49 per 100 scans', amount: 49, cadence: 'per-pack', unit: 'packs of 100 scans a month' },
  { id: 'dashboard', name: 'Custom Dashboard', price: '₹999/month', amount: 999, cadence: 'monthly' },
  { id: 'entities', name: 'Multi-entity Support', price: '₹1,999/month', amount: 1999, cadence: 'monthly' },
  { id: 'audit', name: 'Expert Climate Audit', price: '₹4,999 one-time', amount: 4999, cadence: 'one-time' },
  { id: 'fasttrack', name: 'Fast-track Verification', price: '₹2,999 per report', amount: 2999, cadence: 'per-report', unit: 'reports' },
  { id: 'streaming', name: 'Real-time Data Streaming', price: '₹1,499/month', amount: 1499, cadence: 'monthly' },
];

export interface AddonTotals { planPerMonth: number | null; monthly: number; oneTime: number; lines: Array<{ name: string; amount: number; when: string }> }

/**
 * Builder totals: the chosen plan's per-month price (null for Scale, quoted),
 * recurring add-ons per month (scan packs count as monthly), and one-time items.
 */
export function addonTotals(plan: PlanTier, cycle: BillingCycle, qty: Record<string, number>): AddonTotals {
  const planPerMonth = plan === 'snapshot' ? 0 : plan === 'scale' ? null : TIER_PRICES[plan][cycle];
  let monthly = 0, oneTime = 0;
  const lines: AddonTotals['lines'] = [];
  for (const a of ADDONS) {
    const q = Math.max(0, Math.floor(qty[a.id] ?? 0));
    if (!q) continue;
    const amount = a.amount * q;
    if (a.cadence === 'monthly' || a.cadence === 'per-pack') { monthly += amount; lines.push({ name: a.cadence === 'per-pack' ? `${a.name} × ${q}` : a.name, amount, when: 'a month' }); }
    else { oneTime += amount; lines.push({ name: q > 1 ? `${a.name} × ${q}` : a.name, amount, when: a.cadence === 'per-report' ? 'for those reports' : 'once' }); }
  }
  return { planPerMonth, monthly, oneTime, lines };
}

export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
