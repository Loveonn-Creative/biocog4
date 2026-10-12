import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { m3PerUnit, toM3, factorPerM3 } from '../supabase/functions/_shared/water/units';
import { validateBill, idempotencyKey } from '../supabase/functions/_shared/water/ingest';
import { allocate, reportingPeriods } from '../supabase/functions/_shared/water/allocate';
import { resolveFactor } from '../supabase/functions/_shared/water/resolve';
import { calculate } from '../supabase/functions/_shared/water/calculate';
import { mapCategory, validRule } from '../supabase/functions/_shared/water/mapping';
import { raiseFlag, transition, reconcileFlags } from '../supabase/functions/_shared/water/flags';
import { runBill, type RunSettings } from '../supabase/functions/_shared/water/pipeline';
import { planRecalc, applyPlan, applyToHistory, type StoredResult } from '../supabase/functions/_shared/water/recalc';
import { aggregate, describeTotal, gapReport, waterVolumes } from '../supabase/functions/_shared/water/aggregate';
import type { EmissionFactor, MappingRule, WaterBillInput } from '../supabase/functions/_shared/water/types';

// Every factor below is a TEST FIXTURE with round numbers chosen for hand
// arithmetic. None is a real published factor.
const F = (o: Partial<EmissionFactor>): EmissionFactor => ({
  id: 'f', version: 1, activity_type: 'WATER_SUPPLY', value: 0.5, unit: 'kgCO2e/m3',
  geography_type: 'COUNTRY', geography: 'IN', valid_from: '2020-01-01', valid_to: null,
  source_name: 'TEST FIXTURE (not a real factor)', source_publication_year: 2025, gwp_basis: 'AR5',
  status: 'APPROVED', approved_for_proxy: false, proxy_for_country: null, uncertainty: null, ...o,
});
const R = (o: Partial<MappingRule>): MappingRule => ({
  id: 'r', entity_id: null, activity_type: 'WATER_SUPPLY', scope: 3, scope3_category: 1,
  valid_from: '2020-01-01', valid_to: null, status: 'APPROVED', basis: 'TEST', ...o,
});
const BILL = (o: Partial<WaterBillInput> = {}): WaterBillInput => ({
  entity_id: 'e1', site_id: 's1', supplier_id: 'sup1', country_code: 'IN', billing_period_start: '2026-05-01',
  billing_period_end: '2026-05-31', volume_raw: 100, unit_raw: 'kL', volume_kind: 'SUPPLY', reading_type: 'ACTUAL',
  source_document_ref: 'doc-1', ...o,
});
const SET = (o: Partial<RunSettings> = {}): RunSettings => ({
  factors: [F({ id: 'in-supply' }), F({ id: 'in-ww', activity_type: 'WATER_WASTEWATER_TREATMENT', value: 1 })],
  rules: [R({ id: 'supply-c1' }), R({ id: 'ww-c5', activity_type: 'WATER_WASTEWATER_TREATMENT', scope3_category: 5 })],
  gwp_basis: 'AR5', period_basis: 'CALENDAR', calc_run_id: 'run-1', today: '2026-10-12', ...o,
});
const close = (a: number | null, b: number) => expect(Math.abs((a as number) - b)).toBeLessThan(1e-9);

describe('units (exact definitions)', () => {
  test('US gallon, imperial gallon, CCF from their legal definitions', () => {
    close(toM3(1000, 'US gal'), 3.785411784);            // 1 US gal = 231 in³ = 3.785411784 L
    close(toM3(1000, 'imperial gallons'), 4.54609);      // 1 imp gal = 4.54609 L
    close(toM3(1, 'CCF'), 2.8316846592);                 // 100 ft³, 1 ft = 0.3048 m
    close(toM3(1, 'kL'), 1);
    close(toM3(2500, 'litres'), 2.5);
  });
  test('ambiguous or unknown units give null, never a guess', () => {
    expect(m3PerUnit('gallon')).toBeNull();
    expect(m3PerUnit('units')).toBeNull();
    expect(m3PerUnit('')).toBeNull();
  });
  test('factor unit conversion', () => {
    close(factorPerM3(0.0005, 'kgCO2e/L'), 0.5);
    close(factorPerM3(0.5, 'kgCO2e per kL'), 0.5);
    expect(factorPerM3(0.5, 'kgCO2e/kWh')).toBeNull();
    expect(factorPerM3(0.5, 'tCO2e/m3')).toBeNull();
  });
});

