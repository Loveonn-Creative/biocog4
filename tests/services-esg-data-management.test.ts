import { describe, expect, test } from 'bun:test';
import { CONTROLS, readiness, readinessHeadline, readinessSummary, type Answers } from '../src/components/services/esg-data-management/logic';

const all = (a: 'yes' | 'partly' | 'no'): Answers => Object.fromEntries(CONTROLS.map(c => [c.key, a]));

describe('esg data management audit readiness', () => {
  test('seven controls, equal weights', () => {
    expect(CONTROLS.length).toBe(7);
    expect(new Set(CONTROLS.map(c => c.weight))).toEqual(new Set([1]));
  });
  test('yes 1, partly 0.5, no 0', () => {
    expect(readiness(all('yes')).pct).toBe(100);
    expect(readiness(all('partly')).pct).toBe(50);
    expect(readiness(all('no')).pct).toBe(0);
  });
  test('4 of 7 points gives 57% and the headline names the biggest gap', () => {
    const a: Answers = { source: 'no', owner: 'yes', factor: 'yes', changelog: 'partly', finance: 'yes', supplier: 'partly', review: 'no' };
    const r = readiness(a);
    expect(r.pct).toBe(57);
    expect(r.complete).toBe(true);
    expect(r.top.map(g => g.control.key)).toEqual(['source', 'review', 'changelog']);
    expect(readinessHeadline(a)).toBe('Audit readiness 57%. Biggest gap: no source link for figures.');
  });
  test('no gaps headline and partial scoring', () => {
    expect(readinessHeadline(all('yes'))).toContain('No gaps');
    const r = readiness({ source: 'yes', owner: 'no' });
    expect(r.pct).toBe(50);
    expect(r.complete).toBe(false);
  });
  test('summary is plain text without certification claims', () => {
    const s = readinessSummary(all('no'));
    expect(s).toContain('Audit readiness 0%');
    expect(s.toLowerCase()).not.toContain('certif');
    for (const c of CONTROLS) expect(c.senseible.toLowerCase()).not.toContain('certif');
  });
});
