import { describe, expect, test } from 'bun:test';
import { FUEL_FACTORS, isPublishedFactor, publishedFactorFor, calculateEmissions } from '../supabase/functions/_shared/emissionFactors';

// CNG is natural gas sold by mass: IPCC 2006 V2 Tables 1.2/1.4 give
// 56,100 kgCO2/TJ x 48.0 TJ/Gg = 2.693 kgCO2/kg, the basis PNG already uses.
describe('CNG factor correction', () => {
  test('CNG uses the IPCC natural gas value per kg', () => {
    expect(FUEL_FACTORS.CNG.value).toBe(2.69);
    expect(Math.abs(56100 * 48.0 / 1e6 - FUEL_FACTORS.CNG.value)).toBeLessThan(0.005);
  });
  test('new CNG lines are calculated at 2.69', () => {
    const r = calculateEmissions(100, 'kg', 1, 'FUEL', 'CNG', { gridCountry: 'IN' });
    expect(r && r.kind === 'emission' ? r.co2Kg : null).toBeCloseTo(269, 6);
  });
  test('rows saved at the earlier 2.75 still verify; anything else does not', () => {
    const source = (calculateEmissions(1, 'kg', 1, 'FUEL', 'CNG', { gridCountry: 'IN' }) as { factorSource: string }).factorSource;
    expect(publishedFactorFor(source)).toBe(2.69);
    expect(isPublishedFactor(source, 2.69)).toBe(true);
    expect(isPublishedFactor(source, 2.75)).toBe(true);
    expect(isPublishedFactor(source, 2.8)).toBe(false);
  });
  test('other fuels have no earlier values', () => {
    const source = (calculateEmissions(1, 'litre', 1, 'FUEL', 'DIESEL', { gridCountry: 'IN' }) as { factorSource: string }).factorSource;
    expect(isPublishedFactor(source, 2.645)).toBe(true);
    expect(isPublishedFactor(source, 2.68)).toBe(false);
    expect(isPublishedFactor(source, 2.75)).toBe(false);
  });
});
