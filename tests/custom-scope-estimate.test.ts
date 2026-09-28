import { describe, expect, test } from 'bun:test';
import { estimateCustomScope, scopeReviewMessage, type ScopeInput } from '../src/lib/customScopeEstimate';

const baseline: ScopeInput = { counts: { integration: 1 }, complexity: 'standard', entities: 1, users: 1, volume: 'normal' };

describe('custom scope estimate', () => {
  test('does not quote work already included or an empty selection', () => {
    expect(estimateCustomScope({ ...baseline, counts: {} })).toBeNull();
    expect(scopeReviewMessage({ ...baseline, counts: {} })).toBe('');
  });
  test('calculates exact baseline and selected counts', () => {
    expect(estimateCustomScope(baseline)).toMatchObject({ min: 100000, max: 250000, multiplier: 1 });
    expect(estimateCustomScope({ ...baseline, counts: { integration: 2 }, complexity: 'complex' }))
      .toMatchObject({ min: 260000, max: 650000, multiplier: 1.3 });
  });
  test('caps the combined workload uplift at 1.8', () => {
    const estimate = estimateCustomScope({ ...baseline, counts: { development: 10 }, complexity: 'enterprise', entities: 50, users: 500, volume: 'very-high' });
    expect(estimate).toMatchObject({ min: 9000000, max: 21600000, multiplier: 1.8 });
  });
  test('rejects invalid counts rather than showing a misleading range', () => {
    expect(estimateCustomScope({ ...baseline, counts: { integration: -1 } })).toBeNull();
    expect(estimateCustomScope({ ...baseline, users: Number.NaN })).toBeNull();
  });
  test('handoff includes the exact quote and selections', () => {
    expect(scopeReviewMessage(baseline)).toContain('₹1,00,000 to ₹2,50,000');
    expect(scopeReviewMessage(baseline)).toContain('New system integration × 1');
  });
});