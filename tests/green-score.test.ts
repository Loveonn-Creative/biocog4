import { describe, expect, test } from 'bun:test';
import { avoidedFromDocuments, estimateGreenScore } from '../supabase/functions/_shared/greenScore';

describe('green score (estimated)', () => {
  test('grid-only business: 0 now, potential = its Scope 2 share', () => {
    // 2,982 kg grid power + 321.6 kg diesel, no clean sources
    expect(estimateGreenScore(3303.6, 0, 2982)).toEqual({ score: 0, potential: 90 });
  });
  test('rooftop solar covering 30% of power', () => {
    // 10,000 kWh need; 3,000 kWh solar avoids 2,130 kg; grid 7,000 kWh emits 4,970 kg
    const g = estimateGreenScore(4970, 2130, 4970)!;
    expect(g.score).toBe(30);       // 2,130 / 7,100
    expect(g.potential).toBe(100);  // all power clean
  });
  test('no data gives no score, never a made-up number', () => {
    expect(estimateGreenScore(0, 0, 0)).toBeNull();
  });
  test('bounded 0-100 and Scope 2 cannot exceed gross', () => {
    const g = estimateGreenScore(100, 0, 500)!;
    expect(g.potential).toBe(100);
  });
  test('avoided emissions per invoice counted once', () => {
    const d = { id: 'd1', cached_result: { avoidedCO2Kg: 2130 } };
    expect(avoidedFromDocuments([d, d, { id: 'd2', cached_result: null }, null])).toBe(2130);
  });
});
