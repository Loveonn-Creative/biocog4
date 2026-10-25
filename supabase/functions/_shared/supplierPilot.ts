// Enterprise supplier dashboard: everything it shows is computed here from
// the rows the database lets an enterprise read (supplier_requests and
// supplier_snapshots), so the numbers are testable and never invented. Shared
// with the enterprise-intelligence function, which answers from the same lines.

export interface SupplierRequestRow {
  id: string;
  supplier_name: string;
  supplier_email: string | null;
  supplier_gstin: string | null;
  buys: string | null;
  purchase_share_pct: number | null;
  scope3_category: number;
  period_start: string;
  period_end: string;
  status: 'sent' | 'opened' | 'shared' | 'declined' | 'revoked';
  created_at: string;
  expires_at: string;
  shared_at: string | null;
  last_reminded_at: string | null;
}

export interface SupplierSnapshotRow {
  id: string;
  request_id: string;
  supplier_name: string;
  supplier_gstin: string | null;
  period_start: string;
  period_end: string;
  scope1_kg: number;
  scope2_kg: number;
  scope3_kg: number;
  total_kg: number;
  verified_kg: number;
  declared_kg: number | null;
  by_category: Record<string, number>;
  activity: Record<string, number>;
  documents_total: number;
  documents_verified: number;
  snapshot_hash: string;
  created_at: string;
}

export type Proof = 'bills' | 'own_number' | 'none';
export type Status = 'shared' | 'opened' | 'waiting' | 'overdue' | 'declined';

export interface SupplierLine {
  requestId: string;
  name: string;
  gstin: string | null;
  buys: string | null;
  category: number;
  purchaseSharePct: number | null;
  status: Status;
  proof: Proof;
  /** Emissions counted for this supplier: bill-based total, or the supplier's own number when there are no bills. */
  kg: number;
  scope1Kg: number;
  scope2Kg: number;
  verifiedKg: number;
  grade: 'A' | 'B' | 'C' | 'D' | null;
  canRemind: boolean;
  snapshotHash: string | null;
}

/** Days after sending before an unshared request counts as overdue. */
export const OVERDUE_DAYS = 14;
const DAY = 86_400_000;

/** Indian financial years (April to March) for the period picker, newest first. */
export function financialYears(now = new Date(), count = 3): Array<{ label: string; start: string; end: string }> {
  const y = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return Array.from({ length: count }, (_, i) => {
    const s = y - i;
    return { label: `FY ${s}-${String((s + 1) % 100).padStart(2, '0')}`, start: `${s}-04-01`, end: `${s + 1}-03-31` };
  });
}

function statusOf(r: SupplierRequestRow, now: number): Status {
  if (r.status === 'shared') return 'shared';
  if (r.status === 'declined') return 'declined';
  const late = now > Date.parse(r.expires_at) || now - Date.parse(r.created_at) > OVERDUE_DAYS * DAY;
  if (late) return 'overdue';
  return r.status === 'opened' ? 'opened' : 'waiting';
}

/** Same bands as the verification grade: share of the counted emissions backed by verified bills. */
export function gradeFor(verifiedKg: number, kg: number): SupplierLine['grade'] {
  if (kg <= 0) return null;
  const s = verifiedKg / kg;
  return s >= 0.9 ? 'A' : s >= 0.75 ? 'B' : s >= 0.5 ? 'C' : 'D';
}

export function buildLines(requests: SupplierRequestRow[], snapshots: SupplierSnapshotRow[], now = Date.now()): SupplierLine[] {
  const latest = new Map<string, SupplierSnapshotRow>();
  for (const s of snapshots) {
    const prev = latest.get(s.request_id);
    if (!prev || s.created_at > prev.created_at) latest.set(s.request_id, s);
  }
  return requests
    .filter((r) => r.status !== 'revoked')
    .map((r) => {
      const snap = latest.get(r.id) ?? null;
      const billKg = snap ? Number(snap.total_kg) : 0;
      const declared = snap?.declared_kg != null ? Number(snap.declared_kg) : null;
      const kg = billKg > 0 ? billKg : declared ?? 0;
      const proof: Proof = !snap ? 'none' : billKg > 0 ? 'bills' : declared != null ? 'own_number' : 'none';
      const status = statusOf(r, now);
      const remindedRecently = r.last_reminded_at ? now - Date.parse(r.last_reminded_at) < 3 * DAY : false;
      return {
        requestId: r.id,
        name: r.supplier_name,
        gstin: r.supplier_gstin,
        buys: r.buys,
        category: r.scope3_category,
        purchaseSharePct: r.purchase_share_pct != null ? Number(r.purchase_share_pct) : null,
        status,
        proof,
        kg,
        scope1Kg: snap ? Number(snap.scope1_kg) : 0,
        scope2Kg: snap ? Number(snap.scope2_kg) : 0,
        verifiedKg: snap ? Number(snap.verified_kg) : 0,
        grade: proof === 'bills' ? gradeFor(Number(snap!.verified_kg), billKg) : proof === 'own_number' ? 'D' : null,
        canRemind: (status === 'waiting' || status === 'opened' || status === 'overdue') && !!r.supplier_email && !remindedRecently,
        snapshotHash: snap?.snapshot_hash ?? null,
      };
    })
    .sort((a, b) => b.kg - a.kg || (b.purchaseSharePct ?? 0) - (a.purchaseSharePct ?? 0) || a.name.localeCompare(b.name));
}

