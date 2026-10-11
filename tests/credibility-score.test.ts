import { describe, expect, test } from 'bun:test';
import { computeCredibilityScore } from '../src/lib/credibilityScore';

const row = (green: boolean) => ({ is_green_benefit: green, vendor: 'V', invoice_date: '2026-01-01', amount: 100, hsn_code: '2716' });

describe('credibility score', () => {
  test('green share does not move credibility', () => {
    const v = [{ verification_score: 1 }];
    const a = computeCredibilityScore(v, [row(false), row(false)]);
    const b = computeCredibilityScore(v, [row(true), row(true)]);
    expect(a.score).toBe(b.score);
    expect(b.breakdown.greenRatio).toBe(100);
  });
  test('full evidence and completeness with one verification', () => {
    // 0.4 x 100 + 0.4 x 100 + 0.2 x (1/50 x 100) = 80.4 -> 80
    expect(computeCredibilityScore([{ verification_score: 1 }], [row(false)]).score).toBe(80);
  });
  test('no data scores zero', () => {
    expect(computeCredibilityScore([], []).score).toBe(0);
  });
});
