// Proof moments: three one-time milestones worked out from the account's own
// records. Pure, so each is tested. Shown once each, newest achievement first.
import type { ActionDocument, ActionEmission } from './intelligentActions';

export type MomentId = 'first_verified' | 'six_months' | 'pf_confirmed';
export type Moment =
  | { id: 'first_verified'; vendor: string | null; month: string; quantity: number; unit: string; kg: number; fingerprint: string | null }
  | { id: 'six_months'; months: string[] }
  | { id: 'pf_confirmed'; before: number; after: number; month: string };

const monthOf = (d: string | null | undefined) => (d && /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : null);
const dateOf = (e: { activity_date?: string | null; created_at: string }) => e.activity_date ?? e.created_at;

function addMonths(ym: string, n: number) {
  let [y, m] = ym.split('-').map(Number);
  m += n; while (m < 1) { m += 12; y -= 1; } while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function firstVerified(emissions: ActionEmission[], docs: ActionDocument[]): Moment | null {
  const rows = emissions
    .filter((e) => e.verified && typeof e.activity_data === 'number' && e.activity_data > 0 && e.activity_unit && e.co2_kg > 0)
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  // A measured quantity (kWh, litres, kg) says more than a count of items.
  const measured = rows.filter((r) => !/^(items?|nos?|pcs|pieces?)$/i.test(r.activity_unit!.trim()));
  const e = measured[0] ?? rows[0];
  if (!e) return null;
  const d = e.document_id ? docs.find((x) => x.id === e.document_id) : undefined;
  const hash = (d as { document_hash?: string | null } | undefined)?.document_hash ?? null;
  return { id: 'first_verified', vendor: d?.vendor ?? null, month: monthOf(dateOf(e))!, quantity: e.activity_data!, unit: e.activity_unit!, kg: e.co2_kg, fingerprint: hash && /^[0-9a-f]{16,}$/i.test(hash) ? hash : null };
}

/** The latest six calendar months of electricity bills, all present. */
export function sixMonths(emissions: ActionEmission[]): Moment | null {
  const months = new Set(emissions.filter((e) => e.scope === 2 && /electric/i.test(e.category)).map((e) => monthOf(dateOf(e))).filter(Boolean) as string[]);
  if (months.size < 6) return null;
  const sortedMonths = [...months].sort();
  const last = sortedMonths[sortedMonths.length - 1]!;
  const run = Array.from({ length: 6 }, (_, i) => addMonths(last, i - 5));
  return run.every((m) => months.has(m)) ? { id: 'six_months', months: run } : null;
}

/** A later bill shows the power factor raised to 0.95 or more from a low one. */
export function pfConfirmed(docs: ActionDocument[]): Moment | null {
  const pfs = docs
    .map((d) => {
      const lines = (d.cached_result as { lineItems?: Array<{ evidence?: { powerFactor?: unknown } }> } | null)?.lineItems;
      const pf = Array.isArray(lines) ? lines.map((l) => Number(l?.evidence?.powerFactor)).find((v) => Number.isFinite(v) && v >= 0.5 && v <= 1) : undefined;
      return pf === undefined ? null : { pf, month: monthOf(d.invoice_date ?? d.created_at) };
    })
    .filter((x): x is { pf: number; month: string } => !!x && !!x.month)
    .sort((a, b) => a.month.localeCompare(b.month));
  const low = pfs.find((p) => p.pf < 0.95);
  const latest = pfs[pfs.length - 1];
  if (!low || !latest || latest.month <= low.month || latest.pf < 0.95 || latest.pf - low.pf < 0.03) return null;
  return { id: 'pf_confirmed', before: low.pf, after: latest.pf, month: latest.month };
}

/** The newest achievement not yet seen, or null. */
export function nextMoment(emissions: ActionEmission[], docs: ActionDocument[], seen: string[]): Moment | null {
  const all = [pfConfirmed(docs), sixMonths(emissions), firstVerified(emissions, docs)];
  return all.find((m): m is Moment => !!m && !seen.includes(m.id)) ?? null;
}
