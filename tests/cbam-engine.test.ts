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
    // Actual data on the BF-BOF route: Column B benchmark (C) for hot-rolled
    // flat steel is 1.37 (Commission benchmarks file).
    // 2,100 t embedded − 1.37 × 1,000 × 97.5% free allocation = 764.25 t liable
    expect(y2026.netLiableEmissions).toBeCloseTo(764.25, 1);
    expect(y2026.netCbamCost).toBe(61140);
    const y2034 = r.yearlyResults[8];
    expect(y2034.netCbamCost).toBe(168000);
  });

  test('applies default-value mark-ups by year and sector', () => {
    expect(defaultValueMarkup('steel', 2026)).toBe(0.10);
    expect(defaultValueMarkup('steel', 2027)).toBe(0.20);
    expect(defaultValueMarkup('cement', 2030)).toBe(0.30);
    expect(defaultValueMarkup('fertilizers', 2028)).toBe(0.01);
    const r = calculateCBAM({ ...base, actualEmissionsIntensity: null });
    // Commission India default for hot-rolled flat steel (CN 7208) is 4.28:
    // 4.28 × 1.1 = 4.708 tCO2/t → 4,708 − 1,335.75 = 3,372.25 t liable × €80
    expect(r.yearlyResults[0].netCbamCost).toBe(269780);
  });

  test('deducts carbon price paid abroad, never below zero', () => {
    const r = calculateCBAM({ ...base, actualEmissionsIntensity: 2.1, carbonPricePaid: 200 });
    expect(r.yearlyResults[0].netCbamCost).toBe(0);
  });
});
