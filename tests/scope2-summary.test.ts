import { describe, expect, test } from 'bun:test';
import { summariseScope2 } from '../src/lib/scope2Summary';
import { countryCodeFromLocation, getCountryConfig, gridFactorUnit } from '../src/lib/countryConfig';
import { INDIA_GRID_FACTOR_KG_PER_KWH } from '../src/lib/factors';

describe('Scope 2 dual reporting summary', () => {
  const s = summariseScope2({
    totals: [
      { reporting_year: 'FY2025-26', method: 'location', kwh: 1000, kg: 710, unresolved_kwh: null, instrument_kwh: 0 },
      { reporting_year: 'FY2025-26', method: 'market', kwh: 1000, kg: 355, unresolved_kwh: null, instrument_kwh: 500 },
      { reporting_year: 'FY2026-27', method: 'location', kwh: 200, kg: null, unresolved_kwh: 200, instrument_kwh: 0 },
    ],
    calculations: [{ warnings: ['residual_mix_unavailable', 'co2_only'] }, { warnings: ['co2_only'] }],
    activities: [{ status: 'valid', reasons: [] }, { status: 'needs_data', reasons: ['net_metered', 'missing_period'] }, { status: 'needs_data', reasons: ['net_metered'] }],
    instruments: [{ id: 'a', type: 'eac', scheme: 'I-REC', certificate_ref: 'X-1', mwh: '0.5', generation_country: 'IN', vintage_start: '2025-04-01', vintage_end: '2025-12-31', kg_per_kwh: 0, retired: true, beneficiary_confirmed: true, evidence_document_id: 'd' }],
    allocations: [{ instrument_id: 'a', kwh: 300 }, { instrument_id: 'a', kwh: 200 }],
  });
  test('years newest first, both methods side by side', () => {
    expect(s.years.map((y) => y.year)).toEqual(['FY2026-27', 'FY2025-26']);
    expect(s.years[1].location?.kg).toBe(710);
    expect(s.years[1].market).toMatchObject({ kg: 355, instrumentKwh: 500 });
  });
  test('a year with no approved factor stays not calculated, never zero', () => {
    expect(s.years[0].location).toMatchObject({ kg: null, unresolvedKwh: 200 });
    expect(s.years[0].market).toBeNull();
  });
  test('disclosures once each; needs-data counted by reason', () => {
    expect(s.warnings).toEqual(['co2_only', 'residual_mix_unavailable']);
    expect(s.needsData).toEqual([{ reason: 'net_metered', count: 2 }, { reason: 'missing_period', count: 1 }]);
  });
  test('instrument shows the kWh actually applied', () => {
    expect(s.instruments[0]).toMatchObject({ mwh: 0.5, allocatedKwh: 500, hasEvidence: true });
  });
});

describe('country of the account', () => {
  test('saved names map in any case; unset means India, as Settings shows', () => {
    expect(countryCodeFromLocation('United States')).toBe('US');
    expect(countryCodeFromLocation('germany')).toBe('DE');
    expect(countryCodeFromLocation('GB')).toBe('GB');
    expect(countryCodeFromLocation(null)).toBe('IN');
    expect(countryCodeFromLocation('India')).toBe('IN');
  });
  test('India shows the factor calculations use, in CO2', () => {
    expect(getCountryConfig('India').gridFactor).toBe(INDIA_GRID_FACTOR_KG_PER_KWH);
    expect(gridFactorUnit('IN')).toBe('kgCO₂/kWh');
  });
});
