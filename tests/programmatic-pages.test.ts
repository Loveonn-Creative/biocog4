import { describe, expect, test } from 'bun:test';
import { FACTOR_PAGES, factorAnswer, factorKg, factorMeta } from '../src/data/factorLibrary';
import { CBAM_SECTOR_COSTS, CBAM_SECTOR_PAGES, SECTOR_OWNER_PAGE, cbamSectorMeta, sectorHref } from '../src/data/cbamSectorCosts';
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '../src/lib/factors';
import { calculateCBAM, DEFAULT_EU_ETS_PRICE } from '../src/lib/cbamEngine';

describe('emission factor pages', () => {
  test('every factor shown equals the factor the pipeline applies', () => {
    const live: Record<string, number> = { diesel: FUEL_FACTORS.DIESEL.value, petrol: FUEL_FACTORS.PETROL.value, lpg: FUEL_FACTORS.LPG.value, cng: FUEL_FACTORS.CNG.value, png: FUEL_FACTORS.PNG.value, coal: FUEL_FACTORS.COAL.value, 'furnace-oil': FUEL_FACTORS.FURNACE_OIL.value, naphtha: FUEL_FACTORS.NAPHTHA.value, kerosene: FUEL_FACTORS.KEROSENE.value, 'grid-electricity': INDIA_GRID_FACTOR_KG_PER_KWH };
    expect(FACTOR_PAGES.map(f => f.slug).sort()).toEqual(Object.keys(live).sort());
    for (const f of FACTOR_PAGES) expect(f.value).toBe(live[f.slug]);
  });
  test('worked example and answer agree', () => {
    const d = FACTOR_PAGES.find(f => f.slug === 'diesel')!;
    expect(factorKg(d, 500)).toBe(1340);
    expect(factorAnswer(d)).toContain('1,340 kg CO2');
  });
  test('titles fit the 60 character limit and are unique', () => {
    const titles = FACTOR_PAGES.map(f => factorMeta(f).title);
    for (const t of titles) expect(t.length).toBeLessThanOrEqual(60);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe('CBAM cost pages', () => {
  test('per-tonne cost equals the calculator for 1,000 t', () => {
    for (const s of CBAM_SECTOR_COSTS) for (const r of s.routes) {
      const res = calculateCBAM({ sectorId: s.sector.id, productionRouteId: r.routeId, countryCode: 'IN', supplierName: '', tonnage: 1000, actualEmissionsIntensity: null, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE });
      for (const y of res.yearlyResults) expect(Math.abs(r.perTonne[y.year] - y.netCbamCost / 1000)).toBeLessThan(0.01);
    }
  });
  test('electricity is not published and steel defers to its existing guide', () => {
    expect(CBAM_SECTOR_COSTS.some(s => s.sector.id === 'electricity')).toBe(false);
    expect(CBAM_SECTOR_PAGES.some(s => s.sector.id === 'steel')).toBe(false);
    expect(sectorHref('steel')).toBe(SECTOR_OWNER_PAGE.steel);
  });
  test('titles fit the limit', () => {
    for (const s of CBAM_SECTOR_PAGES) expect(cbamSectorMeta(s).title.length).toBeLessThanOrEqual(60);
  });
});

describe('CBAM worked example in the Answers hub', () => {
  test('the €27,760 example equals the calculator', async () => {
    const { answers } = await import('../src/data/answers');
    const a = answers.find(x => x.slug === 'how-to-calculate-cbam-cost')!;
    const res = calculateCBAM({ sectorId: 'steel', productionRouteId: 'bf-bof', countryCode: 'IN', supplierName: '', tonnage: 100, actualEmissionsIntensity: null, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE });
    const y = res.yearlyResults.find(r => r.year === 2026)!;
    expect(y.totalEmissions).toBe(470.8);
    expect(y.freeAllowances).toBe(133.57);
    expect(y.netLiableEmissions).toBe(337.23);
    expect(Math.round(y.netCbamCost)).toBe(27760);
    expect(DEFAULT_EU_ETS_PRICE).toBe(82.32);
    expect(a.short).toContain('€27,760');
    expect(a.body.join(' ')).toContain('337.23 t × €82.32 = €27,760');
  });
});
