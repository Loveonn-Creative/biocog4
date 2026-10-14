// Database side of the Scope 2 engine, shared by extract-document (record a
// bill's consumption on upload) and scope2-engine (register instruments,
// recalculate). The maths is in ./electricity.ts; this file only reads and
// writes. Until pending migration 20261021100000_electricity_engine is
// applied the tables do not exist and every function returns quietly.

import {
  activitiesFromBill, allocate, calculateLocation, calculateMarket, splitByReportingYear, SCOPE2_METHOD_VERSION, yearStartMonth,
  type ActivityPortion, type BillInput, type ElectricityFactor, type Instrument, type Scope2Result,
} from './electricity.ts';

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the supabase-js client differs between Deno and the tests
type Client = any;

const MISSING = new Set(['42P01', 'PGRST205', 'PGRST202', '42883']);
export const scope2NotEnabled = (e: { code?: string } | null | undefined) => !!e && MISSING.has(e.code ?? '');

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
const isoDate = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

/** Record the consumption a bill prints (billing details only). Idempotent per document and line. */
export async function recordBillActivities(client: Client, p: { documentId: string; userId: string; organizationId: string | null; bill: BillInput; profileLocation: string | null }): Promise<number | null> {
  const drafts = activitiesFromBill(p.bill, p.profileLocation);
  const rows = drafts.map((d) => ({
    user_id: p.userId, organization_id: p.organizationId, document_id: p.documentId, line_key: d.lineKey,
    country: d.country, country_source: d.countrySource, supplier_ref: d.supplierRef,
    period_start: d.periodStart, period_end: d.periodEnd, quantity_printed: d.quantityPrinted, unit_printed: d.unitPrinted,
    kwh: d.kwh, status: d.status, reasons: d.reasons, source_text: d.sourceText, method_version: SCOPE2_METHOD_VERSION,
  }));
  if (!rows.length) return 0;
  const { error } = await client.from('electricity_activities').upsert(rows, { onConflict: 'document_id,line_key', ignoreDuplicates: true });
  if (error) { if (!scope2NotEnabled(error)) console.error('Scope 2: activity not recorded:', error.message); return null; }
  return rows.length;
}

function toFactor(f: Record<string, unknown>): ElectricityFactor {
  return {
    id: f.id as string, factorKey: f.factor_key as string, version: f.version as string, kind: f.kind as ElectricityFactor['kind'],
    country: f.country as string, gridRegion: (f.grid_region as string | null) ?? null, supplierRef: (f.supplier_ref as string | null) ?? null,
    kgPerKwh: Number(f.kg_per_kwh), gases: f.gases as 'CO2' | 'CO2e', validFrom: isoDate(f.valid_from), validTo: f.valid_to ? isoDate(f.valid_to) : null,
    sourceName: f.source_name as string, sourceRef: f.source_ref as string, publicationYear: Number(f.publication_year),
  };
}
function toInstrument(i: Record<string, unknown>): Instrument {
  return {
    id: i.id as string, type: i.type as Instrument['type'], scheme: i.scheme as string, certificateRef: (i.certificate_ref as string | null) ?? null,
    mwh: Number(i.mwh), generationCountry: i.generation_country as string, generationRegion: (i.generation_region as string | null) ?? null,
    vintageStart: isoDate(i.vintage_start), vintageEnd: isoDate(i.vintage_end), kgPerKwh: Number(i.kg_per_kwh), retired: i.retired === true,
    retirementRef: (i.retirement_ref as string | null) ?? null, evidenceDocumentId: (i.evidence_document_id as string | null) ?? null,
    beneficiaryConfirmed: i.beneficiary_confirmed === true,
  };
}

