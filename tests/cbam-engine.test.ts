import { describe, expect, test } from 'bun:test';
import { calculateCBAM, defaultValueMarkup } from '../src/lib/cbamEngine';

const base = {
  sectorId: 'steel', productionRouteId: 'bf-bof', countryCode: 'IN', supplierName: 'Test',
  tonnage: 1000, carbonPricePaid: null, euEtsPrice: 80,
};

describe('CBAM engine', () => {
  test('charges every tonne above the free-allocation adjustment, without a second phase-in', () => {
    const r = calculateCBAM({ ...base, actualEmissionsIntensity: 2.1 });
    const y2026 = r.yearlyResults[0];
    // 2,100 t embedded − 1.52 × 1,000 × 97.5% free allocation = 618 t liable
    expect(y2026.netLiableEmissions).toBeCloseTo(618, 1);
    expect(y2026.netCbamCost).toBe(49440);
    const y2034 = r.yearlyResults[8];
    expect(y2034.netCbamCost).toBe(168000);
  });

  test('applies default-value mark-ups by year and sector', () => {
    expect(defaultValueMarkup('steel', 2026)).toBe(0.10);
    expect(defaultValueMarkup('steel', 2027)).toBe(0.20);
    expect(defaultValueMarkup('cement', 2030)).toBe(0.30);
    expect(defaultValueMarkup('fertilizers', 2028)).toBe(0.01);
    const r = calculateCBAM({ ...base, actualEmissionsIntensity: null });
    // 2.1 × 1.1 = 2.31 tCO2/t → 2,310 − 1,482 = 828 t liable × €80
    expect(r.yearlyResults[0].netCbamCost).toBe(66240);
  });

  test('deducts carbon price paid abroad, never below zero', () => {
    const r = calculateCBAM({ ...base, actualEmissionsIntensity: 2.1, carbonPricePaid: 200 });
    expect(r.yearlyResults[0].netCbamCost).toBe(0);
  });
});