describe('validation keeps every bill (I1)', () => {
  test('missing fields, unknown unit and unmatched negative volume are reported, not dropped', () => {
    expect(validateBill(BILL({ volume_raw: null })).reasons).toContain('MISSING_FIELD');
    expect(validateBill(BILL({ unit_raw: 'gallon' })).reasons).toContain('UNKNOWN_UNIT');
    expect(validateBill(BILL({ volume_raw: -5 })).reasons).toContain('NEGATIVE_VOLUME_UNMATCHED');
    expect(validateBill(BILL({ volume_raw: -5, corrects_bill_id: 'b0' })).ok).toBe(true);
    expect(validateBill(BILL({ billing_period_end: '2026-04-01' })).reasons).toContain('MISSING_FIELD');
  });
  test('idempotency key is stable and changes with volume', async () => {
    expect(await idempotencyKey(BILL())).toBe(await idempotencyKey(BILL()));
    expect(await idempotencyKey(BILL())).not.toBe(await idempotencyKey(BILL({ volume_raw: 101 })));
  });
});

describe('allocation across reporting periods', () => {
  test('pro-rata by inclusive days across a calendar year end', () => {
    const p = allocate('2025-12-17', '2026-01-15', 30, reportingPeriods('2025-12-17', '2026-01-15', 'CALENDAR'));
    expect(p.map(x => [x.period.label, x.days])).toEqual([['2025', 15], ['2026', 15]]);
    close(p[0].volume_m3, 15); close(p[1].volume_m3, 15);
  });
  test('India FY boundary (31 March / 1 April) and exact sum', () => {
    const p = allocate('2026-03-01', '2026-04-30', 61, reportingPeriods('2026-03-01', '2026-04-30', 'INDIA_FY'));
    expect(p.map(x => x.period.label)).toEqual(['FY2025-26', 'FY2026-27']);
    expect(p.map(x => x.days)).toEqual([31, 30]);
    expect(p.reduce((s, x) => s + x.volume_m3, 0)).toBe(61);
  });
  test('leap day counts', () => {
    const p = allocate('2028-02-01', '2028-03-31', 60, reportingPeriods('2028-02-01', '2028-03-31', 'CALENDAR'));
    expect(p[0].days).toBe(60);
  });
});

