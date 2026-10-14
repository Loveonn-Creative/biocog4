import { describe, expect, test } from 'bun:test';
import {
  allocate, calculateLocation, calculateMarket, checkInstrument, KINDS_FOR, pickFactor, reportingYearOf, splitByReportingYear, toKwh,
  type ActivityPortion, type ElectricityFactor, type Instrument,
} from '../supabase/functions/_shared/electricity';

// Placeholder factors for arithmetic tests only; real factors come from the
// approved registry with their source and edition.
const F = (p: Partial<ElectricityFactor>): ElectricityFactor => ({
  id: 'f', factorKey: 'TEST_IN_GRID', version: '1', kind: 'grid_average', country: 'IN', gridRegion: null, supplierRef: null,
  kgPerKwh: 0.7, gases: 'CO2', validFrom: '2025-04-01', validTo: '2026-03-31', sourceName: 'Test', sourceRef: 'T', publicationYear: 2025, ...p,
});
const P = (p: Partial<ActivityPortion> = {}): ActivityPortion => ({
  activityId: 'a1', country: 'IN', gridRegion: null, supplierRef: null, reportingYear: 'FY2025-26', periodStart: '2025-06-01', periodEnd: '2025-06-30', kwh: 1000, ...p,
});
const REC = (p: Partial<Instrument> = {}): Instrument => ({
  id: 'i1', type: 'eac', scheme: 'I-REC', certificateRef: 'IREC-0001-0400', mwh: 0.4, generationCountry: 'IN', generationRegion: null,
  vintageStart: '2025-05-01', vintageEnd: '2025-05-31', kgPerKwh: 0, retired: true, retirementRef: 'RET-1', evidenceDocumentId: 'doc', beneficiaryConfirmed: true, ...p,
});

describe('units', () => {
  test('energy converts; apparent, reactive and power units are refused', () => {
    expect(toKwh(2, 'MWh')).toMatchObject({ kwh: 2000 });
    expect(toKwh(1.5, 'GWh')).toMatchObject({ kwh: 1_500_000 });
    expect(toKwh(500, 'kilowatt hours')).toMatchObject({ kwh: 500 });
    expect(toKwh(500, 'kVAh')).toMatchObject({ kwh: null, reason: 'apparent_or_reactive_energy' });
    expect(toKwh(500, 'kvarh')).toMatchObject({ kwh: null, reason: 'apparent_or_reactive_energy' });
    expect(toKwh(50, 'kVA')).toMatchObject({ kwh: null, reason: 'power_not_energy' });
    expect(toKwh(342, 'units')).toMatchObject({ kwh: null, reason: 'unknown_unit' });
    expect(toKwh(342, 'units', { unitsMeanKwh: true })).toMatchObject({ kwh: 342 });
    expect(toKwh(0, 'kWh')).toMatchObject({ kwh: null, reason: 'missing_quantity' });
  });
});

describe('reporting years', () => {
  test('India by April-March fiscal year, others by calendar year', () => {
    expect(reportingYearOf('2026-03-31', 4)).toBe('FY2025-26');
    expect(reportingYearOf('2026-04-01', 4)).toBe('FY2026-27');
    expect(reportingYearOf('2026-04-01', 1)).toBe('2026');
  });
  test('a bill across 31 March is split by days, kWh conserved', () => {
    const s = splitByReportingYear(610, '2026-03-17', '2026-04-15', 4);
    expect(s.map((x) => [x.reportingYear, x.days])).toEqual([['FY2025-26', 15], ['FY2026-27', 15]]);
    expect(s[0].kwh + s[1].kwh).toBe(610);
    expect(s[0].kwh).toBe(305);
  });
});

