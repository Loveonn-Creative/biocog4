// Pure helpers for counting verified emissions and audit ledger rows once.
// History, Verify and the audit ledger export read existing emission IDs; none
// of these helpers create or mutate records.

export interface VerifiableEmissionRow {
  id: string;
  document_id?: string | null;
  scope: number;
  co2_kg: number;
  verified: boolean | null;
  created_at: string;
}

export interface LedgerRowLike {
  id: string;
  emission_id?: string | null;
  co2_kg: number;
  verification_status: string | null;
  created_at: string | null;
  verified_at?: string | null;
}

/**
 * Gross kg CO2e for one row, the rule every total uses (and verify-carbon
 * uses on the server): a finite positive value, otherwise 0. Legacy negative
 * (avoided) rows are never subtracted from a footprint.
 */
export const grossKg = (kg: number | string | null | undefined): number => {
  const n = typeof kg === 'string' ? Number(kg) : kg;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
};

const timeOf = (iso: string | null | undefined): number => {
  if (!iso) return Number.NEGATIVE_INFINITY;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
};

/**
 * Keep only the latest ledger row per emission_id. Re-verifications of the
 * same emission write a new ledger row per verification, so summing every row
 * double counts. Rows without an emission_id are kept as they are. Output
 * keeps newest first.
 */
export function latestLedgerRowPerEmission<T extends LedgerRowLike>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  const loose: T[] = [];
  for (const row of rows) {
    const key = row.emission_id;
    if (!key) { loose.push(row); continue; }
    const prev = latest.get(key);
    if (!prev) { latest.set(key, row); continue; }
    const a = Math.max(timeOf(row.created_at), timeOf(row.verified_at));
    const b = Math.max(timeOf(prev.created_at), timeOf(prev.verified_at));
    if (a > b) latest.set(key, row);
  }
  return [...latest.values(), ...loose].sort(
    (x, y) => Math.max(timeOf(y.created_at), timeOf(y.verified_at)) - Math.max(timeOf(x.created_at), timeOf(x.verified_at)),
  );
}

/** Total kg CO2e from verified ledger rows, counting each emission once (latest row). */
export function verifiedLedgerTotalKg<T extends LedgerRowLike>(rows: T[]): number {
  return latestLedgerRowPerEmission(rows)
    .filter((r) => r.verification_status === 'verified')
    .reduce((sum, r) => sum + grossKg(r.co2_kg), 0);
}

/** Verified emission rows only, one per emission id (last row seen wins). */
export function verifiedEmissionsOnce<T extends VerifiableEmissionRow>(rows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const r of rows) {
    if (r.verified === true) byId.set(r.id, r);
  }
  return [...byId.values()];
}

export interface ScopeTotals { scope1: number; scope2: number; scope3: number; total: number }

/** Scope totals from verified rows only, once per emission id. */
export function verifiedScopeTotals<T extends VerifiableEmissionRow>(rows: T[]): ScopeTotals {
  const t = { scope1: 0, scope2: 0, scope3: 0, total: 0 };
  for (const r of verifiedEmissionsOnce(rows)) {
    const kg = grossKg(r.co2_kg);
    if (r.scope === 1) t.scope1 += kg;
    else if (r.scope === 2) t.scope2 += kg;
    else t.scope3 += kg;
  }
  t.total = t.scope1 + t.scope2 + t.scope3;
  return t;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Monthly verified totals, sorted chronologically by a yyyy-mm key. */
export function verifiedMonthlyTrend<T extends VerifiableEmissionRow>(rows: T[]): Array<{ key: string; month: string; co2: number; count: number }> {
  const buckets = new Map<string, { key: string; month: string; co2: number; count: number }>();
  for (const r of verifiedEmissionsOnce(rows)) {
    const d = new Date(r.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const month = `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
    const b = buckets.get(key) ?? { key, month, co2: 0, count: 0 };
    b.co2 += grossKg(r.co2_kg);
    b.count += 1;
    buckets.set(key, b);
  }
  return [...buckets.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export interface VerifyListState<T> {
  scoped: T[];
  pending: T[];
  verifiedCount: number;
  /** True only when at least one verified row exists and none are pending. */
  allVerified: boolean;
}

/** Rows Verify should show, optionally scoped to one document. */
export function verifyListState<T extends VerifiableEmissionRow>(rows: T[], documentId?: string | null): VerifyListState<T> {
  const scoped = documentId ? rows.filter((r) => r.document_id === documentId) : rows;
  const pending = scoped.filter((r) => r.verified !== true);
  const verifiedCount = scoped.length - pending.length;
  return { scoped, pending, verifiedCount, allVerified: verifiedCount > 0 && pending.length === 0 };
}

export type DocumentEmissionStatus =
  | { kind: 'verified' }
  | { kind: 'pending'; count: number }
  | { kind: 'processing' }
  | { kind: 'not_calculable'; reason: string };

interface CachedLineItem { quantity?: unknown; unit?: unknown }

/**
 * Status of a stored document given its emission rows. A document with no rows
 * is either still processing (no cached extraction yet) or had no line item
 * that could be calculated (buildEmissionRows drops those).
 */
export function documentEmissionStatus(
  rows: Array<{ verified: boolean | null }>,
  cachedResult: unknown,
): DocumentEmissionStatus {
  if (rows.length > 0) {
    const pending = rows.filter((r) => r.verified !== true).length;
    return pending === 0 ? { kind: 'verified' } : { kind: 'pending', count: pending };
  }
  if (!cachedResult || typeof cachedResult !== 'object') return { kind: 'processing' };
  const items = (cachedResult as { lineItems?: unknown }).lineItems;
  const list: CachedLineItem[] = Array.isArray(items) ? items as CachedLineItem[] : [];
  const missingQty = list.some((i) => !(typeof i?.quantity === 'number' && i.quantity > 0));
  const missingUnit = list.some((i) => !(typeof i?.unit === 'string' && i.unit.trim()));
  if (list.length === 0) return { kind: 'not_calculable', reason: 'no line items found' };
  if (missingQty && missingUnit) return { kind: 'not_calculable', reason: 'missing quantity/unit' };
  if (missingQty) return { kind: 'not_calculable', reason: 'missing quantity' };
  if (missingUnit) return { kind: 'not_calculable', reason: 'missing unit' };
  return { kind: 'not_calculable', reason: 'missing classification or emission factor' };
}