function row(r: Scope2Result, p: ActivityPortion) {
  const use = r.factors[0];
  return {
    activity_id: r.activityId, reporting_year: r.reportingYear, method: r.method, period_start: p.periodStart, period_end: p.periodEnd, kwh: r.kwh,
    factor_id: use?.factor.id ?? null, factor_key: use?.factor.factorKey ?? null, factor_version: use?.factor.version ?? null,
    factor_kind: use?.factor.kind ?? null, factor_value: use?.factor.kgPerKwh ?? null, factor_gases: use?.factor.gases ?? null,
    factor_source: use ? `${use.factor.sourceName}, ${use.factor.sourceRef} (${use.factor.publicationYear})` : null,
    factor_kwh: use?.kwh ?? null, instrument_kwh: r.instrumentKwh, instrument_kg: r.instrumentKg,
    kg: r.status === 'unresolved' ? null : r.kg, status: r.status, formula: r.formula, warnings: r.warnings, reasons: r.reasons,
  };
}

/**
 * Recalculate one owner's Scope 2: split consumption by reporting year,
 * allocate eligible instruments, compute location- and market-based results,
 * and record them atomically (scope2_record). Deterministic: the same records
 * give the same rows, and unchanged rows are kept.
 */
export async function recalculateOwner(client: Client, userId: string): Promise<{ written: number; kept: number; allocations: number; rejected: number } | null> {
  const acts = await client.from('electricity_activities').select('*').eq('user_id', userId).eq('status', 'valid');
  if (acts.error) { if (!scope2NotEnabled(acts.error)) console.error('Scope 2: activities not read:', acts.error.message); return null; }
  const activities = (acts.data ?? []) as Record<string, unknown>[];
  const countries = [...new Set(activities.map((a) => a.country as string))];
  const [fac, ins] = await Promise.all([
    countries.length ? client.from('electricity_factors').select('*').eq('status', 'approved').in('country', countries) : Promise.resolve({ data: [], error: null }),
    client.from('electricity_instruments').select('*').eq('user_id', userId),
  ]);
  if (fac.error || ins.error) { const e = fac.error ?? ins.error; if (!scope2NotEnabled(e)) console.error('Scope 2: factors or instruments not read:', e.message); return null; }
  const factors = ((fac.data ?? []) as Record<string, unknown>[]).map(toFactor);
  const instruments = ((ins.data ?? []) as Record<string, unknown>[]).map(toInstrument);

  const portions: ActivityPortion[] = activities.flatMap((a) => splitByReportingYear(Number(a.kwh), isoDate(a.period_start), isoDate(a.period_end), yearStartMonth(a.country as string))
    .map((s) => ({ activityId: a.id as string, country: a.country as string, gridRegion: (a.grid_region as string | null) ?? null, supplierRef: (a.supplier_ref as string | null) ?? null,
      reportingYear: s.reportingYear, periodStart: s.periodStart, periodEnd: s.periodEnd, kwh: s.kwh })));
  const { allocations, rejected } = allocate(portions, instruments, [], yearStartMonth);

  const calculations = await Promise.all(portions.flatMap((p) => [calculateLocation(p, factors), calculateMarket(p, allocations, instruments, factors)].map(async (r) => {
    const body = row(r, p);
    return { ...body, inputs_sha256: await sha256Hex(JSON.stringify({ body, method: SCOPE2_METHOD_VERSION, allocations: allocations.filter((a) => a.activityId === p.activityId && a.reportingYear === p.reportingYear) })) };
  })));
  const { data, error } = await client.rpc('scope2_record', { p: {
    user_id: userId, method_version: SCOPE2_METHOD_VERSION,
    allocations: allocations.map((a) => ({ instrument_id: a.instrumentId, activity_id: a.activityId, reporting_year: a.reportingYear, kwh: a.kwh })),
    calculations,
  } });
  if (error) { if (!scope2NotEnabled(error)) console.error('Scope 2: not recorded:', error.message); return null; }
  return { written: data?.written ?? 0, kept: data?.kept ?? 0, allocations: data?.allocations ?? 0, rejected: rejected.length };
}

/** Upload path: record the bill's consumption, then recalculate. Never throws. */
export async function recordBillAndRecalculate(client: Client, p: Parameters<typeof recordBillActivities>[1]): Promise<void> {
  try {
    const n = await recordBillActivities(client, p);
    if (n) await recalculateOwner(client, p.userId);
  } catch (e) {
    console.error('Scope 2 engine error:', e instanceof Error ? e.message : e);
  }
}
