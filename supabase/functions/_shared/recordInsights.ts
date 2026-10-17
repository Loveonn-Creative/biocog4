// Insights from stored emission records, worked out by fixed rules (no AI):
// month-on-month change by category, spikes against the 6-month median,
// missing months and unit-cost jumps. Every insight carries the records it
// read, the fields, the formula, units, assumptions and a quality flag.
// Pure: shared by Dashboard, History and Biocog Intelligence, so the chat
// quotes the same figures the pages show and never calculates changes itself.
//
// Method notes (kept here, not on the page):
// - Records use the same basis every signed-in page reports: verified records
//   when any exist, else unverified estimates (labelled as such).
// - A month is the record's invoice date, else its upload date.
// - The median, not the mean, is the baseline for spikes: one unusual month
//   moves a mean but not a median, so it cannot hide the next spike.
// - Thresholds (30% spike, 20% unit cost) are screening choices, shown with
//   each insight as an assumption; they are not regulatory limits.
// - A month with no upload is missing data, never zero emissions.

export const SPIKE_ABOVE_MEDIAN = 0.3;     // more than 30% above the median
export const SPIKE_MIN_PRIOR_MONTHS = 3;   // of the 6 months before
export const MEDIAN_WINDOW_MONTHS = 6;
export const UNIT_COST_JUMP = 0.2;         // unit cost moved more than 20%
export const MISSING_MIN_MONTHS = 3;       // a category seen in at least 3 months

export interface InsightRow {
  id: string;
  scope: number | null;
  category: string | null;
  co2_kg: number | string | null;
  verified: boolean | null;
  activity_data?: number | string | null;
  activity_unit?: string | null;
  document_id?: string | null;
  /** Invoice date when valid, else upload date (YYYY-MM-DD or ISO). */
  date: string;
  data_quality?: string | null;
  verification_notes?: string | null;
}

export interface InsightDocument { id: string; amount?: number | string | null; currency?: string | null }

export type QualityLevel = 'good' | 'check' | 'weak';
export interface Quality { level: QualityLevel; reasons: string[] }

export type InsightKind = 'mom' | 'spike' | 'missing' | 'unit_cost';

export interface Insight {
  id: string;
  kind: InsightKind;
  category: string;
  scope: number;
  /** One plain sentence with the figures. */
  title: string;
  recordIds: string[];
  fields: string[];
  formula: string;
  units: string;
  assumptions: string[];
  quality: Quality;
  values: Record<string, number | string | null>;
}

export interface MonthOnMonth {
  category: string;
  scope: number;
  month: string;
  previousMonth: string;
  kg: number;
  previousKg: number | null;
  changeKg: number | null;
  /** Null when the previous month has no records (no change can be worked out). */
  changePct: number | null;
  records: number;
  previousRecords: number;
  recordIds: string[];
  quality: Quality;
}

