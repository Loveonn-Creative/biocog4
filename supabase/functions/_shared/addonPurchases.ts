// Add-on purchases bought from the profile: invoice credit packs, Expert
// Climate Audit and Fast-track Verification. Prices, validity and the page
// counting switch live here only; the purchases function and the website both
// read them, and client-supplied amounts are never trusted. Pure: no Deno APIs.

export const CREDIT_PACK_INVOICES = 100;
export const CREDIT_PACK_BASE_PAISE = 7900;       // ₹79 per 100 invoices
export const MAX_PACKS = 50;

export type ServiceKind = 'expert_audit' | 'fast_track';
export const SERVICES: Record<ServiceKind, { name: string; basePaise: number; perReport: boolean; maxQty: number; turnaround: string | null }> = {
  expert_audit: { name: 'Expert Climate Audit', basePaise: 799900, perReport: false, maxQty: 1, turnaround: null },
  fast_track: { name: 'Fast-track Verification', basePaise: 299900, perReport: true, maxQty: 20, turnaround: '24–72 hours' },
};
/** Fast-track results are due within this many hours of payment. */
export const FAST_TRACK_DUE_HOURS = 72;

export type PurchaseItem =
  | { item: 'credits'; packs: number }
  | { item: ServiceKind; quantity: number };

/** Reads a request body into a purchase, or null when it is not one we sell. */
export function parsePurchase(body: unknown): PurchaseItem | null {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const whole = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= max ? (v as number) : null);
  if (b.item === 'credits') { const packs = whole(b.packs, MAX_PACKS); return packs ? { item: 'credits', packs } : null; }
  if (b.item === 'expert_audit' || b.item === 'fast_track') {
    const s = SERVICES[b.item];
    const quantity = s.perReport ? whole(b.quantity ?? 1, s.maxQty) : 1;
    return quantity ? { item: b.item, quantity } : null;
  }
  return null;
}

/** Base price in paise (before GST and any card fee). */
export function basePaiseFor(p: PurchaseItem): number {
  return p.item === 'credits' ? p.packs * CREDIT_PACK_BASE_PAISE : SERVICES[p.item].basePaise * p.quantity;
}

export function purchaseName(p: PurchaseItem): string {
  if (p.item === 'credits') return `${(p.packs * CREDIT_PACK_INVOICES).toLocaleString('en-IN')} invoice credits`;
  const s = SERVICES[p.item];
  return s.perReport && p.quantity > 1 ? `${s.name} × ${p.quantity}` : s.name;
}

const DAY = 86_400_000;
/** Credits bought on a yearly plan last 12 months; otherwise (monthly or free) 30 days. */
export const creditValidity = (planCycle: 'monthly' | 'yearly' | null): 'yearly' | 'monthly' => (planCycle === 'yearly' ? 'yearly' : 'monthly');
export const packExpiry = (validity: 'yearly' | 'monthly', paidAt: Date): Date => new Date(paidAt.getTime() + (validity === 'yearly' ? 365 : 30) * DAY);

// Page counting (each PDF page and each image is one invoice) starts with
// each account's next period: yearly and free accounts on 1 November 2026
// (India time), monthly accounts at their next billing date, and every
// account by 1 December 2026.
export const PAGE_COUNTING_STARTS = '2026-10-31T18:30:00.000Z'; // 1 Nov 2026 00:00 IST
const PAGE_COUNTING_LATEST = '2026-11-30T18:30:00.000Z';       // 1 Dec 2026 00:00 IST

export function pageCountingFrom(plan: { cycle: 'monthly' | 'yearly' | null; expiresAt: string | null }, now = new Date()): string {
  if (plan.cycle === 'monthly' && plan.expiresAt) {
    const t = Date.parse(plan.expiresAt);
    if (Number.isFinite(t) && t > now.getTime()) {
      return new Date(Math.min(Math.max(t, Date.parse(PAGE_COUNTING_STARTS)), Date.parse(PAGE_COUNTING_LATEST))).toISOString();
    }
  }
  return PAGE_COUNTING_STARTS;
}
