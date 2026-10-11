import { describe, expect, test } from 'bun:test';
import {
  blockSize, hoursWorked, injuryCells, lattice, ltifr, rates, recordablesValid, safetyHeadline, safetySummary, trir,
} from '../src/components/services/ehs-social/logic';

describe('ehs safety rates', () => {
  test('hours worked from total or headcount x hours a day x days', () => {
    expect(hoursWorked({ mode: 'total', total: 1_000_000, headcount: '', hoursPerDay: '', days: '' })).toBe(1_000_000);
    expect(hoursWorked({ mode: 'headcount', total: '', headcount: 500, hoursPerDay: 8, days: 300 })).toBe(1_200_000);
    expect(hoursWorked({ mode: 'headcount', total: '', headcount: 500, hoursPerDay: '', days: 300 })).toBe(0);
  });
  test('LTIFR per million hours, TRIR per 200,000 hours', () => {
    expect(ltifr(1, 1_000_000)).toBe(1);
    expect(trir(7, 1_000_000)).toBeCloseTo(1.4, 10);
    expect(ltifr(3, 0)).toBe(0);
  });
  test('headline and summary', () => {
    const r = rates(1_219_512, { ltis: 1, recordables: 7, fatalities: 0 });
    expect(safetyHeadline(r)).toBe('LTIFR 0.82 per million hours. TRIR 1.1.');
    const s = safetySummary(r);
    expect(s).toContain('Fatalities: 0');
    expect(s).toContain('per million person-hours');
  });
  test('recordables include lost time injuries', () => {
    expect(recordablesValid({ ltis: 3, recordables: 2, fatalities: '' })).toBe(false);
    expect(recordablesValid({ ltis: 3, recordables: 3, fatalities: '' })).toBe(true);
  });
  test('lattice stays between about 20x12 and 40x24 cells', () => {
    for (const h of [10_000, 48_000, 250_000, 1_200_000, 3_700_000, 90_000_000]) {
      const g = lattice(h);
      expect(g.cells).toBeGreaterThanOrEqual(240);
      expect(g.cells).toBeLessThanOrEqual(600);
      expect(g.cols * g.rows).toBeGreaterThanOrEqual(g.cells);
      expect(g.cols).toBeLessThanOrEqual(40);
      expect(g.rows).toBeLessThanOrEqual(24);
    }
    expect(blockSize(1_200_000)).toBe(2000);
  });
  test('injury cells are deterministic, distinct and stable as injuries are added', () => {
    const a = injuryCells(500, 8, 42);
    expect(injuryCells(500, 8, 42)).toEqual(a);
    expect(new Set(a).size).toBe(8);
    expect(injuryCells(500, 9, 42).slice(0, 8)).toEqual(a);
    expect(injuryCells(5, 20, 1).length).toBe(5);
  });
});