export interface RecordInsights {
  basis: 'verified' | 'unverified' | 'none';
  latestMonth: string | null;
  monthOnMonth: MonthOnMonth[];
  insights: Insight[];
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v ?? NaN);
  return Number.isFinite(n) ? n : NaN;
};
const kgOf = (r: InsightRow) => { const n = num(r.co2_kg); return Number.isFinite(n) && n > 0 ? n : 0; };
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
const monthOf = (d: string) => String(d).slice(0, 7);
const shift = (m: string, by: number) => {
  const [y, mo] = m.split('-').map(Number);
  const t = new Date(Date.UTC(y, mo - 1 + by, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
};
const label = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};
export const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const keyOf = (r: InsightRow) => `${r.scope === 1 || r.scope === 2 ? r.scope : 3}|${(r.category || 'other').toLowerCase()}`;
const pretty = (c: string) => { const s = c.replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };

function estimated(r: InsightRow): boolean {
  try {
    const b = (JSON.parse(r.verification_notes || 'null') as { basis?: unknown } | null)?.basis;
    return typeof b === 'string' && b !== 'read_from_bill';
  } catch { return false; }
}

function qualityOf(rows: InsightRow[], ctx: { basis: RecordInsights['basis']; complete: boolean; partialMonth: boolean }, extra: string[] = []): Quality {
  const reasons: string[] = [];
  if (ctx.basis === 'unverified') reasons.push('Unverified estimates');
  if (!ctx.complete) reasons.push('Only the most recent records were read');
  if (ctx.partialMonth) reasons.push('The latest month is not over yet');
  if (rows.some((r) => r.data_quality === 'low' || r.data_quality === 'medium')) reasons.push('Some records have medium or low data quality');
  if (rows.some(estimated)) reasons.push('Some quantities are estimated, handwritten or from meter readings');
  reasons.push(...extra);
  const level: QualityLevel = reasons.length === 0 ? 'good' : !ctx.complete || reasons.length >= 3 ? 'weak' : 'check';
  return { level, reasons };
}

/** The rows every page reports: verified when any exist, else unverified estimates. */
export function basisRows(rows: InsightRow[]): { basis: RecordInsights['basis']; rows: InsightRow[] } {
  const seen = new Map<string, InsightRow>();
  for (const r of rows) seen.set(r.id, r);
  const all = [...seen.values()];
  const verified = all.filter((r) => r.verified === true);
  if (verified.length) return { basis: 'verified', rows: verified };
  return all.length ? { basis: 'unverified', rows: all } : { basis: 'none', rows: [] };
}

type Groups = Map<string, Map<string, InsightRow[]>>; // category key -> month -> rows
function group(rows: InsightRow[]): Groups {
  const g: Groups = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    const m = monthOf(r.date);
    if (!/^\d{4}-\d{2}$/.test(m)) continue;
    const byMonth = g.get(k) ?? new Map<string, InsightRow[]>();
    byMonth.set(m, [...(byMonth.get(m) ?? []), r]);
    g.set(k, byMonth);
  }
  return g;
}
const sum = (rows: InsightRow[] | undefined) => (rows ?? []).reduce((n, r) => n + kgOf(r), 0);

/**
 * Month-on-month change by category: the latest month with records against
 * the calendar month before it. change % = (this − previous) ÷ previous × 100.
 */
