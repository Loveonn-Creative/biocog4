import { describe, expect, test } from 'bun:test';
import {
  calculateFeasibility, sbtiPace, estimatedCutKg, earnedBadges, targetDateFor, timelineFromGoal,
  SBTI_MIN_ANNUAL_PCT, SCOPE_SHARE,
} from '../src/lib/netZeroEngine';

describe('SBTi pace check', () => {
  test('uses the 4.2% a year linear minimum', () => {
    expect(SBTI_MIN_ANNUAL_PCT).toBe(4.2);
    expect(sbtiPace(30, 12)).toEqual({ annualPct: 30, meets: true });
    expect(sbtiPace(20, 60)).toEqual({ annualPct: 4, meets: false });
    expect(sbtiPace(30, 60).meets).toBe(true); // 6% a year
    expect(sbtiPace(21, 60).meets).toBe(true); // exactly 4.2%
  });
});

describe('estimated cut', () => {
  const f = calculateFeasibility(100000, 30, 12, 'textile');
  test('only actions marked done count, using the engine scope shares', () => {
    const [a, b] = f.recommendedActions;
    expect(estimatedCutKg(100000, f.recommendedActions, {})).toBe(0);
    const one = estimatedCutKg(100000, f.recommendedActions, { [a.id]: 'done', [b.id]: 'in-progress' });
    expect(one).toBe(Math.round(100000 * (a.reductionPct / 100) * SCOPE_SHARE[a.scope as 1 | 2 | 3]));
  });
  test('never exceeds the baseline', () => {
    const all = Object.fromEntries(f.recommendedActions.map(x => [x.id, 'done']));
    expect(estimatedCutKg(100000, f.recommendedActions, all)).toBeLessThanOrEqual(100000);
  });
  test('feasibility math is unchanged by the shared scope shares', () => {
    expect(f.recommendedActions.length).toBeGreaterThan(0);
    expect(f.targetReductionKg).toBe(30000);
  });
});

describe('badges come only from real state', () => {
  test('nothing done earns nothing', () => {
    expect(earnedBadges({ hasBaselineData: false, goalSaved: false, paceMeets: false, doneCount: 0, progressPct: 0, reportExported: false })).toEqual([]);
  });
  test('each condition earns its badge', () => {
    expect(earnedBadges({ hasBaselineData: true, goalSaved: true, paceMeets: true, doneCount: 1, progressPct: 100, reportExported: true }))
      .toEqual(['baseline', 'locked', 'pace', 'first', 'halfway', 'target', 'report']);
    expect(earnedBadges({ hasBaselineData: false, goalSaved: false, paceMeets: false, doneCount: 2, progressPct: 49, reportExported: false })).toEqual(['first']);
  });
});

describe('stored target date round-trips to the timeline choice', () => {
  const created = new Date('2026-10-13T00:00:00Z');
  test.each([[12, '12'], [36, '36'], [60, '60']] as const)('%i months', (m, choice) => {
    expect(timelineFromGoal(targetDateFor(m, created), created.toISOString())).toBe(choice);
  });
  test('by 2030 is the end of 2030', () => {
    expect(targetDateFor(60, created)).toBe('2030-12-31');
    expect(targetDateFor(12, created)).toBe('2027-10-13');
  });
});
