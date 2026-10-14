// Scope 2 dual reporting, shaped for display from the database rows the
// Scope 2 engine writes (scope2_totals, current electricity_calculations,
// electricity_activities, electricity_instruments, electricity_allocations).
// Pure: no fetching, so it is tested directly. Numbers are never computed
// here beyond sums of persisted, server-written values.

export interface Scope2MethodTotal { kwh: number; kg: number | null; unresolvedKwh: number; instrumentKwh: number }
export interface Scope2Year { year: string; location: Scope2MethodTotal | null; market: Scope2MethodTotal | null }
export interface Scope2Instrument {
  id: string; type: string; scheme: string; certificateRef: string | null; mwh: number; generationCountry: string;
  vintageStart: string; vintageEnd: string; kgPerKwh: number; retired: boolean; beneficiaryConfirmed: boolean;
  hasEvidence: boolean; allocatedKwh: number;
}
export interface Scope2Summary {
  enabled: boolean;
  years: Scope2Year[];
  /** Disclosures attached to current results (e.g. residual_mix_unavailable), each once. */
  warnings: string[];
  /** Consumption records that cannot be calculated yet, by reason. */
  needsData: Array<{ reason: string; count: number }>;
  instruments: Scope2Instrument[];
}

export const EMPTY_SCOPE2: Scope2Summary = { enabled: false, years: [], warnings: [], needsData: [], instruments: [] };

type Row = Record<string, unknown>;
const n = (v: unknown) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const iso = (v: unknown) => String(v ?? '').slice(0, 10);

/** Fiscal years (FY2025-26) and calendar years (2025), newest first. */
const yearKey = (y: string) => (y.startsWith('FY') ? Number(y.slice(2, 6)) : Number(y));

export function summariseScope2(input: { totals: Row[]; calculations: Row[]; activities: Row[]; instruments: Row[]; allocations: Row[] }): Scope2Summary {
  const byYear = new Map<string, Scope2Year>();
  for (const t of input.totals) {
    const year = String(t.reporting_year);
    const entry = byYear.get(year) ?? { year, location: null, market: null };
    const prev = t.method === 'location' ? entry.location : entry.market;
    const add: Scope2MethodTotal = {
      kwh: n(t.kwh), kg: t.kg === null || t.kg === undefined ? null : n(t.kg),
      unresolvedKwh: n(t.unresolved_kwh), instrumentKwh: n(t.instrument_kwh),
    };
    // One row per owner and organisation; a personal and an organisation row add up.
    const merged = prev ? {
      kwh: prev.kwh + add.kwh, kg: prev.kg === null && add.kg === null ? null : (prev.kg ?? 0) + (add.kg ?? 0),
      unresolvedKwh: prev.unresolvedKwh + add.unresolvedKwh, instrumentKwh: prev.instrumentKwh + add.instrumentKwh,
    } : add;
    if (t.method === 'location') entry.location = merged; else if (t.method === 'market') entry.market = merged;
    byYear.set(year, entry);
  }
  const years = [...byYear.values()].sort((a, b) => yearKey(b.year) - yearKey(a.year) || b.year.localeCompare(a.year));

  const warnings = [...new Set(input.calculations.flatMap((c) => (Array.isArray(c.warnings) ? c.warnings.map(String) : [])))].sort();

  const reasonCount = new Map<string, number>();
  for (const a of input.activities) {
    if (a.status !== 'needs_data') continue;
    for (const r of Array.isArray(a.reasons) ? a.reasons.map(String) : []) reasonCount.set(r, (reasonCount.get(r) ?? 0) + 1);
  }
  const needsData = [...reasonCount.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

  const allocated = new Map<string, number>();
  for (const a of input.allocations) allocated.set(String(a.instrument_id), (allocated.get(String(a.instrument_id)) ?? 0) + n(a.kwh));
  const instruments = input.instruments.map((i) => ({
    id: String(i.id), type: String(i.type), scheme: String(i.scheme), certificateRef: (i.certificate_ref as string | null) ?? null,
    mwh: n(i.mwh), generationCountry: String(i.generation_country), vintageStart: iso(i.vintage_start), vintageEnd: iso(i.vintage_end),
    kgPerKwh: n(i.kg_per_kwh), retired: i.retired === true, beneficiaryConfirmed: i.beneficiary_confirmed === true,
    hasEvidence: !!i.evidence_document_id, allocatedKwh: allocated.get(String(i.id)) ?? 0,
  })).sort((a, b) => b.vintageEnd.localeCompare(a.vintageEnd) || a.id.localeCompare(b.id));

  return { enabled: true, years, warnings, needsData, instruments };
}