export interface Overview {
  totalKg: number;
  sharing: number;
  asked: number;
  overdue: number;
  /** Share of purchases covered by suppliers who shared, when the enterprise entered purchase shares. */
  purchasesCoveredPct: number | null;
  /** Share of counted emissions backed by verified bills. */
  verifiedPct: number | null;
  top5Pct: number | null;
}

export function overview(lines: SupplierLine[]): Overview {
  const shared = lines.filter((l) => l.status === 'shared' && l.kg > 0);
  const totalKg = shared.reduce((s, l) => s + l.kg, 0);
  const withShare = lines.filter((l) => l.purchaseSharePct != null);
  const covered = shared.filter((l) => l.purchaseSharePct != null).reduce((s, l) => s + (l.purchaseSharePct ?? 0), 0);
  const top5 = [...shared].sort((a, b) => b.kg - a.kg).slice(0, 5).reduce((s, l) => s + l.kg, 0);
  return {
    totalKg,
    sharing: lines.filter((l) => l.status === 'shared').length,
    asked: lines.length,
    overdue: lines.filter((l) => l.status === 'overdue').length,
    purchasesCoveredPct: withShare.length ? Math.min(100, Math.round(covered * 10) / 10) : null,
    verifiedPct: totalKg > 0 ? Math.round((shared.reduce((s, l) => s + Math.min(l.verifiedKg, l.kg), 0) / totalKg) * 100) : null,
    top5Pct: totalKg > 0 && shared.length > 5 ? Math.round((top5 / totalKg) * 100) : null,
  };
}

export type NextAction =
  | { kind: 'remind'; count: number; requestIds: string[] }
  | { kind: 'ask_bills'; count: number; names: string[] }
  | { kind: 'big_missing'; count: number; purchasePct: number; names: string[]; overdueIds: string[] };

/** At most three actions, most useful first. */
export function nextActions(lines: SupplierLine[]): NextAction[] {
  const out: NextAction[] = [];
  // Missing suppliers that matter most by purchase share.
  const bigMissing = lines.filter((l) => l.status !== 'shared' && (l.purchaseSharePct ?? 0) >= 2)
    .sort((a, b) => (b.purchaseSharePct ?? 0) - (a.purchaseSharePct ?? 0));
  const overdueIds = lines.filter((l) => l.canRemind && l.status === 'overdue').map((l) => l.requestId);
  // One line for missing suppliers; its reminder covers every overdue one, so nobody is counted twice.
  if (bigMissing.length) {
    const purchasePct = Math.round(bigMissing.reduce((a, l) => a + (l.purchaseSharePct ?? 0), 0));
    out.push({ kind: 'big_missing', count: bigMissing.length, purchasePct, names: bigMissing.slice(0, 3).map((l) => l.name), overdueIds });
  } else if (overdueIds.length) out.push({ kind: 'remind', count: overdueIds.length, requestIds: overdueIds });
  const top = lines.filter((l) => l.status === 'shared').slice(0, 10);
  const ownNumbers = top.filter((l) => l.proof === 'own_number');
  if (ownNumbers.length) out.push({ kind: 'ask_bills', count: ownNumbers.length, names: ownNumbers.slice(0, 3).map((l) => l.name) });
  return out.slice(0, 3);
}

export const tonnes = (kg: number, digits = 1) => (kg / 1000).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Rows for the supplier CSV (BRSR value-chain workpaper and auditor sample). */
export function supplierCsv(lines: SupplierLine[], period: { start: string; end: string }): string {
  const head = ['Supplier', 'GSTIN', 'What you buy', 'Scope 3 category', 'Share of purchases %', 'Status', 'Proof', 'Scope 1 tCO2e', 'Scope 2 tCO2e', 'Counted tCO2e', 'Backed by verified bills tCO2e', 'Grade', 'Period', 'Snapshot SHA-256'];
  const q = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = lines.map((l) => [
    l.name, l.gstin, l.buys, l.category, l.purchaseSharePct, l.status, l.proof.replace('_', ' '),
    (l.scope1Kg / 1000).toFixed(3), (l.scope2Kg / 1000).toFixed(3), (l.kg / 1000).toFixed(3), (Math.min(l.verifiedKg, l.kg) / 1000).toFixed(3),
    l.grade, `${period.start} to ${period.end}`, l.snapshotHash,
  ]);
  return [head, ...rows].map((r) => r.map(q).join(',')).join('\n');
}
