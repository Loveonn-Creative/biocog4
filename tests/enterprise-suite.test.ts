import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { suiteModules, ingestionChannels } from '../src/data/enterpriseCapabilities';
import { serviceNav } from '../src/data/services/nav';
import { calculateCBAM, DEFAULT_EU_ETS_PRICE } from '../src/lib/cbamEngine';

const app = readFileSync('src/App.tsx', 'utf8');
const routeExists = (to: string) =>
  app.includes(`path="${to}"`) || serviceNav.some(s => `/${s.slug}` === to);

describe('/enterprise suite claims stay honest', () => {
  test('every suite module has a status, a note and a real destination', () => {
    expect(suiteModules.map(m => m.key)).toEqual(['scope3', 'pcf', 'lca', 'decarb', 'dma', 'reporting']);
    for (const m of suiteModules) {
      expect(['live', 'pilot', 'custom']).toContain(m.status);
      expect(m.note && m.input && m.output).toBeTruthy();
      expect(routeExists(m.to)).toBe(true);
    }
  });

  test('analyst-led work is labelled custom, never live', () => {
    const status = Object.fromEntries(suiteModules.map(m => [m.key, m.status]));
    expect(status.lca).toBe('custom');
    expect(status.dma).toBe('custom');
  });

  test('sensors, satellite mapping and live feeds are labelled custom', () => {
    const status = Object.fromEntries(ingestionChannels.map(c => [c.key, c.status]));
    expect([status.iot, status.satellite, status.livefeed]).toEqual(['custom', 'custom', 'custom']);
  });

  test('pilot figures match the ones published on /platform', () => {
    const platform = readFileSync('src/pages/Platform.tsx', 'utf8');
    const proof = readFileSync('src/components/enterprise/suite/BenchmarkProof.tsx', 'utf8');
    expect(platform).toContain('piloted across 29 clusters and 11 countries, with 92% benchmarking accuracy');
    expect(proof).toContain('piloted across 29 clusters and 11 countries, with 92% benchmarking accuracy');
    // The drawing has exactly 29 cluster dots in 11 groups.
    const groups = JSON.parse(proof.match(/const GROUPS = (\[[^\]]+\])/)![1]);
    expect(groups.length).toBe(11);
    expect(groups.reduce((a: number, b: number) => a + b, 0)).toBe(29);
  });

  test('liability to profit uses the CBAM engine: verified data below the default lowers the cost', () => {
    const base = { sectorId: 'steel', productionRouteId: 'bf-bof', countryCode: 'IN', supplierName: '', tonnage: 5000, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE };
    const y = (r: ReturnType<typeof calculateCBAM>) => r.yearlyResults.find(x => x.year === 2030)!.netCbamCost;
    const def = y(calculateCBAM({ ...base, actualEmissionsIntensity: null }));
    const act = y(calculateCBAM({ ...base, actualEmissionsIntensity: 1.9 }));
    expect(def).toBeGreaterThan(act);
    expect(act).toBeGreaterThan(0);
  });
});
