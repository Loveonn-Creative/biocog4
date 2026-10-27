// Biocog Intelligence: who gets what, how much, and the facts an answer may
// use. Pure (no Deno or network imports), so the website tests run it too.
//
// Tiers (owner decisions, October 2026):
//  - Guests and Snapshot (free forever): platform questions and general
//    guidance, with clearly labelled sample data. No analysis of records.
//  - Essential: the same, plus Savings Insights computed from their own
//    verified records (no model involved in the figures).
//  - Pro and Scale: analysis of their own records with figures, record IDs,
//    the calculation behind each total, uncertainty labels and a trend
//    projection; real-time voice within a monthly cap.
//  - Enterprise is a custom agreement, scoped and priced separately; nothing
//    here grants or limits it.
// Limits are enforced by the edge functions through public.intelligence_take.

import type { PlanTier } from './planLimits.ts';

export type Audience = 'guest' | PlanTier;

/**
 * Questions per calendar month (India time), a pool used at any pace (owner
 * decision, October 2026: free stays at 20). Guests are counted per network
 * address per month. Scale is the default before a quote sets its own.
 */
export const MONTHLY_MESSAGES: Record<Audience, number> = { guest: 10, snapshot: 20, essential: 300, pro: 2000, scale: 5000 };

/**
 * Real-time voice: sessions per calendar month (India time). Each session is
 * capped at VOICE_SESSION_MAX_MINUTES by the ElevenLabs agent setting
 * "maximum conversation duration", which must be set to the same value; the
 * monthly minutes below are therefore sessions x that cap.
 */
export const VOICE_SESSION_MAX_MINUTES = 5;
export const VOICE_MINUTES_PER_MONTH: Record<Audience, number> = { guest: 0, snapshot: 0, essential: 0, pro: 100, scale: 300 };
export const voiceSessionsPerMonth = (a: Audience): number => Math.floor(VOICE_MINUTES_PER_MONTH[a] / VOICE_SESSION_MAX_MINUTES);

export interface Access {
  /** The model may read this user's own records. */
  ownRecords: boolean;
  /** Savings Insights panel from the user's own verified records. */
  savingsInsights: boolean;
  /** Trend projection from the user's own monthly totals. */
  projection: boolean;
  /** Real-time voice sessions. */
  voice: boolean;
}

export function accessFor(a: Audience): Access {
  const pro = a === 'pro' || a === 'scale';
  return { ownRecords: pro, savingsInsights: pro || a === 'essential', projection: pro, voice: pro };
}

// ---------------------------------------------------------------- dates (IST)

const IST_OFFSET_MS = 330 * 60 * 1000;
const istDate = (now: Date) => new Date(now.getTime() + IST_OFFSET_MS);

