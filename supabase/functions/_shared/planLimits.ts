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

/**
 * Days a paid plan stays in force after its paid period ends, so a renewal
 * paid a few days late does not cut access. During grace the account keeps
 * its plan and is told when access changes; after grace it moves to Snapshot
 * (records are kept; only paid allowances stop).
 */
export const GRACE_DAYS = 7;
const DAY_MS = 86_400_000;

export type PlanState = 'none' | 'active' | 'grace' | 'lapsed';

/**
 * Where a paid plan stands: active until its paid period ends, then in grace
 * for GRACE_DAYS, then lapsed. A free or unknown tier is 'none'. A paid tier
 * without an expiry (manual grant) is active.
 */
export function planStatus(tier: string | null | undefined, expiresAt: string | null | undefined, now = new Date()): { plan: PlanTier; paidTier: PlanTier; state: PlanState; graceEndsAt: string | null } {
  const paidTier = normalizePlanTier(tier);
  if (paidTier === 'snapshot') return { plan: 'snapshot', paidTier, state: 'none', graceEndsAt: null };
  if (!expiresAt) return { plan: paidTier, paidTier, state: 'active', graceEndsAt: null };
  const t = Date.parse(expiresAt);
  if (!Number.isFinite(t)) return { plan: 'snapshot', paidTier, state: 'lapsed', graceEndsAt: null };
  const graceEnd = t + GRACE_DAYS * DAY_MS;
  const graceEndsAt = new Date(graceEnd).toISOString();
  if (now.getTime() <= t) return { plan: paidTier, paidTier, state: 'active', graceEndsAt };
  if (now.getTime() <= graceEnd) return { plan: paidTier, paidTier, state: 'grace', graceEndsAt };
  return { plan: 'snapshot', paidTier, state: 'lapsed', graceEndsAt };
}

/** The plan in force: a paid plan stays in force through its grace period, then falls back to Snapshot. */
export function effectivePlanTier(tier: string | null | undefined, expiresAt: string | null | undefined, now = new Date()): PlanTier {
  return planStatus(tier, expiresAt, now).plan;
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

/** Shown when the plan's reads and any credits are used up (owner wording, October 2026). */
export function monthlyLimitMessage(_limit: number): string {
  return 'Page limit reached. Upgrade, wait until next month, or top up credits now on your Subscription page.';
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

/**
 * The subscription row that decides the plan in force: the highest plan still
 * in force (paid period or grace), latest end date first. Renewals paid early
 * start when the current period ends, so several active rows can exist.
 */
export function strongestRow<T extends { tier: string | null | undefined; expires_at: string | null | undefined }>(rows: T[], now = new Date()): T | null {
  const live = rows.filter((r) => effectivePlanTier(r.tier, r.expires_at, now) !== 'snapshot' && r.expires_at);
  live.sort((a, b) => PLAN_RANK[normalizePlanTier(b.tier)] - PLAN_RANK[normalizePlanTier(a.tier)] || Date.parse(b.expires_at as string) - Date.parse(a.expires_at as string));
  return live[0] ?? null;
}

/**
 * The plan in force, from one record. The account's active subscription rows
 * are the canonical record (Razorpay activation and staff reconciliation both
 * write them); the strongest row still in force decides. The profile copy is
 * read only when no subscription row is in force, which covers accounts
 * granted a plan before subscription rows were kept for every plan.
 */
export function canonicalPlan<T extends { tier: string | null | undefined; expires_at: string | null | undefined }>(
  profile: { tier: string | null | undefined; expiresAt: string | null | undefined } | null | undefined,
  activeRows: T[],
  now = new Date(),
): { tier: string | null | undefined; expiresAt: string | null | undefined; source: 'subscription' | 'profile' | 'none'; row: T | null } {
  const row = strongestRow(activeRows, now);
  if (row) return { tier: row.tier, expiresAt: row.expires_at, source: 'subscription', row };
  if (profile && effectivePlanTier(profile.tier, profile.expiresAt, now) !== 'snapshot') {
    return { tier: profile.tier, expiresAt: profile.expiresAt, source: 'profile', row: null };
  }
  return { tier: 'snapshot', expiresAt: null, source: 'none', row: null };
}
