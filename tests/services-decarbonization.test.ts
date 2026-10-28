import { describe, expect, test } from 'bun:test';
import { baselineTonnes, pathway, pathwayHeadline, solarAvoidedT, SBTI_ANNUAL_RATE } from '../src/components/services/decarbonization/logic';

describe('decarbonisation pathway', () => {
  test('baseline from monthly bills x shared factors', () => {
    const b = baselineTonnes({ kwhPerMonth: 1000, dieselLPerMonth: 100 });
    expect(b.grid).toBeCloseTo(8.52, 5);    // 12,000 kWh x 0.710 kg
    expect(b.diesel).toBeCloseTo(3.174, 5); // 1,200 L x 2.645 kg
    expect(b.total).toBeCloseTo(11.694, 5);
  });
  test('known annual total leaves grid and diesel unknown', () => {
    expect(baselineTonnes({ kwhPerMonth: 0, dieselLPerMonth: 0, knownT: 150 })).toEqual({ total: 150, grid: null, diesel: null });
  });
  test('SBTi linear 4.2% a year from the base year', () => {
    expect(SBTI_ANNUAL_RATE).toBe(0.042);
    const p = pathway({ baseline: { total: 150, grid: null, diesel: null }, baseYear: 2026, targetYear: 2030, solarKw: 0, solarYield: 0, dieselSharePct: 0 })!;
    expect(p.requiredCut).toBeCloseTo(25.2, 6);
    expect(p.targetT).toBeCloseTo(124.8, 6);
    expect(p.gap).toBeCloseTo(25.2, 6);
  });
  test('solar avoided = kW x yield x 0.710 / 1000', () => {
    expect(solarAvoidedT(10, 1500)).toBeCloseTo(10.65, 6);
  });
  test('headline states the cut and the solar share', () => {
    const p = pathway({ baseline: { total: 150, grid: null, diesel: null }, baseYear: 2026, targetYear: 2030, solarKw: 10, solarYield: 1500, dieselSharePct: 0 })!;
    expect(pathwayHeadline(p, 2030)).toBe('Cut 25.2 t by 2030. Your solar covers 42% of it.');
  });
  test('solar is capped at grid emissions; diesel removed counts diesel only', () => {
    const b = baselineTonnes({ kwhPerMonth: 100, dieselLPerMonth: 1000 });
    const p = pathway({ baseline: b, baseYear: 2026, targetYear: 2030, solarKw: 100, solarYield: 1500, dieselSharePct: 50 })!;
    expect(p.solarCapped).toBe(true);
    expect(p.solar).toBeCloseTo(b.grid!, 6);
    expect(p.dieselRemoved).toBeCloseTo(b.diesel! / 2, 6);
  });
  test('no answer without a baseline or with the target before the base year', () => {
    expect(pathway({ baseline: { total: 0, grid: 0, diesel: 0 }, baseYear: 2026, targetYear: 2030, solarKw: 0, solarYield: 0, dieselSharePct: 0 })).toBeNull();
    expect(pathway({ baseline: { total: 10, grid: null, diesel: null }, baseYear: 2030, targetYear: 2030, solarKw: 0, solarYield: 0, dieselSharePct: 0 })).toBeNull();
  });
  test('required cut never exceeds the baseline', () => {
    const p = pathway({ baseline: { total: 10, grid: null, diesel: null }, baseYear: 2026, targetYear: 2060, solarKw: 0, solarYield: 0, dieselSharePct: 0 })!;
    expect(p.requiredCut).toBe(10);
  });
});
