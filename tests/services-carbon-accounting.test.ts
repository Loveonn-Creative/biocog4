import { describe, expect, test } from 'bun:test';
import { annualFootprint, scope3Hotspots } from '../src/components/services/carbon-accounting/logic';

describe('carbon accounting tool', () => {
  test('annual Scope 1 and 2 from monthly bills x shared factors', () => {
    const r = annualFootprint({ kwhPerMonth: 1000, dieselLPerMonth: 100, lpgKgPerMonth: 0 });
    expect(Math.round(r.s2)).toBe(8100);   // 12,000 kWh x 0.675
    expect(Math.round(r.s1)).toBe(3174);   // 1,200 L x 2.645
  });
  test('hotspots depend on sector', () => {
    expect(scope3Hotspots('it_services')).toEqual([1, 6, 7]);
    expect(scope3Hotspots('textiles')[0]).toBe(1);
  });
});
