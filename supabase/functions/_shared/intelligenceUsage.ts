// Plan in force and daily/monthly use counts for Biocog Intelligence. Takes the
// Supabase client as an argument (no Deno or esm.sh imports), so the website
// tests run it with a fake client.

import { canonicalPlan, effectivePlanTier, type PlanTier } from './planLimits.ts';
import { dayIst, monthStartDayIst } from './intelligence.ts';
import { platformIp } from './platformIp.ts';

// The query builder's chain is typed loosely on purpose: this file must not
// import supabase-js (it runs in the website tests with a fake client).
interface Client {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (t: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: any) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
}

/** The plan in force for a user, from the canonical record (planLimits.canonicalPlan). */
export async function planForUser(admin: Client, userId: string, now = new Date()): Promise<PlanTier> {
  const [{ data: profile }, { data: subs }] = await Promise.all([
    admin.from('profiles').select('subscription_tier, subscription_expires_at').eq('id', userId).maybeSingle(),
    admin.from('subscriptions').select('tier, expires_at').eq('user_id', userId).eq('status', 'active'),
  ]);
  const inForce = canonicalPlan(
    { tier: profile?.subscription_tier, expiresAt: profile?.subscription_expires_at },
    subs ?? [],
    now,
  );
  return effectivePlanTier(inForce.tier, inForce.expiresAt, now);
}

/** A guest is counted by a keyed hash of their network address and the day; the address is never stored. */
export async function guestSubject(ip: string, day: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ip}|${day}`)));
  return 'g:' + [...sig.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The caller's address as the platform's proxy reports it. Unknown callers
 * share one guest count. Delegates to platformIp: the first X-Forwarded-For
 * entry is whatever the caller sent, so trusting it let a script rotate it
 * and reset the guest limits.
 */
export function clientIp(headers: Headers): string {
  return platformIp(headers);
}

export type UseKind = 'message' | 'voice_session' | 'guest_scan';
export interface UseResult { allowed: boolean; used: number; limit: number; store: 'database' | 'memory' }

// Until the intelligence_usage migration is applied, counts are kept per
// running function instance: weaker (each instance counts on its own, and a
// restart resets it) but never unlimited.
const memory = new Map<string, number>();
const missing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST202' || e.code === '42883' || e.code === '42P01' || /intelligence_(take|used)/.test(e.message ?? ''));

function window(kind: UseKind, now: Date) {
  const day = dayIst(now);
  // Questions and voice are monthly pools; guest invoice reads are daily.
  return { day, start: kind === 'guest_scan' ? day : monthStartDayIst(now) };
}

/** Counts one use if under the limit. */
export async function takeUse(admin: Client, subject: string, kind: UseKind, limit: number, now = new Date()): Promise<UseResult> {
  const { day, start } = window(kind, now);
  const { data, error } = await admin.rpc('intelligence_take', { p_subject: subject, p_kind: kind, p_day: day, p_window_start: start, p_limit: limit });
  if (!error) {
    const row = (Array.isArray(data) ? data[0] : data) as { allowed?: boolean; used?: number } | null;
    return { allowed: row?.allowed === true, used: Number(row?.used ?? 0), limit, store: 'database' };
  }
  if (!missing(error)) throw new Error(`usage count failed: ${error.code ?? error.message}`);
  const key = `${subject}|${kind}|${start}`;
  const used = memory.get(key) ?? 0;
  if (used >= limit) return { allowed: false, used, limit, store: 'memory' };
  memory.set(key, used + 1);
  return { allowed: true, used: used + 1, limit, store: 'memory' };
}

/** Reads the count without taking a use. */
export async function readUse(admin: Client, subject: string, kind: UseKind, limit: number, now = new Date()): Promise<UseResult> {
  const { day, start } = window(kind, now);
  const { data, error } = await admin.rpc('intelligence_used', { p_subject: subject, p_kind: kind, p_day: day, p_window_start: start });
  if (!error) return { allowed: Number(data ?? 0) < limit, used: Number(data ?? 0), limit, store: 'database' };
  if (!missing(error)) throw new Error(`usage read failed: ${error.code ?? error.message}`);
  const used = memory.get(`${subject}|${kind}|${start}`) ?? 0;
  return { allowed: used < limit, used, limit, store: 'memory' };
}

/** Test hook: clears the per-instance fallback counts. */
export function resetMemoryUse(): void { memory.clear(); }