export function monthOnMonth(rows: InsightRow[], opts: { now?: Date; complete?: boolean } = {}): { basis: RecordInsights['basis']; latestMonth: string | null; rows: MonthOnMonth[] } {
  const { basis, rows: base } = basisRows(rows);
  const months = base.map((r) => monthOf(r.date)).filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
  const latest = months[months.length - 1] ?? null;
  if (!latest) return { basis, latestMonth: null, rows: [] };
  const prev = shift(latest, -1);
  const now = opts.now ?? new Date();
  const partialMonth = latest === `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const out: MonthOnMonth[] = [];
  for (const [k, byMonth] of group(base)) {
    const cur = byMonth.get(latest);
    const before = byMonth.get(prev);
    if (!cur && !before) continue;
    const [scope, category] = k.split('|');
    const kg = sum(cur);
    const previousKg = before ? sum(before) : null;
    const changeKg = previousKg !== null ? round(kg - previousKg) : null;
    const changePct = previousKg !== null && previousKg > 0 ? round(((kg - previousKg) / previousKg) * 100, 1) : null;
    const used = [...(cur ?? []), ...(before ?? [])];
    out.push({
      category, scope: Number(scope), month: latest, previousMonth: prev,
      kg: round(kg), previousKg: previousKg !== null ? round(previousKg) : null, changeKg, changePct,
      records: cur?.length ?? 0, previousRecords: before?.length ?? 0,
      recordIds: used.map((r) => r.id).slice(0, 20),
      quality: qualityOf(used, { basis, complete: opts.complete !== false, partialMonth }, before ? [] : ['No records in the previous month']),
    });
  }
  out.sort((a, b) => b.kg - a.kg);
  return { basis, latestMonth: latest, rows: out };
}

/** All insights, worked out on request. Nothing is stored or changed. */
export function recordInsights(rows: InsightRow[], docs: InsightDocument[] = [], opts: { now?: Date; complete?: boolean } = {}): RecordInsights {
  const complete = opts.complete !== false;
  const mom = monthOnMonth(rows, opts);
  const { basis, latestMonth } = mom;
  if (!latestMonth) return { basis, latestMonth: null, monthOnMonth: [], insights: [] };
  const base = basisRows(rows).rows;
  const groups = group(base);
  const ctx = { basis, complete, partialMonth: false };
  const insights: Insight[] = [];
  const basisWord = basis === 'verified' ? 'verified records' : 'unverified estimates';

  // 1. Month-on-month change.
  for (const m of mom.rows) {
    const name = pretty(m.category);
    const title = m.changePct !== null
      ? `${name}: ${m.kg.toLocaleString('en-IN')} kg in ${label(m.month)}, ${m.changePct > 0 ? 'up' : m.changePct < 0 ? 'down' : 'no change'}${m.changePct ? ` ${Math.abs(m.changePct)}%` : ''} on ${label(m.previousMonth)} (${m.previousKg!.toLocaleString('en-IN')} kg).`
      : m.previousKg === 0
        ? `${name}: ${m.kg.toLocaleString('en-IN')} kg in ${label(m.month)}; ${label(m.previousMonth)} recorded 0 kg, so no percentage is given.`
        : `${name}: ${m.kg.toLocaleString('en-IN')} kg in ${label(m.month)}; no records in ${label(m.previousMonth)}, so no change is worked out.`;
    insights.push({
      id: `mom|${m.scope}|${m.category}`, kind: 'mom', category: m.category, scope: m.scope, title,
      recordIds: m.recordIds,
      fields: ['co2_kg', 'invoice date (else upload date)', 'category', 'scope'],
      formula: 'change % = (this month kg − previous month kg) ÷ previous month kg × 100',
      units: 'kg CO2e',
      assumptions: [`Uses ${basisWord}`, 'Month is the invoice date, else the upload date', 'A month with no upload is missing, not zero'],
      quality: m.quality,
      values: { month: m.month, previousMonth: m.previousMonth, kg: m.kg, previousKg: m.previousKg, changeKg: m.changeKg, changePct: m.changePct },
    });
  }

  for (const [k, byMonth] of groups) {
    const [scopeStr, category] = k.split('|');
    const scope = Number(scopeStr);
    const name = pretty(category);
    const months = [...byMonth.keys()].sort();
    const oldestShown = shift(latestMonth, -11);

    // 2. Spikes against the median of the 6 months before.
    const spikes: Insight[] = [];
    for (const m of months) {
      if (m < oldestShown) continue;
      const window = Array.from({ length: MEDIAN_WINDOW_MONTHS }, (_, i) => shift(m, -(i + 1))).filter((w) => byMonth.has(w));
      if (window.length < SPIKE_MIN_PRIOR_MONTHS) continue;
      const med = median(window.map((w) => sum(byMonth.get(w))));
      const kg = sum(byMonth.get(m));
      if (!(med > 0) || kg <= med * (1 + SPIKE_ABOVE_MEDIAN) || kg - med < 1) continue;
      const pct = round(((kg - med) / med) * 100, 1);
      const used = [...(byMonth.get(m) ?? []), ...window.flatMap((w) => byMonth.get(w) ?? [])];
      spikes.push({
        id: `spike|${k}|${m}`, kind: 'spike', category, scope,
        title: `${name}: ${round(kg).toLocaleString('en-IN')} kg in ${label(m)}, ${pct}% above the median of ${window.length} earlier months (${round(med).toLocaleString('en-IN')} kg).`,
        recordIds: used.map((r) => r.id).slice(0, 20),
        fields: ['co2_kg', 'invoice date (else upload date)', 'category'],
        formula: `spike when month kg > median(kg of up to ${MEDIAN_WINDOW_MONTHS} months before, at least ${SPIKE_MIN_PRIOR_MONTHS} with records) × ${1 + SPIKE_ABOVE_MEDIAN}`,
        units: 'kg CO2e',
        assumptions: [`Uses ${basisWord}`, 'Months with no upload are left out of the median', `Threshold: more than ${SPIKE_ABOVE_MEDIAN * 100}% above the median`],
        quality: qualityOf(used, ctx, window.length < MEDIAN_WINDOW_MONTHS ? [`Median from ${window.length} of ${MEDIAN_WINDOW_MONTHS} months`] : []),
        values: { month: m, kg: round(kg), medianKg: round(med), abovePct: pct, monthsInMedian: window.length },
      });
    }
    insights.push(...spikes.reverse().slice(0, 3));

    // 3. Missing months for a category that recurs.
    if (months.length >= MISSING_MIN_MONTHS) {
      const start = months[0] > oldestShown ? months[0] : oldestShown;
      const missing: string[] = [];
      for (let m = start; m <= latestMonth; m = shift(m, 1)) if (!byMonth.has(m)) missing.push(m);
      if (missing.length) {
        const used = months.filter((m) => m >= start).flatMap((m) => byMonth.get(m) ?? []);
        insights.push({
          id: `missing|${k}`, kind: 'missing', category, scope,
          title: `${name}: no records for ${missing.map(label).join(', ')}, between ${label(start)} and ${label(latestMonth)}.`,
          recordIds: used.map((r) => r.id).slice(0, 20),
          fields: ['invoice date (else upload date)', 'category'],
          formula: `months from the first record (last 12 months at most) to ${label(latestMonth)} with no record in this category`,
          units: 'months',
          assumptions: [`Category recorded in at least ${MISSING_MIN_MONTHS} months`, 'A missing month may be a bill not uploaded yet, not zero use'],
          quality: qualityOf(used, ctx),
          values: { missingMonths: missing.join(','), from: start, to: latestMonth },
        });
      }
    }
  }

  // 4. Unit-cost jumps: invoices with one counted record, amount ÷ quantity.
  const docAmount = new Map(docs.map((d) => [d.id, { amount: num(d.amount), currency: (d.currency || 'INR').toUpperCase() }]));
  const perDoc = new Map<string, InsightRow[]>();
  for (const r of base) if (r.document_id) perDoc.set(r.document_id, [...(perDoc.get(r.document_id) ?? []), r]);
  const costs = new Map<string, Map<string, Array<{ cost: number; row: InsightRow }>>>(); // key|unit -> month -> costs
  for (const [docId, rs] of perDoc) {
    if (rs.length !== 1) continue;
    const r = rs[0];
    const d = docAmount.get(docId);
    const qty = num(r.activity_data);
    const unit = (r.activity_unit || '').trim();
    if (!d || !(d.amount > 0) || d.currency !== 'INR' || !(qty > 0) || !unit) continue;
    const key = `${keyOf(r)}|${unit}`;
    const byMonth = costs.get(key) ?? new Map();
    const m = monthOf(r.date);
    byMonth.set(m, [...(byMonth.get(m) ?? []), { cost: d.amount / qty, row: r }]);
    costs.set(key, byMonth);
  }
  for (const [key, byMonth] of costs) {
    const [scopeStr, category, unit] = key.split('|');
    const months = [...byMonth.keys()].sort();
    for (let i = months.length - 1; i > 0; i--) {
      const m = months[i], p = months[i - 1];
      if (m < shift(latestMonth, -11)) break;
      const cur = median(byMonth.get(m)!.map((c) => c.cost));
      const prev = median(byMonth.get(p)!.map((c) => c.cost));
      const change = (cur - prev) / prev;
      if (Math.abs(change) <= UNIT_COST_JUMP) continue;
      const used = [...byMonth.get(m)!, ...byMonth.get(p)!].map((c) => c.row);
      const pct = round(change * 100, 1);
      insights.push({
        id: `unit_cost|${key}|${m}`, kind: 'unit_cost', category, scope: Number(scopeStr),
        title: `${pretty(category)}: about ₹${round(cur).toLocaleString('en-IN')} per ${unit} in ${label(m)}, ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% from ₹${round(prev).toLocaleString('en-IN')} in ${label(p)}.`,
        recordIds: used.map((r) => r.id).slice(0, 20),
        fields: ['invoice amount', 'activity_data', 'activity_unit', 'invoice date (else upload date)'],
        formula: 'unit cost = invoice amount ÷ quantity (median per month); change % = (this − previous) ÷ previous × 100',
        units: `₹ per ${unit}`,
        assumptions: ['Only invoices with one counted record', 'Invoice amount includes tax and other charges', `Threshold: more than ${UNIT_COST_JUMP * 100}% change`, p !== shift(m, -1) ? `Compared with ${label(p)}, the previous month with a price` : 'Compared with the month before'],
        quality: qualityOf(used, ctx, ['Unit cost is indicative: the amount covers the whole invoice']),
        values: { month: m, previousMonth: p, unitCost: round(cur), previousUnitCost: round(prev), changePct: pct, unit },
      });
      break; // latest jump per category and unit
    }
  }

  return { basis, latestMonth, monthOnMonth: mom.rows, insights };
}