describe('factor resolution', () => {
  const ctx = { activity: 'WATER_SUPPLY' as const, supplier_id: 'sup1', country_code: 'IN', period_start: '2026-05-01', period_end: '2026-05-31', reporting_year: 2026, gwp_basis: 'AR5' };
  test('supplier beats country; trace records why', () => {
    const r = resolveFactor([F({ id: 'c' }), F({ id: 's', geography_type: 'SUPPLIER', geography: 'sup1' })], ctx);
    expect(r.factor?.id).toBe('s'); expect(r.tier).toBe('A');
    expect(r.trace.find(t => t.factor_id === 's')?.reason).toContain('selected');
  });
  test('DRAFT, RETIRED, wrong unit, wrong period and other countries are never used', () => {
    const r = resolveFactor([
      F({ id: 'd', status: 'DRAFT' }), F({ id: 'x', status: 'RETIRED' }), F({ id: 'u', unit: 'kgCO2e/kWh' }),
      F({ id: 'p', valid_to: '2026-05-15' }), F({ id: 'gb', geography: 'GB' }),
    ], ctx);
    expect(r.factor).toBeNull(); expect(r.reasons).toEqual(['NO_FACTOR']);
    expect(r.trace.every(t => !t.accepted)).toBe(true);
  });
  test('another country only via a human-approved proxy, labelled as estimate', () => {
    const r = resolveFactor([F({ id: 'gb', geography: 'GB', approved_for_proxy: true, proxy_for_country: 'IN' })], ctx);
    expect(r.status).toBe('ESTIMATED_PROXY'); expect(r.reasons).toEqual(['PROXY_FACTOR_USED']);
    expect(resolveFactor([F({ id: 'gb', geography: 'GB', approved_for_proxy: true, proxy_for_country: 'BD' })], ctx).factor).toBeNull();
  });
  test('GWP basis mismatch is its own reason', () => {
    expect(resolveFactor([F({ gwp_basis: 'AR6' })], ctx).reasons).toEqual(['GWP_BASIS_MISMATCH']);
  });
  test('year tie-break, then AMBIGUOUS_FACTOR on a real tie', () => {
    expect(resolveFactor([F({ id: 'old', source_publication_year: 2022 }), F({ id: 'new', source_publication_year: 2026 })], ctx).factor?.id).toBe('new');
    expect(resolveFactor([F({ id: 'now', source_publication_year: 2026 }), F({ id: 'future', source_publication_year: 2027 })], ctx).factor?.id).toBe('now');
    const tie = resolveFactor([F({ id: 'a' }), F({ id: 'b' })], ctx);
    expect(tie.reasons).toEqual(['AMBIGUOUS_FACTOR']); expect(tie.factor).toBeNull();
  });
  test('input order does not change the choice', () => {
    const fs = [F({ id: 'old', source_publication_year: 2022 }), F({ id: 'new', source_publication_year: 2026 }), F({ id: 's', geography_type: 'SUPPLIER', geography: 'sup1', source_publication_year: 2020 })];
    expect(resolveFactor(fs, ctx).factor?.id).toBe(resolveFactor([...fs].reverse(), ctx).factor?.id);
  });
});

describe('calculation (I2)', () => {
  const res = (f: EmissionFactor | null) => ({ status: 'CALCULATED' as const, tier: 'A' as const, factor: f, reasons: [], trace: [] });
  test('volume x factor with unit conversion', () => {
    close(calculate(100, res(F({ value: 0.0005, unit: 'kgCO2e/L' }))).emissions_kgco2e, 50);
  });
  test('missing factor is null, measured zero is zero', () => {
    expect(calculate(100, res(null)).emissions_kgco2e).toBeNull();
    expect(calculate(0, res(F({}))).emissions_kgco2e).toBe(0);
    expect(calculate(0, res(null)).emissions_kgco2e).toBeNull();
  });
  test('factor uncertainty is propagated; absent uncertainty stays null', () => {
    close(calculate(100, res(F({ uncertainty: 0.1 }))).uncertainty_kgco2e, 5);
    expect(calculate(100, res(F({}))).uncertainty_kgco2e).toBeNull();
  });
  test('credit note gives negative emissions', () => {
    close(calculate(-10, res(F({}))).emissions_kgco2e, -5);
  });
});

describe('scope and category mapping (I9)', () => {
  test('entity rule beats default; DRAFT never applies', () => {
    const rules = [R({ id: 'def' }), R({ id: 'own', entity_id: 'e1', scope3_category: 2 }), R({ id: 'draft', entity_id: 'e1', status: 'DRAFT', scope3_category: 4 })];
    expect(mapCategory(rules, 'e1', 'WATER_SUPPLY', '2026-05-31')).toMatchObject({ scope: 3, scope3_category: 2, mapping_rule_id: 'own' });
    expect(mapCategory(rules, 'e2', 'WATER_SUPPLY', '2026-05-31').mapping_rule_id).toBe('def');
  });
  test('no rule or conflicting rules leave the row unmapped and flagged', () => {
    expect(mapCategory([], 'e1', 'WATER_SUPPLY', '2026-05-31').mapping_status).toBe('MAPPING_PENDING_REVIEW');
    expect(mapCategory([R({ id: 'a' }), R({ id: 'b', scope3_category: 5 })], 'e1', 'WATER_SUPPLY', '2026-05-31').mapping_status).toBe('MAPPING_PENDING_REVIEW');
  });
  test('invalid scope/category combinations are rejected', () => {
    expect(validRule({ scope: 3, scope3_category: null })).toBe(false);
    expect(validRule({ scope: 3, scope3_category: 16 })).toBe(false);
    expect(validRule({ scope: 2, scope3_category: 1 })).toBe(false);
    expect(validRule({ scope: 1, scope3_category: null })).toBe(true);
  });
});