describe('factor selection', () => {
  test('a combined-margin factor is never used for a Scope 2 inventory', () => {
    const cm = F({ id: 'cm', factorKey: 'CEA_CM', kind: 'project_combined_margin' });
    expect(KINDS_FOR.scope2_location).not.toContain('project_combined_margin');
    expect(KINDS_FOR.scope2_market).not.toContain('project_combined_margin');
    expect(calculateLocation(P(), [cm])).toMatchObject({ status: 'unresolved', reasons: ['no_factor'] });
    expect(pickFactor('project_combined_margin', 'scope2_location', P(), [cm])).toMatchObject({ factor: null, reason: 'kind_not_allowed' });
    expect(pickFactor('project_combined_margin', 'project_baseline', P(), [cm])).toMatchObject({ factor: { id: 'cm' } });
  });
  test('region before country, the period\'s own vintage before a prior one, never a later one or another country', () => {
    const nat = F({ id: 'nat' }), reg = F({ id: 'reg', factorKey: 'TEST_REGION', gridRegion: 'SRSO' });
    expect(pickFactor('grid_average', 'scope2_location', P({ gridRegion: 'SRSO' }), [nat, reg])).toMatchObject({ factor: { id: 'reg' }, tier: 'region' });
    expect(pickFactor('grid_average', 'scope2_location', P({ gridRegion: 'XX' }), [nat, reg])).toMatchObject({ factor: { id: 'nat' }, tier: 'national' });
    const older = F({ id: 'old', validFrom: '2024-04-01', validTo: '2025-03-31' });
    expect(pickFactor('grid_average', 'scope2_location', P({ periodStart: '2026-05-01', periodEnd: '2026-05-31', reportingYear: 'FY2026-27' }), [older, nat])).toMatchObject({ factor: { id: 'nat' }, vintage: 'prior_vintage' });
    expect(pickFactor('grid_average', 'scope2_location', P({ periodStart: '2024-05-01', periodEnd: '2024-05-31' }), [nat])).toMatchObject({ factor: null });
    expect(pickFactor('grid_average', 'scope2_location', P({ country: 'PH' }), [nat])).toMatchObject({ factor: null, reason: 'no_factor' });
  });
});

describe('location-based', () => {
  test('kWh x grid average, with formula; CO2-only flagged', () => {
    const r = calculateLocation(P(), [F({})]);
    expect(r).toMatchObject({ status: 'calculated', kg: 700, warnings: ['co2_only'] });
    expect(r.formula).toBe('1000 kWh x 0.7 kgCO2/kWh (TEST_IN_GRID v1) = 700 kgCO2');
  });
  test('no factor: unresolved, never zero', () => {
    expect(calculateLocation(P({ country: 'PH' }), [F({})])).toMatchObject({ status: 'unresolved', kg: null });
  });
});

describe('market-based instruments', () => {
  test('eligibility: retired, own name, same market, vintage in the reporting year, evidence', () => {
    const c = { country: 'IN', reportingYear: 'FY2025-26', startMonth: 4 };
    expect(checkInstrument(REC(), c)).toEqual({ eligible: true, reasons: [] });
    expect(checkInstrument(REC({ retired: false }), c).reasons).toContain('not_retired');
    expect(checkInstrument(REC({ generationCountry: 'BD' }), c).reasons).toContain('outside_market_boundary');
    expect(checkInstrument(REC({ vintageStart: '2023-01-01', vintageEnd: '2023-12-31' }), c).reasons).toContain('vintage_outside_reporting_year');
    expect(checkInstrument(REC({ evidenceDocumentId: null }), c).reasons).toContain('no_evidence_document');
    expect(checkInstrument(REC({ beneficiaryConfirmed: false }), c).reasons).toContain('beneficiary_not_confirmed');
    expect(checkInstrument(REC({ generationCountry: 'DE' }), { country: 'FR', reportingYear: '2025', startMonth: 1 }).eligible).toBe(true);
  });
  test('allocation never exceeds the instrument or the consumption, and respects earlier allocations', () => {
    const portions = [P({ activityId: 'a1', kwh: 300 }), P({ activityId: 'a2', periodStart: '2025-07-01', periodEnd: '2025-07-31', kwh: 300 })];
    const { allocations } = allocate(portions, [REC()], [], () => 4);
    expect(allocations).toEqual([
      { instrumentId: 'i1', activityId: 'a1', reportingYear: 'FY2025-26', kwh: 300 },
      { instrumentId: 'i1', activityId: 'a2', reportingYear: 'FY2025-26', kwh: 100 },
    ]);
    const again = allocate(portions, [REC()], [{ instrumentId: 'i1', activityId: 'other', reportingYear: 'FY2025-26', kwh: 350 }], () => 4);
    expect(again.allocations.reduce((a, x) => a + x.kwh, 0)).toBe(50);
  });
  test('ineligible instruments are reported, not allocated', () => {
    const r = allocate([P()], [REC({ retired: false })], [], () => 4);
    expect(r.allocations).toEqual([]);
    expect(r.rejected[0].reasons).toContain('not_retired');
  });
  test('partial coverage: instruments at their rate, residual mix for the rest', () => {
    const residual = F({ id: 'rm', factorKey: 'TEST_RESIDUAL', kind: 'residual_mix', kgPerKwh: 0.8, gases: 'CO2e' });
    const allocs = [{ instrumentId: 'i1', activityId: 'a1', reportingYear: 'FY2025-26', kwh: 400 }];
    const r = calculateMarket(P(), allocs, [REC()], [residual, F({})]);
    expect(r).toMatchObject({ status: 'calculated', instrumentKwh: 400, instrumentKg: 0, kg: 480 });
  });
  test('no residual mix: grid average used and disclosed; nothing at all: unresolved', () => {
    const r = calculateMarket(P(), [], [], [F({})]);
    expect(r).toMatchObject({ status: 'calculated_with_warning', kg: 700 });
    expect(r.warnings).toContain('residual_mix_unavailable');
    expect(calculateMarket(P(), [], [], [])).toMatchObject({ status: 'unresolved', kg: null });
  });
  test('a supplier-specific rate applies only to that supplier', () => {
    const sup = F({ id: 'sup', factorKey: 'TEST_SUPPLIER', kind: 'supplier_specific', supplierRef: 'DISCOM-1', kgPerKwh: 0.5, gases: 'CO2e' });
    expect(calculateMarket(P({ supplierRef: 'DISCOM-1' }), [], [], [sup, F({})])).toMatchObject({ kg: 500, status: 'calculated' });
    expect(calculateMarket(P({ supplierRef: 'DISCOM-2' }), [], [], [sup, F({})]).warnings).toContain('residual_mix_unavailable');
  });
  test('fully covered by renewable certificates: zero market-based, location-based unchanged', () => {
    const allocs = [{ instrumentId: 'i1', activityId: 'a1', reportingYear: 'FY2025-26', kwh: 1000 }];
    expect(calculateMarket(P(), allocs, [REC({ mwh: 1 })], []).kg).toBe(0);
    expect(calculateLocation(P(), [F({})]).kg).toBe(700);
  });
});