/** The calendar day in India, YYYY-MM-DD. */
export function dayIst(now = new Date()): string {
  return istDate(now).toISOString().slice(0, 10);
}
/** First day of the month in India, YYYY-MM-DD. */
export function monthStartDayIst(now = new Date()): string {
  return `${dayIst(now).slice(0, 7)}-01`;
}
/** When the monthly pool resets: midnight India time on the 1st of next month, as an ISO instant. */
export function nextMonthlyResetIso(now = new Date()): string {
  const d = istDate(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - IST_OFFSET_MS).toISOString();
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** The current pool's month and the day it resets, in India time: { month: 'October', resets: '1 November' }. */
export function monthLabelsIst(now = new Date()): { month: string; resets: string } {
  const m = istDate(now).getUTCMonth();
  return { month: MONTH_NAMES[m], resets: `1 ${MONTH_NAMES[(m + 1) % 12]}` };
}
/** The limit-state sentence: "You've used 20 of 20 in October. Resets 1 November." */
export function limitSentence(used: number, limit: number, now = new Date()): string {
  const { month, resets } = monthLabelsIst(now);
  return `You've used ${Math.min(used, limit).toLocaleString('en-IN')} of ${limit.toLocaleString('en-IN')} in ${month}. Resets ${resets}.`;
}

/** The next midnight in India, as an ISO instant. */
export function nextDailyResetIso(now = new Date()): string {
  const d = istDate(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - IST_OFFSET_MS;
  return new Date(next).toISOString();
}

// ---------------------------------------------------------------- records brief

export interface EmissionRow {
  id: string;
  scope: number | null;
  category: string | null;
  co2_kg: number | string | null;
  verified: boolean | null;
  activity_data?: number | string | null;
  activity_unit?: string | null;
  document_id?: string | null;
  data_quality?: string | null;
  created_at: string;
  /** documents.invoice_date when joined. */
  invoice_date?: string | null;
}

export interface DocumentRow {
  id: string;
  amount?: number | string | null;
  currency?: string | null;
}

export interface Hotspot {
  category: string;
  scope: number;
  kg: number;
  /** Share of the basis total, 0..1. */
  share: number;
  records: number;
  /** Up to five record IDs, for the source links. */
  recordIds: string[];
  /** Activity total when every record in the category uses one unit. */
  activity: { quantity: number; unit: string } | null;
}

export interface MonthTotal { month: string; kg: number; records: number }

export interface RecordBrief {
  /** 'verified' when any record is verified (the figures every signed-in page reports); else 'unverified' estimates. */
  basis: 'verified' | 'unverified' | 'none';
  verified: { records: number; kg: number; byScope: Record<1 | 2 | 3, number> };
  unverified: { records: number; kg: number };
  hotspots: Hotspot[];
  monthly: MonthTotal[];
  /** False when the record set was cut at the read limit. */
  complete: boolean;
  /** The calculation behind the headline total, in words. */
  calculation: string;
  /** The basis rows at a glance, for the page's context card. */
  summary: {
    kg: number;
    records: number;
    /** Distinct invoices behind the basis rows. */
    documents: number;
    firstMonth: string | null;
    lastMonth: string | null;
    /** The scope with the largest share of the basis total. */
    topScope: { scope: 1 | 2 | 3; share: number } | null;
  };
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/** The date a record belongs to: its invoice date, else its upload date (as every page does). */
export function recordMonth(r: EmissionRow): string {
  const d = r.invoice_date && /^\d{4}-\d{2}/.test(r.invoice_date) ? r.invoice_date : r.created_at;
  return String(d).slice(0, 7);
}

export function buildBrief(rows: EmissionRow[], opts: { complete: boolean }): RecordBrief {
  const verifiedRows = rows.filter((r) => r.verified === true);
  const unverifiedRows = rows.filter((r) => r.verified !== true);
  const basisRows = verifiedRows.length ? verifiedRows : unverifiedRows;
  const basis: RecordBrief['basis'] = verifiedRows.length ? 'verified' : unverifiedRows.length ? 'unverified' : 'none';

  const byScope: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  for (const r of verifiedRows) {
    const s = r.scope === 1 || r.scope === 2 || r.scope === 3 ? r.scope : null;
    if (s) byScope[s] += num(r.co2_kg);
  }
  const verifiedKg = verifiedRows.reduce((n, r) => n + num(r.co2_kg), 0);
  const unverifiedKg = unverifiedRows.reduce((n, r) => n + num(r.co2_kg), 0);
  const basisKg = basis === 'verified' ? verifiedKg : unverifiedKg;

  const groups = new Map<string, EmissionRow[]>();
  for (const r of basisRows) {
    const key = `${r.scope ?? 3}|${(r.category || 'other').toLowerCase()}`;
    const g = groups.get(key);
    if (g) g.push(r); else groups.set(key, [r]);
  }
  const hotspots: Hotspot[] = [...groups.entries()].map(([key, g]) => {
    const [scope, category] = key.split('|');
    const kg = g.reduce((n, r) => n + num(r.co2_kg), 0);
    const units = new Set(g.map((r) => (r.activity_unit || '').trim().toLowerCase()));
    const unit = units.size === 1 ? [...units][0] : '';
    const activity = unit && g.every((r) => r.activity_data != null)
      ? { quantity: round(g.reduce((n, r) => n + num(r.activity_data), 0)), unit }
      : null;
    return {
      category, scope: Number(scope), kg: round(kg), share: basisKg > 0 ? round(kg / basisKg, 4) : 0,
      records: g.length, recordIds: g.slice(0, 5).map((r) => r.id), activity,
    };
  }).sort((a, b) => b.kg - a.kg).slice(0, 6);

  const months = new Map<string, MonthTotal>();
  for (const r of basisRows) {
    const m = recordMonth(r);
    const t = months.get(m) ?? { month: m, kg: 0, records: 0 };
    t.kg += num(r.co2_kg); t.records += 1;
    months.set(m, t);
  }
  const monthly = [...months.values()].map((m) => ({ ...m, kg: round(m.kg) })).sort((a, b) => a.month.localeCompare(b.month));

  const calculation = basis === 'none'
    ? 'No records yet.'
    : `${basis === 'verified' ? 'Verified' : 'Unverified'} total = sum of co2_kg over ${basisRows.length} record${basisRows.length === 1 ? '' : 's'} = ${round(basisKg)} kg CO2e. Each record's co2_kg is activity x emission factor, fixed when the invoice was read.`;

  const basisByScope: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  for (const r of basisRows) basisByScope[r.scope === 1 || r.scope === 2 ? r.scope : 3] += num(r.co2_kg);
  const top = ([1, 2, 3] as const).reduce((a, b) => (basisByScope[b] > basisByScope[a] ? b : a), 1 as 1 | 2 | 3);
  const summary: RecordBrief['summary'] = {
    kg: round(basisKg),
    records: basisRows.length,
    documents: new Set(basisRows.map((r) => r.document_id || r.id)).size,
    firstMonth: monthly[0]?.month ?? null,
    lastMonth: monthly[monthly.length - 1]?.month ?? null,
    topScope: basisKg > 0 ? { scope: top, share: round(basisByScope[top] / basisKg, 4) } : null,
  };

  return {
    basis, summary,
    verified: { records: verifiedRows.length, kg: round(verifiedKg), byScope: { 1: round(byScope[1]), 2: round(byScope[2]), 3: round(byScope[3]) } },
    unverified: { records: unverifiedRows.length, kg: round(unverifiedKg) },
    hotspots, monthly, complete: opts.complete, calculation,
  };
}

// ---------------------------------------------------------------- savings insights

export interface SavingsInsight {
  category: string;
  scope: number;
  /** Plain sentence built only from the figures in the record set. */
  finding: string;
  kg: number;
  share: number;
  /** Money on the invoices behind this category, in INR, when every invoice carries an INR amount. */
  spendInr: number | null;
  /** INR per activity unit, when both are known (for example INR per kWh). */
  unitCostInr: { value: number; unit: string } | null;
  /** The Senseible tool that estimates the saving, with its own sourced maths. */
  next: { label: string; path: string };
  recordIds: string[];
  label: 'Verified' | 'Estimate';
}

const ELECTRICITY = /electric|grid|power|kwh/;
const FUEL = /diesel|petrol|fuel|lpg|png|cng|coal|furnace|kerosene|naphtha|gas/;

/** Where to look first, ranked by share of emissions, with what each costs today. Never a saving figure. */
export function savingsInsights(brief: RecordBrief, rows: EmissionRow[], docs: DocumentRow[]): SavingsInsight[] {
  if (brief.basis === 'none') return [];
  const docById = new Map(docs.map((d) => [d.id, d]));
  const label = brief.basis === 'verified' ? 'Verified' : 'Estimate';
  const basisRows = rows.filter((r) => (brief.basis === 'verified' ? r.verified === true : r.verified !== true));
  return brief.hotspots.slice(0, 3).map((h) => {
    const groupRows = basisRows.filter((r) => (r.scope ?? 3) === h.scope && (r.category || 'other').toLowerCase() === h.category);
    const docIds = [...new Set(groupRows.map((r) => r.document_id).filter((x): x is string => !!x))];
    const groupDocs = docIds.map((id) => docById.get(id));
    const allInr = groupDocs.length > 0 && groupDocs.every((d) => d && num(d.amount) > 0 && (d.currency || 'INR').toUpperCase() === 'INR');
    const spendInr = allInr ? round(groupDocs.reduce((n, d) => n + num(d!.amount), 0)) : null;
    const unitCostInr = spendInr && h.activity && h.activity.quantity > 0 ? { value: round(spendInr / h.activity.quantity), unit: h.activity.unit } : null;
    const c = h.category;
    const next = h.scope === 2 || ELECTRICITY.test(c)
      ? { label: 'Rooftop solar signal', path: '/solar-signal' }
      : FUEL.test(c) || h.scope === 1
        ? { label: 'Fuel switch signal', path: '/reduction-signal' }
        : { label: 'Efficiency signal', path: '/reduction-signal' };
    const pct = Math.round(h.share * 100);
    const parts = [`${titleCase(c)} is ${pct}% of your ${label === 'Verified' ? 'verified' : 'estimated'} emissions (${fmtKg(h.kg)} from ${h.records} record${h.records === 1 ? '' : 's'}).`];
    if (spendInr) parts.push(`The invoices behind it total ${fmtInr(spendInr)}${unitCostInr ? `, ${fmtInr(unitCostInr.value)} per ${unitCostInr.unit}` : ''}.`);
    return { category: c, scope: h.scope, finding: parts.join(' '), kg: h.kg, share: h.share, spendInr, unitCostInr, next, recordIds: h.recordIds, label };
  });
}

// ---------------------------------------------------------------- trend projection

export interface Projection {
  monthsUsed: number;
  /** Change in monthly emissions per month, kg CO2e. */
  slopeKgPerMonth: number;
  next12Kg: number;
  /** Approximate 80% range for the next 12 months. */
  lowKg: number;
  highKg: number;
  method: string;
  label: 'Projection';
}

export const PROJECTION_MIN_MONTHS = 4;

/**
 * Least-squares straight line through the monthly totals (up to the last 12
 * months that have records), extended 12 months. The range is the line plus or
 * minus 1.28 x residual spread x sqrt(12) (about 80%, ignoring uncertainty in
 * the line itself), floored at zero. Months with no uploads are left out, not
 * counted as zero.
 */
export function projectTrend(monthly: MonthTotal[]): Projection | null {
  const pts = monthly.slice(-12);
  if (pts.length < PROJECTION_MIN_MONTHS) return null;
  const idx = (m: string) => { const [y, mo] = m.split('-').map(Number); return y * 12 + (mo - 1); };
  const x0 = idx(pts[0].month);
  const xs = pts.map((p) => idx(p.month) - x0);
  const ys = pts.map((p) => p.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const slope = sxx > 0 ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx : 0;
  const intercept = my - slope * mx;
  const resid = ys.map((y, i) => y - (intercept + slope * xs[i]));
  const sd = n > 2 ? Math.sqrt(resid.reduce((a, r) => a + r * r, 0) / (n - 2)) : 0;
  const last = xs[n - 1];
  let next12 = 0;
  for (let k = 1; k <= 12; k++) next12 += Math.max(0, intercept + slope * (last + k));
  const band = 1.28 * sd * Math.sqrt(12);
  return {
    monthsUsed: n,
    slopeKgPerMonth: round(slope),
    next12Kg: round(next12),
    lowKg: round(Math.max(0, next12 - band)),
    highKg: round(next12 + band),
    method: `Straight-line trend through ${n} months with records, extended 12 months. The range is an 80% band based on how far past months varied from the trend.`,
    label: 'Projection',
  };
}

// ---------------------------------------------------------------- sample data

/**
 * Labelled sample for guests, Snapshot and Essential, so they can see what an
 * analysis looks like. A fictional business; every figure is activity x the
 * factor in _shared/emissionFactors.ts (grid 0.710 kg/kWh, diesel 2.68 kg/L).
 */
export const SAMPLE_BRIEF = {
  label: 'Sample data, not your records',
  business: 'A fictional textile unit',
  lines: [
    { category: 'electricity', scope: 2, activity: { quantity: 12000, unit: 'kWh' }, factor: 0.710, kg: 8520 },
    { category: 'diesel', scope: 1, activity: { quantity: 900, unit: 'litre' }, factor: 2.68, kg: 2412 },
  ],
  totalKg: 10932,
  calculation: '12,000 kWh x 0.710 = 8,520 kg; 900 L x 2.68 = 2,412 kg; total 10,932 kg CO2e.',
} as const;

// ---------------------------------------------------------------- prompt safety

/**
 * Text that came from documents or profiles goes into the prompt as data. It
 * is cut short, stripped of control characters and of the characters that
 * could close the data block or start markup.
 */
export function cleanText(v: unknown, max = 80): string {
  return String(v ?? '')
    // eslint-disable-next-line no-control-regex -- control characters are exactly what is removed
    .replace(/[\u0000-\u001f\u007f<>`{}[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Marker placed at the top of the instructions; an answer containing it is cut off. */
export const PROMPT_CANARY = 'BIOCOG-INTERNAL-7f3a';
const LEAK_MARKERS = [PROMPT_CANARY, 'GROUNDING RULES (NON-NEGOTIABLE)', '# WHAT THE PLATFORM DOES AND WHERE', '# THIS REPLY IS SPOKEN ALOUD'];
export function looksLikePromptLeak(text: string): boolean {
  return LEAK_MARKERS.some((m) => text.includes(m));
}

// ---------------------------------------------------------------- formatting

function titleCase(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
export function fmtKg(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} t CO2e` : `${kg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg CO2e`;
}
export function fmtInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
