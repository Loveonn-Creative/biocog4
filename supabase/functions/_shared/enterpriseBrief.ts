// Enterprise Superintelligence: the facts block the model answers from. Built
// only from rows the enterprise can already read (supplier_requests and
// supplier_snapshots), through the same lines the dashboard shows, so an
// answer can never cite a number the dashboard does not have. Pure, so the
// website tests run it.

import { buildLines, overview, type SupplierRequestRow, type SupplierSnapshotRow } from './supplierPilot.ts';

/** Suppliers listed in full; the rest are summed so the brief stays small. */
export const BRIEF_SUPPLIERS = 40;
export const MAX_QUESTION_CHARS = 600;
export const MAX_TURNS = 8;

const t = (kg: number) => (kg / 1000).toFixed(2);

export type Lever = 'electricity' | 'fuel' | 'proof' | 'missing' | null;

/** The plain pattern behind a supplier's emissions, used to suggest where action is likely to pay. */
export function leverFor(l: { status: string; proof: string; kg: number; scope1Kg: number; scope2Kg: number }): Lever {
  if (l.status !== 'shared') return 'missing';
  if (l.proof === 'own_number') return 'proof';
  if (l.kg <= 0) return null;
  if (l.scope2Kg / l.kg >= 0.5) return 'electricity';
  if (l.scope1Kg / l.kg >= 0.5) return 'fuel';
  return null;
}

const LEVER_TEXT: Record<Exclude<Lever, null>, string> = {
  electricity: 'mostly grid electricity: renewable power, rooftop solar or efficiency',
  fuel: 'mostly fuel burned on site: fuel switch or efficiency',
  proof: 'shared its own number without bills: ask for bills',
  missing: 'has not shared yet',
};

export interface BriefInput {
  companyName: string;
  periodLabel: string;
  requests: SupplierRequestRow[];
  snapshots: SupplierSnapshotRow[];
  now?: number;
}

export function buildBrief(b: BriefInput): string {
  const lines = buildLines(b.requests, b.snapshots, b.now);
  const o = overview(lines);
  const latest = new Map<string, SupplierSnapshotRow>();
  for (const s of b.snapshots) {
    const prev = latest.get(s.request_id);
    if (!prev || s.created_at > prev.created_at) latest.set(s.request_id, s);
  }
  const head = [
    `Company: ${b.companyName}. Period: ${b.periodLabel}.`,
    `Suppliers asked: ${o.asked}. Shared: ${o.sharing}. Overdue: ${o.overdue}.`,
    `Supplier emissions shared so far: ${t(o.totalKg)} tCO2e.`,
    o.verifiedPct != null ? `Backed by verified bills: ${o.verifiedPct}%.` : null,
    o.top5Pct != null ? `Top 5 suppliers make up ${o.top5Pct}% of shared emissions.` : null,
    o.purchasesCoveredPct != null ? `Share of purchases covered by suppliers who shared: ${o.purchasesCoveredPct}%.` : null,
  ].filter(Boolean).join('\n');

  const listed = lines.slice(0, BRIEF_SUPPLIERS);
  const rows = listed.map((l, i) => {
    const pct = o.totalKg > 0 && l.status === 'shared' ? Math.round((l.kg / o.totalKg) * 100) : null;
    const snap = latest.get(l.requestId);
    const cats = snap ? Object.entries(snap.by_category ?? {}).sort((a, c) => Number(c[1]) - Number(a[1])).slice(0, 3)
      .map(([k, v]) => `${k} ${t(Number(v))}`).join(', ') : '';
    const lever = leverFor(l);
    return [
      `${i + 1}. ${l.name}`,
      l.buys ? `buys: ${l.buys}` : null,
      l.purchaseSharePct != null ? `purchases: ${l.purchaseSharePct}%` : null,
      `status: ${l.status}`,
      l.status === 'shared' ? `total ${t(l.kg)} t (scope 1 ${t(l.scope1Kg)}, scope 2 ${t(l.scope2Kg)})` : null,
      pct != null ? `${pct}% of shared` : null,
      l.grade ? `grade ${l.grade}` : null,
      cats ? `largest sources: ${cats}` : null,
      lever ? `pattern: ${LEVER_TEXT[lever]}` : null,
    ].filter(Boolean).join('; ');
  });
  const rest = lines.slice(BRIEF_SUPPLIERS);
  if (rest.length) {
    const kg = rest.filter((l) => l.status === 'shared').reduce((s, l) => s + l.kg, 0);
    rows.push(`Plus ${rest.length} smaller suppliers: ${t(kg)} tCO2e shared in total.`);
  }
  return `${head}\n\nSuppliers, largest first:\n${rows.length ? rows.join('\n') : 'None asked yet.'}`;
}

/** Keeps the last few user and assistant turns, trimmed; drops anything else a client sends. */
export function cleanTurns(raw: unknown): Array<{ role: 'user' | 'assistant'; content: string }> | null {
  if (!Array.isArray(raw)) return null;
  const turns = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content).trim().slice(0, MAX_QUESTION_CHARS * 4) }))
    .slice(-MAX_TURNS);
  const last = turns[turns.length - 1];
  if (!last || last.role !== 'user' || last.content.length > MAX_QUESTION_CHARS) return null;
  return turns;
}

/** Whether this question is past the monthly quote, so it is billed. */
export function questionBillable(usedThisMonth: number, included: number): boolean {
  return usedThisMonth >= included;
}

/** Paise per question, from the rate per 1,000 kept in enterprise_rates. */
export const QUESTION_UNIT = 'questions_1000';