describe('data-gap flags', () => {
  const f = raiseFlag('b', '2026', 'NO_FACTOR', 'x', '2026-10-12');
  test('severity, owner and due date come from policy', () => {
    expect(f).toMatchObject({ severity: 'High', owner_role: 'FACTOR_STEWARD', due_date: '2026-10-22', status: 'OPEN' });
  });
  test('state machine and segregation of duties', () => {
    expect(transition(f, { to: 'IN_PROGRESS', actor: 'a' }).ok).toBe(true);
    expect(transition(f, { to: 'ACCEPTED_RISK', actor: 'a', note: 'immaterial', approver: 'a' }).ok).toBe(false);
    expect(transition(f, { to: 'ACCEPTED_RISK', actor: 'a', approver: 'b' }).ok).toBe(false);
    expect(transition(f, { to: 'ACCEPTED_RISK', actor: 'a', note: 'immaterial', approver: 'b' }).ok).toBe(true);
    expect(transition(f, { to: 'RESOLVED', actor: 'a' }).ok).toBe(false);
    const done = transition(f, { to: 'RESOLVED', actor: 'a', note: 'factor loaded' }).flag!;
    expect(transition(done, { to: 'OPEN', actor: 'a' }).ok).toBe(false);
  });
  test('superseding run auto-resolves flags that no longer apply', () => {
    const g = raiseFlag('b', '2026', 'MAPPING_PENDING', 'x', '2026-10-12');
    const out = reconcileFlags([f, g], [g], 'run-2');
    expect(out.find(x => x.reason_code === 'NO_FACTOR')?.status).toBe('RESOLVED');
    expect(out.filter(x => x.reason_code === 'MAPPING_PENDING')).toHaveLength(1);
  });
});

describe('pipeline end to end', () => {
  test('reference bill: 100 kL supply x 0.5 kgCO2e/m3 = 50 kgCO2e, Scope 3 Cat 1, full lineage', async () => {
    const r = await runBill(BILL(), SET());
    expect(r.results).toHaveLength(1);
    expect(r.results[0]).toMatchObject({ status: 'CALCULATED', emissions_kgco2e: 50, scope: 3, scope3_category: 1, factor_id: 'in-supply', factor_unit: 'kgCO2e/m3', factor_year: 2025, gwp_basis: 'AR5', factor_source: 'TEST FIXTURE (not a real factor)', mapping_rule_id: 'supply-c1' });
    expect(r.flags).toHaveLength(0);
  });
  test('wastewater is separate and maps to Category 5', async () => {
    const r = await runBill(BILL({ volume_kind: 'WASTEWATER', volume_raw: 80, unit_raw: 'm3' }), SET());
    expect(r.results[0]).toMatchObject({ activity_type: 'WATER_WASTEWATER_TREATMENT', emissions_kgco2e: 80, scope3_category: 5 });
  });
  test('no factor: bill kept, emissions null, High flag', async () => {
    const r = await runBill(BILL({ country_code: 'KE' }), SET());
    expect(r.results[0].emissions_kgco2e).toBeNull();
    expect(r.results[0].allocated_volume_m3).toBe(100);
    expect(r.flags.map(f => [f.reason_code, f.severity])).toEqual([['NO_FACTOR', 'High']]);
  });
  test('combined unsplit volume is never split by assumption', async () => {
    const r = await runBill(BILL({ volume_kind: 'COMBINED_UNSPLIT' }), SET());
    expect(r.results[0].emissions_kgco2e).toBeNull();
    expect(r.flags.map(f => f.reason_code)).toEqual(['COMBINED_UNSPLIT']);
  });
  test('invalid bill gets one INVALID_INPUT row with null volume and emissions', async () => {
    const r = await runBill(BILL({ unit_raw: 'gallon' }), SET());
    expect(r.results).toHaveLength(1);
    expect(r.results[0]).toMatchObject({ status: 'INVALID_INPUT', emissions_kgco2e: null, allocated_volume_m3: null });
  });
  test('cross-year bill: two rows, flagged, summing to the whole', async () => {
    const r = await runBill(BILL({ billing_period_start: '2025-12-17', billing_period_end: '2026-01-15', volume_raw: 30, unit_raw: 'm3' }), SET());
    expect(r.results.map(x => x.allocation_period)).toEqual(['2025', '2026']);
    expect(r.results.reduce((s, x) => s + (x.emissions_kgco2e as number), 0)).toBe(15);
    expect(r.flags.every(f => f.reason_code === 'PERIOD_SPANS_YEARS')).toBe(true);
  });
  test('same inputs give identical output (reproducible)', async () => {
    expect(JSON.stringify(await runBill(BILL(), SET()))).toBe(JSON.stringify(await runBill(BILL(), SET())));
  });
});

