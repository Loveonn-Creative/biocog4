/**
 * Dashboard analytics — presentation-layer aggregation only.
 *
 * Every value here is derived from emission records already loaded from the
 * database. Nothing is stored, no emission factor is applied, no methodology
 * is touched. Filtering and windowing change what is displayed, never what is
 * recorded.
 */

import type { Emission } from '@/hooks/useEmissions';

export type TimeRange = '30d' | '90d' | '12m' | 'fy' | 'all';
export type ScopeFilter = 'all' | 1 | 2 | 3;
export type StatusFilter = 'all' | 'verified' | 'unverified';

export interface DashboardFilters {
  range: TimeRange;
  scope: ScopeFilter;
  status: StatusFilter;
  category: string; // 'all' or a category name
}

export const DEFAULT_FILTERS: DashboardFilters = {
  range: '90d',
  scope: 'all',
  status: 'all',
  category: 'all',
};

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
  fy: 'Current financial year',
  all: 'All records',
};

/** Financial-year start. India and most supported markets run April–March. */
const fyStart = (now: Date, aprilStart: boolean): Date =>
  aprilStart
    ? new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1)
    : new Date(now.getFullYear(), 0, 1);

export interface Window {
  from: Date | null;
  to: Date;
  /** Equivalent-length window immediately before `from`, when one exists. */
  priorFrom: Date | null;
  priorTo: Date | null;
}

export function resolveWindow(range: TimeRange, aprilFY = true, now = new Date()): Window {
  const to = now;
  if (range === 'all') return { from: null, to, priorFrom: null, priorTo: null };

  let from: Date;
  if (range === 'fy') {
    from = fyStart(now, aprilFY);
  } else {
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 365;
    from = new Date(now.getTime() - days * 86400000);
  }

  const span = to.getTime() - from.getTime();
  return {
    from,
    to,
    priorFrom: new Date(from.getTime() - span),
    priorTo: from,
  };
}

const inWindow = (iso: string, from: Date | null, to: Date): boolean => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (from && t < from.getTime()) return false;
  return t <= to.getTime();
};

export function applyFilters(emissions: Emission[], filters: DashboardFilters, win: Window): Emission[] {
  return emissions.filter((e) => {
    if (!inWindow(e.created_at, win.from, win.to)) return false;
    if (filters.scope !== 'all' && e.scope !== filters.scope) return false;
    if (filters.status === 'verified' && !e.verified) return false;
    if (filters.status === 'unverified' && e.verified) return false;
    if (filters.category !== 'all' && e.category !== filters.category) return false;
    return true;
  });
}

export interface ScopeTotals {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}

export function totals(rows: Emission[]): ScopeTotals {
  const scope1 = rows.filter((e) => e.scope === 1).reduce((s, e) => s + (e.co2_kg || 0), 0);
  const scope2 = rows.filter((e) => e.scope === 2).reduce((s, e) => s + (e.co2_kg || 0), 0);
  const scope3 = rows.filter((e) => e.scope === 3).reduce((s, e) => s + (e.co2_kg || 0), 0);
  return { scope1, scope2, scope3, total: scope1 + scope2 + scope3 };
}

export interface PeriodDelta {
  /** null when there is no comparable prior period with any record. */
  changePct: number | null;
  currentKg: number;
  priorKg: number;
  comparable: boolean;
}

export function periodDelta(
  emissions: Emission[],
  filters: DashboardFilters,
  win: Window,
): PeriodDelta {
  const current = totals(applyFilters(emissions, filters, win)).total;

  if (!win.priorFrom || !win.priorTo) {
    return { changePct: null, currentKg: current, priorKg: 0, comparable: false };
  }

  const priorWin: Window = { from: win.priorFrom, to: win.priorTo, priorFrom: null, priorTo: null };
  const prior = totals(applyFilters(emissions, filters, priorWin)).total;

  if (prior <= 0) {
    // No baseline to compare against — say so rather than reporting an
    // infinite or invented increase.
    return { changePct: null, currentKg: current, priorKg: prior, comparable: false };
  }

  return {
    changePct: ((current - prior) / prior) * 100,
    currentKg: current,
    priorKg: prior,
    comparable: true,
  };
}

export interface CategoryRow {
  category: string;
  co2Kg: number;
  sharePct: number;
  recordCount: number;
}

export function topCategories(rows: Emission[], limit = 6): CategoryRow[] {
  const map = new Map<string, { kg: number; n: number }>();
  for (const e of rows) {
    const prev = map.get(e.category) || { kg: 0, n: 0 };
    map.set(e.category, { kg: prev.kg + (e.co2_kg || 0), n: prev.n + 1 });
  }
  const total = [...map.values()].reduce((s, v) => s + v.kg, 0);
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      co2Kg: v.kg,
      sharePct: total > 0 ? (v.kg / total) * 100 : 0,
      recordCount: v.n,
    }))
    .sort((a, b) => b.co2Kg - a.co2Kg)
    .slice(0, limit);
}

export interface SeriesPoint {
  month: string;
  scope1: number;
  scope2: number;
  scope3: number;
}

/** Monthly series across the selected window, built from record dates only. */
export function monthlySeries(rows: Emission[], win: Window, locale = 'en-US'): SeriesPoint[] {
  if (rows.length === 0) return [];

  const dates = rows.map((r) => new Date(r.created_at).getTime()).filter((t) => !Number.isNaN(t));
  if (dates.length === 0) return [];

  const start = win.from ?? new Date(Math.min(...dates));
  const end = win.to;

  const buckets = new Map<string, SeriesPoint>();
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const key = cursor.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
    buckets.set(key, { month: key, scope1: 0, scope2: 0, scope3: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const e of rows) {
    const d = new Date(e.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (e.scope === 1) bucket.scope1 += e.co2_kg || 0;
    else if (e.scope === 2) bucket.scope2 += e.co2_kg || 0;
    else bucket.scope3 += e.co2_kg || 0;
  }

  return [...buckets.values()];
}

export interface EvidenceCompleteness {
  totalRecords: number;
  verifiedRecords: number;
  verifiedPct: number;
  /** Records with no activity quantity — they cannot be independently reproduced. */
  withoutActivityData: number;
  /** Records with no emission factor recorded against them. */
  withoutFactor: number;
  scopesPresent: number[];
}

export function evidenceCompleteness(rows: Emission[]): EvidenceCompleteness {
  const verified = rows.filter((e) => e.verified).length;
  return {
    totalRecords: rows.length,
    verifiedRecords: verified,
    verifiedPct: rows.length > 0 ? (verified / rows.length) * 100 : 0,
    withoutActivityData: rows.filter((e) => e.activity_data === null || e.activity_data === undefined).length,
    withoutFactor: rows.filter((e) => e.emission_factor === null || e.emission_factor === undefined).length,
    scopesPresent: [...new Set(rows.map((e) => e.scope))].sort(),
  };
}

export function allCategories(emissions: Emission[]): string[] {
  return [...new Set(emissions.map((e) => e.category))].sort();
}
