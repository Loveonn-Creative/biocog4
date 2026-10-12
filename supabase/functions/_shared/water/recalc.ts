// Versioned, append-only recalculation (I7). A changed factor or input never
// overwrites a result: it produces a new version that supersedes the old one,
// after a dry-run diff has been approved. Locked periods need a restatement.
import type { EmissionResultDraft } from './types.ts';

export interface StoredResult extends EmissionResultDraft {
  id: string;
  version: number;
  supersedes_id: string | null;
  is_current: boolean;
}

export type ChangeKind = 'NEW' | 'CHANGED' | 'UNCHANGED' | 'NO_LONGER_PRODUCED';

export interface DiffEntry {
  slot: string;                         // water_bill_key|allocation_period
  kind: ChangeKind;
  locked: boolean;
  before: StoredResult | null;
  after: EmissionResultDraft | null;
  changed_fields: string[];
  /** after - before in kgCO2e; null when either side has no number (never treated as 0). */
  delta_kgco2e: number | null;
}

export interface RecalcPlan { entries: DiffEntry[]; summary: Record<ChangeKind, number>; locked_changes: number }

/** Fields that define a result. calc_run_id and the trace text are lineage, not outcome. */
const OUTCOME_FIELDS = [
  'allocated_volume_m3', 'allocation_method', 'status', 'emissions_kgco2e', 'activity_type', 'factor_id', 'factor_version',
  'factor_value', 'factor_unit', 'gwp_basis', 'factor_tier', 'scope', 'scope3_category', 'mapping_status', 'mapping_rule_id', 'reasons',
] as const;

const slot = (r: Pick<EmissionResultDraft, 'water_bill_key' | 'allocation_period'>) => `${r.water_bill_key}|${r.allocation_period}`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Dry run: compares current results with a fresh run. Writes nothing. */
export function planRecalc(current: StoredResult[], fresh: EmissionResultDraft[], lockedPeriods: string[] = []): RecalcPlan {
  const locked = new Set(lockedPeriods);
  const cur = new Map(current.filter(r => r.is_current).map(r => [slot(r), r]));
  const nxt = new Map(fresh.map(r => [slot(r), r]));
  const entries: DiffEntry[] = [];
  for (const k of [...new Set([...cur.keys(), ...nxt.keys()])].sort()) {
    const before = cur.get(k) ?? null, after = nxt.get(k) ?? null;
    const period = (after ?? before)!.allocation_period;
    const changed_fields = before && after ? OUTCOME_FIELDS.filter(f => !same(before[f], after[f])) : [];
    const kind: ChangeKind = !before ? 'NEW' : !after ? 'NO_LONGER_PRODUCED' : changed_fields.length ? 'CHANGED' : 'UNCHANGED';
    const b = before?.emissions_kgco2e ?? null, a = after?.emissions_kgco2e ?? null;
    entries.push({ slot: k, kind, locked: locked.has(period) && kind !== 'UNCHANGED', before, after, changed_fields,
      delta_kgco2e: a !== null && b !== null ? a - b : null });
  }
  const summary = { NEW: 0, CHANGED: 0, UNCHANGED: 0, NO_LONGER_PRODUCED: 0 };
  for (const e of entries) summary[e.kind]++;
  return { entries, summary, locked_changes: entries.filter(e => e.locked).length };
}

export interface Approval { planned_by: string; approved_by: string; restatement_reason?: string | null }

export interface ApplyOutcome {
  ok: boolean;
  message?: string;
  inserts: StoredResult[];
  superseded_ids: string[];
  skipped_locked: string[];
}

/**
 * Turns an approved plan into new versions. The approver must differ from the
 * planner. Locked-period changes are applied only with a restatement reason;
 * otherwise they are skipped and listed. NO_LONGER_PRODUCED rows are left
 * current and reported: removing a result needs a human decision.
 */
export function applyPlan(plan: RecalcPlan, approval: Approval, newId: () => string): ApplyOutcome {
  const fail = (message: string): ApplyOutcome => ({ ok: false, message, inserts: [], superseded_ids: [], skipped_locked: [] });
  if (!approval.planned_by || !approval.approved_by) return fail('planner and approver are required');
  if (approval.planned_by === approval.approved_by) return fail('the approver must be a different person from the planner');
  const restate = !!approval.restatement_reason?.trim();
  const out: ApplyOutcome = { ok: true, inserts: [], superseded_ids: [], skipped_locked: [] };
  for (const e of plan.entries) {
    if (e.kind !== 'NEW' && e.kind !== 'CHANGED') continue;
    if (e.locked && !restate) { out.skipped_locked.push(e.slot); continue; }
    out.inserts.push({ ...(e.after as EmissionResultDraft), id: newId(), version: (e.before?.version ?? 0) + 1, supersedes_id: e.before?.id ?? null, is_current: true });
    if (e.before) out.superseded_ids.push(e.before.id);
  }
  return out;
}

/** Applies an outcome to an in-memory history (mirror of the DB function), for tests and previews. */
export function applyToHistory(history: StoredResult[], o: ApplyOutcome): StoredResult[] {
  const gone = new Set(o.superseded_ids);
  return [...history.map(r => (gone.has(r.id) ? { ...r, is_current: false } : r)), ...o.inserts];
}