describe('versioned recalculation (I7)', () => {
  const stored = async (s = SET()): Promise<StoredResult[]> =>
    (await runBill(BILL(), s)).results.map((r, i) => ({ ...r, id: `old-${i}`, version: 1, supersedes_id: null, is_current: true }));
  test('factor change: dry run shows a diff, applying makes version 2 and keeps version 1', async () => {
    const before = await stored();
    const fresh = (await runBill(BILL(), SET({ factors: [F({ id: 'in-supply', version: 2, value: 0.6 })], calc_run_id: 'run-2' }))).results;
    const plan = planRecalc(before, fresh);
    expect(plan.summary).toMatchObject({ CHANGED: 1 });
    close(plan.entries[0].delta_kgco2e, 10);
    expect(plan.entries[0].changed_fields).toEqual(expect.arrayContaining(['emissions_kgco2e', 'factor_value', 'factor_version']));
    const out = applyPlan(plan, { planned_by: 'p', approved_by: 'q' }, () => 'new-0');
    const hist = applyToHistory(before, out);
    expect(hist).toHaveLength(2);
    expect(hist.find(r => r.id === 'old-0')).toMatchObject({ is_current: false, emissions_kgco2e: 50 });
    expect(hist.find(r => r.id === 'new-0')).toMatchObject({ is_current: true, version: 2, supersedes_id: 'old-0', emissions_kgco2e: 60 });
  });
  test('no change: nothing written; planner cannot approve own plan', async () => {
    const before = await stored();
    const plan = planRecalc(before, (await runBill(BILL(), SET({ calc_run_id: 'run-2' }))).results);
    expect(plan.summary.UNCHANGED).toBe(1);
    expect(applyPlan(plan, { planned_by: 'p', approved_by: 'q' }, () => 'x').inserts).toHaveLength(0);
    expect(applyPlan(plan, { planned_by: 'p', approved_by: 'p' }, () => 'x').ok).toBe(false);
  });
  test('locked period needs a restatement reason', async () => {
    const before = await stored();
    const plan = planRecalc(before, (await runBill(BILL(), SET({ factors: [F({ id: 'in-supply', value: 0.6 })] }))).results, ['2026']);
    expect(plan.locked_changes).toBe(1);
    expect(applyPlan(plan, { planned_by: 'p', approved_by: 'q' }, () => 'x').skipped_locked).toHaveLength(1);
    expect(applyPlan(plan, { planned_by: 'p', approved_by: 'q', restatement_reason: 'factor corrected' }, () => 'x').inserts).toHaveLength(1);
  });
  test('a factor arriving later turns NULL into a number; delta stays null, not 50', async () => {
    const before = await stored(SET({ factors: [] }));
    const plan = planRecalc(before, (await runBill(BILL(), SET())).results);
    expect(plan.entries[0].kind).toBe('CHANGED');
    expect(plan.entries[0].delta_kgco2e).toBeNull();
  });
});

