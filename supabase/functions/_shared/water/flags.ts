import { SEVERITY } from './types.ts';
import type { FlagStatus, ReasonCode, Severity } from './types.ts';

export type OwnerRole = 'PREPARER' | 'REVIEWER' | 'APPROVER' | 'FACTOR_STEWARD';

/** Who fixes each gap and how fast (calendar days). Configuration, not methodology. */
export const FLAG_POLICY: Record<ReasonCode, { owner: OwnerRole; sla_days: number }> = {
  NO_FACTOR: { owner: 'FACTOR_STEWARD', sla_days: 10 },
  AMBIGUOUS_FACTOR: { owner: 'FACTOR_STEWARD', sla_days: 5 },
  GWP_BASIS_MISMATCH: { owner: 'FACTOR_STEWARD', sla_days: 10 },
  PROXY_FACTOR_USED: { owner: 'FACTOR_STEWARD', sla_days: 30 },
  MAPPING_PENDING: { owner: 'REVIEWER', sla_days: 5 },
  COMBINED_UNSPLIT: { owner: 'PREPARER', sla_days: 10 },
  UNKNOWN_UNIT: { owner: 'PREPARER', sla_days: 5 },
  MISSING_FIELD: { owner: 'PREPARER', sla_days: 5 },
  NEGATIVE_VOLUME_UNMATCHED: { owner: 'PREPARER', sla_days: 5 },
  UTILITY_ESTIMATED_READING: { owner: 'PREPARER', sla_days: 30 },
  PERIOD_SPANS_YEARS: { owner: 'REVIEWER', sla_days: 30 },
};

export interface GapFlag {
  key: string;                 // `${bill_key}|${period}|${reason}`, stable across re-runs
  water_bill_key: string;
  allocation_period: string | null;
  reason_code: ReasonCode;
  severity: Severity;
  owner_role: OwnerRole;
  due_date: string;            // YYYY-MM-DD
  status: FlagStatus;
  detail: string;
  resolution_note?: string | null;
  actor?: string | null;
  approver?: string | null;
}

const addDays = (isoDate: string, n: number) => new Date(Date.parse(isoDate.slice(0, 10) + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10);

export function raiseFlag(bill: string, period: string | null, reason: ReasonCode, detail: string, today: string): GapFlag {
  const p = FLAG_POLICY[reason];
  return {
    key: `${bill}|${period ?? '-'}|${reason}`, water_bill_key: bill, allocation_period: period,
    reason_code: reason, severity: SEVERITY[reason], owner_role: p.owner, due_date: addDays(today, p.sla_days),
    status: 'OPEN', detail,
  };
}

const NEXT: Record<FlagStatus, FlagStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK'],
  IN_PROGRESS: ['OPEN', 'RESOLVED', 'ACCEPTED_RISK'],
  RESOLVED: [],
  ACCEPTED_RISK: [],
};

export interface Transition { to: FlagStatus; actor: string; note?: string | null; approver?: string | null }

/**
 * OPEN -> IN_PROGRESS -> RESOLVED | ACCEPTED_RISK. Terminal states do not
 * reopen; a new run raises a fresh flag instead. ACCEPTED_RISK needs a written
 * reason and an approver who is not the person asking (segregation of duties).
 */
export function transition(f: GapFlag, t: Transition): { ok: boolean; flag?: GapFlag; message?: string } {
  if (!NEXT[f.status].includes(t.to)) return { ok: false, message: `cannot move ${f.status} to ${t.to}` };
  if (!t.actor) return { ok: false, message: 'actor required' };
  if (t.to === 'ACCEPTED_RISK') {
    if (!t.note || !t.note.trim()) return { ok: false, message: 'a reason is required to accept a risk' };
    if (!t.approver) return { ok: false, message: 'an approver is required to accept a risk' };
    if (t.approver === t.actor) return { ok: false, message: 'the approver must be a different person' };
  }
  if (t.to === 'RESOLVED' && (!t.note || !t.note.trim())) return { ok: false, message: 'a resolution note is required' };
  return { ok: true, flag: { ...f, status: t.to, resolution_note: t.note ?? null, actor: t.actor, approver: t.approver ?? null } };
}

/**
 * When a superseding result arrives, open flags whose reason no longer
 * applies are resolved automatically; flags still applicable stay as they are;
 * new reasons are raised. Terminal flags are never touched. A reason that
 * was resolved and comes back is raised again; an accepted risk is not.
 */
export function reconcileFlags(existing: GapFlag[], fresh: GapFlag[], runId: string): GapFlag[] {
  const freshKeys = new Set(fresh.map(f => f.key));
  const out: GapFlag[] = existing.map(f =>
    (f.status === 'OPEN' || f.status === 'IN_PROGRESS') && !freshKeys.has(f.key)
      ? { ...f, status: 'RESOLVED' as const, resolution_note: `auto-resolved by superseding run ${runId}`, actor: 'system' }
      : f);
  const live = new Set(existing.filter(f => f.status !== 'RESOLVED').map(f => f.key));
  for (const f of fresh) if (!live.has(f.key)) out.push(f);
  return out;
}
