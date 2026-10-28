import { describe, expect, test } from 'bun:test';
import { annualEmissions, carbonCost, costHeadline, pricePaths, ETS_REFERENCE } from '../src/components/services/climate-risk/logic';
import { DEFAULT_EU_ETS_PRICE } from '../src/lib/cbamEngine';

describe('carbon price stress test', () => {
  test('preset is the CBAM calculator reference price', () => {
    expect(ETS_REFERENCE).toBe(DEFAULT_EU_ETS_PRICE);
  });
  test('emissions from bills x shared factors', () => {
    const e = annualEmissions({ kwhPerMonth: 1000, dieselLPerMonth: 100 });
    expect(e.s2).toBeCloseTo(8.1, 6);
    expect(e.s1).toBeCloseTo(3.174, 6);
  });
  test('cost = tonnes x price; INR only when a rate is entered', () => {
    const c = carbonCost({ tonnes: 160.9, priceEur: 82.32 })!;
    expect(c.eur).toBeCloseTo(13245.29, 2);
    expect(c.inr).toBeNull();
    expect(c.cbamEur).toBeNull();
    expect(costHeadline(c, 82.32, true)).toBe('At €82/t your Scope 1 and 2 would cost €13,245 a year.');
    const r = carbonCost({ tonnes: 100, priceEur: 50, eurInr: 90, euSharePct: 40 })!;
    expect(r.inr).toBe(450000);
    expect(r.cbamEur).toBe(2000);
    expect(r.cbamInr).toBe(180000);
  });
  test('no answer without emissions or price', () => {
    expect(carbonCost({ tonnes: 0, priceEur: 80 })).toBeNull();
    expect(carbonCost({ tonnes: 10, priceEur: 0 })).toBeNull();
  });
  test('price paths: flat, and linear to 2x by 2034', () => {
    const p = pricePaths(80);
    expect(p.years[0]).toBe(2026);
    expect(p.years.at(-1)).toBe(2034);
    expect(p.flat.every(v => v === 80)).toBe(true);
    expect(p.rise[0]).toBe(80);
    expect(p.rise[4]).toBe(120);
    expect(p.rise.at(-1)).toBe(160);
  });
});