describe('aggregation and completeness (I8)', () => {
  test('reconciles with hand totals, excludes NULL, separates proxy, counts gaps', async () => {
    const s = SET({ factors: [F({ id: 'in', uncertainty: 0.1 }), F({ id: 'gb', geography: 'GB', approved_for_proxy: true, proxy_for_country: 'BD', uncertainty: 0.2 })] });
    const runs = await Promise.all([
      runBill(BILL({ source_document_ref: 'a', volume_raw: 100 }), s),                        // 50 kg, Tier A
      runBill(BILL({ source_document_ref: 'b', volume_raw: 60, country_code: 'BD' }), s),     // 30 kg, proxy
      runBill(BILL({ source_document_ref: 'c', volume_raw: 40, country_code: 'KE' }), s),     // no factor
    ]);
    const results = runs.flatMap(r => r.results), flags = runs.flatMap(r => r.flags);
    const [t] = aggregate(results, flags);
    expect(t).toMatchObject({ period: '2026', bucket: 'S3.C1', included_count: 2, excluded_count: 1, excluded_volume_m3: 40, coverage_pct: 80, verification_status: 'NOT_VERIFIED' });
    close(t.total_kgco2e, 80); close(t.tier_a_kgco2e, 50); close(t.proxy_kgco2e, 30);
    expect(t.estimation_share_pct).toBe(37.5);
    close(t.uncertainty_kgco2e, Math.sqrt(5 ** 2 + 6 ** 2));
    expect(t.open_gaps).toBe(2);
    expect(describeTotal(t)).toBe('Scope 3 Category 1, 2026: 80 kgCO2e, 80% of volume covered, 37.5% from proxy factors, ±7.8 kgCO2e (factor uncertainty only), 2 open gaps, not verified.');
    expect(gapReport(flags, '2026-10-12').map(g => g.reason_code)).toEqual(['NO_FACTOR', 'PROXY_FACTOR_USED']);
  });
  test('all rows missing a factor: total is null ("not quantified"), never 0', async () => {
    const r = await runBill(BILL(), SET({ factors: [] }));
    const [t] = aggregate(r.results, r.flags);
    expect(t.total_kgco2e).toBeNull();
    expect(describeTotal(t)).toContain('not quantified');
  });
  test('unmapped rows stay out of scope totals', async () => {
    const r = await runBill(BILL(), SET({ rules: [] }));
    expect(aggregate(r.results)[0].bucket).toBe('UNMAPPED');
  });
  test('water volumes in m³, supply and wastewater apart, even without factors', async () => {
    const a = await runBill(BILL({ source_document_ref: 'a' }), SET({ factors: [] }));
    const b = await runBill(BILL({ source_document_ref: 'b', volume_kind: 'WASTEWATER', volume_raw: 5000, unit_raw: 'L' }), SET({ factors: [] }));
    const kinds = new Map([[a.water_bill_key, 'SUPPLY' as const], [b.water_bill_key, 'WASTEWATER' as const]]);
    expect(waterVolumes([...a.results, ...b.results], k => kinds.get(k)!)).toEqual([{ period: '2026', supply_m3: 100, wastewater_m3: 5, combined_unsplit_m3: 0, unreadable_bills: 0 }]);
  });
});

