// One source for plan allowances, used by the extraction function (which
// enforces them) and by the website (which displays them). Pure: no Deno
// imports, so the website tests run it too.

export type PlanTier = 'snapshot' | 'essential' | 'pro' | 'scale';

/** New invoice reads per calendar month (India time). Repeat uploads of a stored invoice are free. */
export const PLAN_INVOICE_SCANS_PER_MONTH: Record<PlanTier, number> = {
  snapshot: 10,
  essential: 100,
  pro: 1000,
  scale: 10000,
};

/** Stored tier names to a plan; 'basic' is the old name for Essential. Unknown means Snapshot. */
export function normalizePlanTier(tier: string | null | undefined): PlanTier {
  const t = (tier || '').toLowerCase();
  if (t === 'basic' || t === 'essential') return 'essential';
  if (t === 'pro' || t === 'scale') return t;
  return 'snapshot';
}

/** The plan in force: a paid tier whose subscription has expired falls back to Snapshot. */
export function effectivePlanTier(tier: string | null | undefined, expiresAt: string | null | undefined, now = new Date()): PlanTier {
  const plan = normalizePlanTier(tier);
  if (plan === 'snapshot' || !expiresAt) return plan;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t < now.getTime() ? 'snapshot' : plan;
}

export function invoiceScanLimit(tier: string | null | undefined, expiresAt?: string | null, now = new Date()): number {
  return PLAN_INVOICE_SCANS_PER_MONTH[effectivePlanTier(tier, expiresAt, now)];
}

/** Start of the current calendar month in India time (UTC+5:30), as an ISO instant. */
export function monthStartIst(now = new Date()): string {
  const ist = new Date(now.getTime() + 330 * 60_000);
  const startIstAsUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1);
  return new Date(startIstAsUtc - 330 * 60_000).toISOString();
}

export function monthlyLimitMessage(limit: number): string {
  return `You have used this month's ${limit} invoice reads on your plan. Already stored invoices still open as usual. Upgrade on the Subscription page, or wait for the new month.`;
}

const PLAN_RANK: Record<PlanTier, number> = { snapshot: 0, essential: 1, pro: 2, scale: 3 };

/**
 * The higher of two plans in force, each with its own expiry. Used so an
 * active paid subscription row counts even if the profile copy of the tier
 * failed to update.
 */
export function strongerPlan(
  a: { tier: string | null | undefined; expiresAt: string | null | undefined },
  b: { tier: string | null | undefined; expiresAt: string | null | undefined },
  now = new Date(),
): { tier: string | null | undefined; expiresAt: string | null | undefined } {
  const pa = effectivePlanTier(a.tier, a.expiresAt, now);
  const pb = effectivePlanTier(b.tier, b.expiresAt, now);
  return PLAN_RANK[pb] > PLAN_RANK[pa] ? b : a;
}
