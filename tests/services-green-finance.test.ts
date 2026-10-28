import { describe, expect, test } from 'bun:test';
import { annualSaving, baselineKg, inr, kpiCutKg, loanSaving } from '../src/components/services/green-finance/logic';

describe('sustainability-linked loan saving', () => {
  test('annual saving = loan x bps / 10,000', () => {
    expect(annualSaving(15_00_00_000, 10)).toBe(1_50_000); // ₹15 crore at 10 bps
    expect(annualSaving(5_00_00_000, 25)).toBe(1_25_000);
    expect(annualSaving(1e7, 0)).toBe(0);
    expect(annualSaving(-5, 10)).toBe(0);
  });
  test('total over tenor', () => {
    const r = loanSaving({ loanInr: 10_00_00_000, tenorYears: 5, stepDownBps: 10 });
    expect(r.annual).toBe(1_00_000);
    expect(r.total).toBe(5_00_000);
  });
  test('baseline from tonnes or bills x shared factors', () => {
    expect(baselineKg({ mode: 'tonnes', tonnesPerYear: 160.9 })).toBeCloseTo(160_900);
    expect(Math.round(baselineKg({ mode: 'bills', kwhPerMonth: 1000, dieselLPerMonth: 100 }))).toBe(8100 + 3174);
    expect(kpiCutKg(100_000, 12)).toBeCloseTo(12_000);
    expect(kpiCutKg(100_000, 150)).toBe(100_000);
  });
  test('INR in lakh and crore with en-IN grouping', () => {
    expect(inr(1_50_000)).toBe('₹1.5 lakh');
    expect(inr(2_50_00_000)).toBe('₹2.5 crore');
    expect(inr(45_000)).toBe('₹45,000');
    expect(inr(99_999.6)).toBe('₹1,00,000');
  });
});