describe('properties over random bills (seeded)', () => {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  test('500 bills: no zero for a missing factor, allocations sum, totals reconcile', async () => {
    const all = [];
    for (let i = 0; i < 500; i++) {
      const y = 2024 + Math.floor(rnd() * 3), m = 1 + Math.floor(rnd() * 12), len = Math.floor(rnd() * 120);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const end = new Date(Date.parse(start) + len * 86_400_000).toISOString().slice(0, 10);
      const bill = BILL({
        source_document_ref: `d${i}`, billing_period_start: start, billing_period_end: end,
        volume_raw: pick([0, 1, 12.5, 999, null, -3]), unit_raw: pick(['kL', 'm3', 'L', 'US gal', 'gallon', null]),
        volume_kind: pick(['SUPPLY', 'WASTEWATER', 'COMBINED_UNSPLIT'] as const), country_code: pick(['IN', 'KE', null]),
        reading_type: pick(['ACTUAL', 'ESTIMATED_BY_UTILITY'] as const),
      });
      const s = SET({ period_basis: pick(['CALENDAR', 'INDIA_FY'] as const) });
      const r = await runBill(bill, s);
      for (const x of r.results) {
        if (x.factor_id === null) expect(x.emissions_kgco2e).toBeNull();
        if (x.emissions_kgco2e !== null) close(x.emissions_kgco2e, (x.allocated_volume_m3 as number) * (x.factor_value as number));
        if (x.status === 'UNAVAILABLE_FACTOR_PENDING' || x.status === 'INVALID_INPUT') expect(r.flags.some(f => f.severity === 'High' || f.reason_code === 'COMBINED_UNSPLIT')).toBe(true);
      }
      if (r.validation.ok) close(r.results.reduce((s2, x) => s2 + (x.allocated_volume_m3 as number), 0), r.validation.volume_m3 as number);
      all.push(...r.results);
    }
    const sumByHand = all.filter(x => x.emissions_kgco2e !== null).reduce((s, x) => s + (x.emissions_kgco2e as number), 0);
    const sumAgg = aggregate(all).reduce((s, t) => s + (t.total_kgco2e ?? 0), 0);
    expect(Math.abs(sumByHand - sumAgg)).toBeLessThan(1e-6);
  });
});

describe('static guards', () => {
  const dir = 'supabase/functions/_shared/water';
  test('no source file writes a literal 0 into emissions', () => {
    for (const f of readdirSync(dir)) expect(readFileSync(`${dir}/${f}`, 'utf8')).not.toMatch(/emissions_kgco2e\s*[:=]\s*0(?![.\d])/);
  });
  test('no aggregation coalesces NULL emissions to 0', () => {
    expect(readFileSync(`${dir}/aggregate.ts`, 'utf8')).not.toMatch(/emissions_kgco2e\s*\?\?\s*0/);
  });
  test('no compliance claim in code or migration', () => {
    const texts = [...readdirSync(dir).map(f => readFileSync(`${dir}/${f}`, 'utf8'))];
    for (const t of texts) expect(t).not.toMatch(/\b(CSRD|ESRS|ISSB)[- ]compliant/i);
  });
});

describe('contract with the pending migration', () => {
  const sql = readFileSync('supabase/migrations/20261012120000_water_mrv.sql', 'utf8');
  test('every result field the SQL reads is produced by the pipeline', async () => {
    const r = (await runBill(BILL(), SET())).results[0] as unknown as Record<string, unknown>;
    const read = [...sql.matchAll(/\br->>'([a-z0-9_]+)'/g)].map(m => m[1]).filter(k => k !== 'water_bill_id' && k !== 'supersedes_id');
    for (const k of new Set(read)) expect(Object.keys(r)).toContain(k);
  });
  test('every flag field the SQL reads is produced by raiseFlag', () => {
    const f = raiseFlag('b', '2026', 'NO_FACTOR', 'x', '2026-10-12') as unknown as Record<string, unknown>;
    const read = [...sql.matchAll(/\bf->>'([a-z0-9_]+)'/g)].map(m => m[1]).filter(k => k !== 'water_bill_id');
    for (const k of new Set(read)) expect(Object.keys(f)).toContain(k);
  });
  test('the switch ships off and the factor and mapping tables ship empty', () => {
    expect(sql).toMatch(/INSERT INTO public\.water_mrv_settings \(id, enabled\) VALUES \(true, false\)/);
    expect(sql).not.toMatch(/INSERT INTO public\.water_emission_factor/);
    expect(sql).not.toMatch(/INSERT INTO public\.water_category_mapping_rule/);
  });
});
