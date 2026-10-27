// Monthly report download allowance on the free plan. Takes the Supabase
// client as an argument (no Deno or esm.sh imports), so the website tests run
// it with a fake client.
//
// Rules: paid plans and enterprise accounts (custom terms, granted by
// Senseible staff) are never limited. On the free plan (Snapshot) each new
// report download in the India-time month counts once; the same report key
// again in the same month is not counted (report_download_take). Whenever the
// plan or the count cannot be read, the download is allowed (degraded), so a
// fault never blocks anyone.

import { canonicalPlan, effectivePlanTier, type PlanTier } from './planLimits.ts';
import { usageWindow } from './intelligenceUsage.ts';

export const FREE_REPORT_DOWNLOADS_PER_MONTH = 1;

interface Client {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (t: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: any) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
}

export type Allowance =
  | { allowed: true; unlimited: true }
  | { allowed: true; degraded: true }
  | { allowed: boolean; used: number; limit: number; resetsOn: string; repeat: boolean };

/** First day of the next India-time month, YYYY-MM-DD, from a window start (YYYY-MM-01). */
export function nextMonthStart(windowStart: string): string {
  const [y, m] = windowStart.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/**
 * The plan in force, or null when either record could not be read. Unlike
 * planForUser, a read error is not treated as the free plan, so a paid user is
 * never limited because of a fault.
 */
export async function planOrNull(admin: Client, userId: string, now = new Date()): Promise<PlanTier | null> {
  try {
    const [p, s] = await Promise.all([
      admin.from('profiles').select('subscription_tier, subscription_expires_at').eq('id', userId).maybeSingle(),
      admin.from('subscriptions').select('tier, expires_at').eq('user_id', userId).eq('status', 'active'),
    ]);
    if (p?.error || s?.error) return null;
    const inForce = canonicalPlan(
      { tier: p?.data?.subscription_tier, expiresAt: p?.data?.subscription_expires_at },
      s?.data ?? [],
      now,
    );
    return effectivePlanTier(inForce.tier, inForce.expiresAt, now);
  } catch {
    return null;
  }
}

/** Decides one download for a signed-in user. `key` comes from reportDownloadKey. */
export async function reportAllowance(admin: Client, userId: string, key: string, now = new Date(), email?: string | null): Promise<Allowance> {
  const plan = await planOrNull(admin, userId, now);
  if (plan === null) return { allowed: true, degraded: true };
  if (plan !== 'snapshot') return { allowed: true, unlimited: true };
  // Enterprise terms are custom: the free-plan limit never applies to them.
  if (email) {
    try {
      const ent = await admin.from('enterprise_access').select('id').eq('email', email.trim().toLowerCase()).eq('status', 'active').maybeSingle();
      // No enterprise table yet means no enterprise accounts; any other error allows the download.
      const missing = ent?.error && ['42P01', 'PGRST205', 'PGRST200'].includes(ent.error.code ?? '');
      if (ent?.error && !missing) return { allowed: true, degraded: true };
      if (ent?.data) return { allowed: true, unlimited: true };
    } catch {
      return { allowed: true, degraded: true };
    }
  }

  const { day, start } = usageWindow('report_download', now);
  const limit = FREE_REPORT_DOWNLOADS_PER_MONTH;
  try {
    const { data, error } = await admin.rpc('report_download_take', {
      p_user: userId, p_report_key: key, p_day: day, p_window_start: start, p_limit: limit,
    });
    if (error) return { allowed: true, degraded: true };
    const row = (Array.isArray(data) ? data[0] : data) as { allowed?: boolean; used?: number; repeat?: boolean } | null;
    if (!row || typeof row.allowed !== 'boolean') return { allowed: true, degraded: true };
    return { allowed: row.allowed, used: Number(row.used ?? 0), limit, resetsOn: nextMonthStart(start), repeat: row.repeat === true };
  } catch {
    return { allowed: true, degraded: true };
  }
}
