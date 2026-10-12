// Water-bill MRV pipeline: VALIDATE -> NORMALISE -> CLASSIFY -> ALLOCATE ->
// RESOLVE FACTOR -> CALCULATE -> MAP -> FLAG. Pure and deterministic: the same
// bill, factors, rules and settings always give the same drafts. Persisting
// (one transaction, with audit events) is done by public.water_persist_run.
import type { EmissionFactor, EmissionResultDraft, MappingRule, ReasonCode, WaterBillInput } from './types.ts';
import { activityFor, idempotencyKey, validateBill } from './ingest.ts';
import { allocate, reportingPeriods } from './allocate.ts';
import { resolveFactor } from './resolve.ts';
import { calculate } from './calculate.ts';
import { mapCategory } from './mapping.ts';
import { raiseFlag, type GapFlag } from './flags.ts';

export const WATER_METHOD_VERSION = 'WATER_MRV_v1.0';

export interface RunSettings {
  factors: EmissionFactor[];
  rules: MappingRule[];
  gwp_basis: string;                       // entity's reporting basis, e.g. "AR5"
  period_basis: 'CALENDAR' | 'INDIA_FY';
  calc_run_id: string;
  today: string;                           // YYYY-MM-DD, for flag due dates
}

export interface BillRun {
  water_bill_key: string;
  method_version: string;
  validation: ReturnType<typeof validateBill>;
  results: EmissionResultDraft[];
  flags: GapFlag[];
}

const blank = (key: string, s: RunSettings): Omit<EmissionResultDraft, 'allocation_period' | 'allocated_volume_m3' | 'allocation_method' | 'status' | 'reasons'> => ({
  water_bill_key: key, emissions_kgco2e: null, activity_type: null,
  factor_id: null, factor_version: null, factor_value: null, factor_unit: null, factor_source: null,
  factor_geography: null, factor_year: null, gwp_basis: null, factor_uncertainty: null, factor_tier: 'none',
  resolution_trace: [], scope: null, scope3_category: null, mapping_status: 'MAPPING_PENDING_REVIEW',
  mapping_rule_id: null, calc_run_id: s.calc_run_id,
});

export async function runBill(bill: WaterBillInput, s: RunSettings): Promise<BillRun> {
  const key = await idempotencyKey(bill);
  const v = validateBill(bill);
  const flags: GapFlag[] = [];
  const results: EmissionResultDraft[] = [];

  // I1: an invalid bill is kept and gets one INVALID_INPUT result with null emissions.
  if (!v.ok) {
    for (const r of v.reasons) flags.push(raiseFlag(key, null, r, r === 'MISSING_FIELD' ? `missing: ${v.missing.join(', ')}` : `unit "${bill.unit_raw ?? ''}"`, s.today));
    results.push({ ...blank(key, s), allocation_period: 'UNALLOCATED', allocated_volume_m3: v.volume_m3, allocation_method: 'WHOLE_PERIOD', status: 'INVALID_INPUT', reasons: [...v.reasons] });
    return { water_bill_key: key, method_version: WATER_METHOD_VERSION, validation: v, results, flags };
  }

  const start = bill.billing_period_start as string, end = bill.billing_period_end as string;
  const parts = allocate(start, end, v.volume_m3 as number, reportingPeriods(start, end, s.period_basis));
  const activity = activityFor(bill.volume_kind);

  for (const p of parts) {
    const reasons: ReasonCode[] = [];
    if (parts.length > 1) reasons.push('PERIOD_SPANS_YEARS');
    if (bill.reading_type === 'ESTIMATED_BY_UTILITY') reasons.push('UTILITY_ESTIMATED_READING');

    // I6: a combined supply + wastewater volume is never split by assumption.
    if (activity === null) {
      reasons.push('COMBINED_UNSPLIT');
      results.push({ ...blank(key, s), allocation_period: p.period.label, allocated_volume_m3: p.volume_m3, allocation_method: p.method, status: 'UNAVAILABLE_FACTOR_PENDING', reasons });
    } else {
      const res = resolveFactor(s.factors, { activity, supplier_id: bill.supplier_id, country_code: bill.country_code, region_code: bill.region_code, period_start: p.start, period_end: p.end, reporting_year: p.period.year, gwp_basis: s.gwp_basis });
      const calc = calculate(p.volume_m3, res);
      const map = mapCategory(s.rules, bill.entity_id, activity, p.end);
      reasons.push(...res.reasons);
      if (map.mapping_status !== 'MAPPED') reasons.push('MAPPING_PENDING');
      const f = res.factor;
      results.push({
        ...blank(key, s), allocation_period: p.period.label, allocated_volume_m3: p.volume_m3, allocation_method: p.method,
        status: res.status, emissions_kgco2e: calc.emissions_kgco2e, activity_type: activity,
        factor_id: f?.id ?? null, factor_version: f?.version ?? null, factor_value: f?.value ?? null, factor_unit: f?.unit ?? null,
        factor_source: f?.source_name ?? null, factor_geography: f ? `${f.geography_type}:${f.geography}` : null,
        factor_year: f?.source_publication_year ?? null, gwp_basis: f?.gwp_basis ?? null, factor_uncertainty: f?.uncertainty ?? null,
        factor_tier: res.tier, resolution_trace: res.trace,
        scope: map.scope, scope3_category: map.scope3_category, mapping_status: map.mapping_status, mapping_rule_id: map.mapping_rule_id,
        reasons,
      });
    }
    for (const r of reasons) flags.push(raiseFlag(key, p.period.label, r, detailFor(r, bill), s.today));
  }
  return { water_bill_key: key, method_version: WATER_METHOD_VERSION, validation: v, results, flags };
}

function detailFor(r: ReasonCode, b: WaterBillInput): string {
  switch (r) {
    case 'NO_FACTOR': return `no approved factor for ${b.volume_kind} in ${b.country_code ?? 'unknown country'}`;
    case 'PROXY_FACTOR_USED': return 'calculated with an approved proxy factor; reported as an estimate';
    case 'AMBIGUOUS_FACTOR': return 'two factors tie at the same tier; a factor steward must choose';
    case 'GWP_BASIS_MISMATCH': return 'factors exist only on a different GWP basis';
    case 'COMBINED_UNSPLIT': return 'bill gives supply and wastewater as one volume';
    case 'MAPPING_PENDING': return 'no approved scope/category rule';
    case 'UTILITY_ESTIMATED_READING': return 'utility estimated the meter reading';
    case 'PERIOD_SPANS_YEARS': return 'volume split across reporting periods by days';
    default: return r;
  }
}