import { activitiesFromBill, countryFromLocation } from '../supabase/functions/_shared/electricity';
describe('consumption from a bill', () => {
  const base = { vendor: 'BESCOM', currency: 'INR', billingPeriodStart: '2025-06-01', billingPeriodEnd: '2025-06-30' };
  test('country: profile first, then clear signs on the bill, never a default', () => {
    expect(countryFromLocation('United States')).toBe('US');
    expect(countryFromLocation('Atlantis')).toBeNull();
    expect(activitiesFromBill({ ...base, unitsConsumedKwh: 342 }, 'Germany')[0]).toMatchObject({ country: 'DE', countrySource: 'profile' });
    expect(activitiesFromBill({ ...base, unitsConsumedKwh: 342 }, null)[0]).toMatchObject({ country: 'IN', countrySource: 'bill' });
    expect(activitiesFromBill({ ...base, vendor: 'City Power', currency: 'USD', unitsConsumedKwh: 342 }, null)[0]).toMatchObject({ country: null, status: 'needs_data', reasons: ['no_country'] });
  });
  test('printed billed units become one valid activity', () => {
    expect(activitiesFromBill({ ...base, unitsConsumedKwh: '1,342', unitsConsumedText: 'Units Consumed: 1,342' }, 'India')).toMatchObject([{ lineKey: 'billed', kwh: 1342, status: 'valid' }]);
  });
  test('kVAh billing and net units are not guessed', () => {
    expect(activitiesFromBill({ ...base, unitsConsumedKwh: 1200, unitsConsumedText: 'Billed kVAh 1200' }, 'India')[0].reasons).toContain('apparent_or_reactive_energy');
    expect(activitiesFromBill({ ...base, unitsConsumedKwh: 300, unitsConsumedText: 'Net Units 300' }, 'India')[0].reasons).toContain('net_metered');
  });
  test('no billing period: Needs Data', () => {
    expect(activitiesFromBill({ ...base, billingPeriodStart: null, unitsConsumedKwh: 342 }, 'India')[0].reasons).toEqual(['missing_period']);
  });
  test('separate readings each count once; three meters of 100/200/300 are not collapsed into 300', () => {
    const lines = [{ description: 'Meter A consumption', quantity: 100, unit: 'kWh' }, { description: 'Meter B consumption', quantity: 200, unit: 'kWh' }, { description: 'Meter C consumption', quantity: 300, unit: 'kWh' }];
    expect(activitiesFromBill({ ...base, lineItems: lines }, 'India').map((a) => a.reasons)).toEqual([['ambiguous_consumption']]);
    const labelled = [{ description: 'Slab 0-100 energy', quantity: 100, unit: 'units' }, { description: 'Slab 101-300 energy', quantity: 200, unit: 'units' }, { description: 'Total units consumed', quantity: 300, unit: 'units' }];
    expect(activitiesFromBill({ ...base, lineItems: labelled }, 'India')).toMatchObject([{ kwh: 300, status: 'valid' }]);
    const twoMeters = [{ description: 'Meter A energy', quantity: 1000, unit: 'kWh' }, { description: 'Meter B energy', quantity: 1004, unit: 'kWh' }];
    expect(activitiesFromBill({ ...base, lineItems: twoMeters }, 'India').map((a) => a.kwh)).toEqual([1000, 1004]);
  });
});
