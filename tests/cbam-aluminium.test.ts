import { expect, test } from 'bun:test';
import { CBAM_SECTORS, calculateCBAM } from '../src/lib/cbamEngine';

// Aluminium is charged on direct emissions only; defaults are the India values
// per product form from Implementing Regulation (EU) 2025/2621.
test('aluminium uses direct-emission India defaults by product', () => {
  const al = CBAM_SECTORS.find(s => s.id === 'aluminium')!;
  expect(al.defaultIntensity).toBe(1.87);
  expect(al.productionRoutes.map(r => r.defaultIntensity)).toEqual([1.87, 2.594, 3.413, 4.126]);
  const r = calculateCBAM({ sectorId: 'aluminium', productionRouteId: 'unwrought', countryCode: 'IN', supplierName: '', tonnage: 1, actualEmissionsIntensity: null, carbonPricePaid: null, euEtsPrice: 82.32 });
  const y2026 = r.yearlyResults.find(y => y.year === 2026)!.costPerTonne;
  // (1.87 x 1.10 - 1.423 x 0.975) x 82.32 = 55.12 (Column B (K) benchmark for CN 7601)
  expect(Math.round(y2026 * 100) / 100).toBeCloseTo(55.12, 1);
  expect(y2026).toBeLessThan(100);
});
