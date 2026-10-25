// This month's reads and the credits left, worked out the way the server's
// reserve_invoice_read does, so the numbers shown match what is enforced.
// Pure; the hook (useInvoiceAllowance) reads the rows.

export interface ReadRow { plan_units: number; status: string; created_at: string }
export interface PackRow {
  id: string; packs: number; credits: number; used: number; validity: string; status: string;
  paid_at: string | null; expires_at: string | null; created_at: string;
  /** 'enterprise-…' for reads a buyer covers (enterprise billing). */
  razorpay_order_id?: string | null;
}

const RESERVATION_MS = 15 * 60_000;

/** Plan reads used this period: committed reads plus reservations under 15 minutes old. */
export function planReadsUsed(rows: ReadRow[], now = new Date()): number {
  return rows.reduce((n, r) => n + (r.status === 'committed' || (r.status === 'reserved' && now.getTime() - Date.parse(r.created_at) < RESERVATION_MS) ? r.plan_units : 0), 0);
}

/** When a pack stops giving credits: 30 days after the paid plan ends for yearly packs, if sooner. */
export function packUsableUntil(p: PackRow, planEnd: string | null): string | null {
  if (!p.expires_at) return null;
  if (p.validity !== 'yearly') return p.expires_at;
  const cap = Date.parse(planEnd ?? p.paid_at ?? p.expires_at) + 30 * 86_400_000;
  return new Date(Math.min(Date.parse(p.expires_at), cap)).toISOString();
}

export function creditsLeft(packs: PackRow[], planEnd: string | null, now = new Date()): number {
  return packs.reduce((n, p) => {
    const until = packUsableUntil(p, planEnd);
    return p.status === 'active' && until && Date.parse(until) > now.getTime() ? n + Math.max(0, p.credits - p.used) : n;
  }, 0);
}
