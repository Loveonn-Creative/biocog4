import { describe, expect, test } from 'bun:test';
import {
  REDUCTION_STRATEGIES, calculateFeasibility, baselineFromUsage, actionCutKg, heatPumpFraction,
  GAS_SWITCH_FRACTION, DIESEL_KG_PER_KWH_FUEL, IPCC_CO2_KG_PER_TJ,
  sbtiPace, estimatedCutKg, earnedBadges, targetDateFor, timelineFromGoal, SBTI_MIN_ANNUAL_PCT,
  buildActions, cleanAssumptions,
} from '../src/lib/netZeroEngine';

const action = (id: string) => REDUCTION_STRATEGIES.find(a => a.id === id)!;

describe('every number is a formula, a sourced constant or a labelled assumption', () => {
  test('no action carries a cost or payback figure', () => {
    for (const a of REDUCTION_STRATEGIES) {
      expect(a).not.toHaveProperty('estimatedCostInr');
      expect(a).not.toHaveProperty('paybackMonths');
      expect(a).not.toHaveProperty('reductionPct');
    }
  });
  test('every parameter has a source and a kind', () => {
    for (const a of REDUCTION_STRATEGIES) {
      expect(a.formula.length).toBeGreaterThan(0);
      for (const p of a.params) {
        expect(['constant', 'assumption']).toContain(p.kind);
        expect(p.source.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('physics and accounting behind each cut', () => {
  test('IPCC 2006 defaults: diesel to natural gas cuts 24.3% at equal energy', () => {
    expect(IPCC_CO2_KG_PER_TJ).toEqual({ diesel: 74_100, naturalGas: 56_100 });
    expect(GAS_SWITCH_FRACTION).toBeCloseTo(1 - 56_100 / 74_100, 10);
    expect(GAS_SWITCH_FRACTION).toBeCloseTo(0.2429, 4);
    expect(DIESEL_KG_PER_KWH_FUEL).toBeCloseTo(0.26676, 5);
  });
  test('heat pumps cut emissions above a COP of about 1.9; resistance heating adds them', () => {
    expect(heatPumpFraction(3, 0.75)).toBeCloseTo(1 - (0.675 / 3) / (0.26676 / 0.75), 4);
    expect(heatPumpFraction(3, 0.75)).toBeGreaterThan(0.3);
    expect(heatPumpFraction(1, 0.75)).toBeLessThan(0); // resistive heating on a 0.675 grid
    expect(heatPumpFraction(1.9, 0.75)).toBeCloseTo(0, 1);
  });
  test('efficiency ratios', () => {
    expect(action('led-lighting').fraction).toBeCloseTo(0.10 * (1 - 18 / 36), 10); // 5% of Scope 2
    expect(action('hvac-upgrade').fraction).toBeCloseTo(0.20 * (1 - 3.5 / 5.0), 10); // 6%
    expect(action('power-factor').fraction).toBeCloseTo(0.02 * (1 - (0.85 / 0.99) ** 2), 10); // about 0.53%
    expect(action('boiler-efficiency').fraction).toBeCloseTo(0.5 * (1 - 75 / 85), 10);
  });
  test('supplier engagement claims no direct cut', () => {
    expect(action('supplier-engagement').fraction).toBe(0);
  });
  test('a green tariff does not cut the location-based baseline (GHG Protocol Scope 2)', () => {
    expect(action('green-tariff').fraction).toBe(0);
  });
});

describe('baseline and roadmap', () => {
  test('baseline from usage uses the platform factors', () => {
    const b = baselineFromUsage(10_000, 500);
    expect(Math.round(b.scope2Kg)).toBe(Math.round(10_000 * 12 * 0.675));
    expect(Math.round(b.scope1Kg)).toBe(Math.round(500 * 12 * 2.645));
    expect(b.scope3Kg).toBe(0);
  });
  test('actions on the same electricity are not double counted', () => {
    const b = baselineFromUsage(10_000, 0);
    const f = calculateFeasibility(b, 75, 60, 'other');
    const scope2Cut = f.recommendedActions.filter(a => a.scope === 2).reduce((s, a) => s + a.cutKg, 0);
    expect(scope2Cut).toBeLessThanOrEqual(Math.round(b.scope2Kg));
    // Overlapping electricity actions apply to what earlier picks left.
    const solar = f.recommendedActions.find(a => a.id === 'solar-rooftop')!;
    const led = f.recommendedActions.find(a => a.id === 'led-lighting')!;
    expect(solar.cutKg).toBe(Math.round(b.scope2Kg * 0.3));
    expect(led.cutKg).toBe(Math.round(b.scope2Kg * 0.7 * 0.05));
  });
  test('scope 3 actions are only recommended when there is scope 3', () => {
    const f = calculateFeasibility(baselineFromUsage(1000, 1000), 50, 12, 'textile');
    expect(f.recommendedActions.every(a => a.scope !== 3)).toBe(true);
  });
  test('cut equals scope emissions times the action fraction', () => {
    const b = { scope1Kg: 10_000, scope2Kg: 20_000, scope3Kg: 30_000, totalKg: 60_000 };
    expect(actionCutKg(action('led-lighting'), b)).toBe(Math.round(20_000 * 0.05));
    expect(actionCutKg(action('fuel-switch-gas'), b)).toBe(Math.round(10_000 * GAS_SWITCH_FRACTION));
  });
  test('estimated cut counts only actions marked done and never exceeds the baseline', () => {
    const f = calculateFeasibility(baselineFromUsage(10_000, 500), 30, 12, 'textile');
    const [a] = f.recommendedActions;
    expect(estimatedCutKg(f.baselineCo2Kg, f.recommendedActions, {})).toBe(0);
    expect(estimatedCutKg(f.baselineCo2Kg, f.recommendedActions, { [a.id]: 'done' })).toBe(a.cutKg);
  });
});

describe('SBTi pace check', () => {
  test('uses the 4.2% a year linear minimum', () => {
    expect(SBTI_MIN_ANNUAL_PCT).toBe(4.2);
    expect(sbtiPace(30, 12)).toEqual({ annualPct: 30, meets: true });
    expect(sbtiPace(20, 60)).toEqual({ annualPct: 4, meets: false });
    expect(sbtiPace(21, 60).meets).toBe(true);
  });
});

describe('badges and stored dates', () => {
  test('badges come only from real state', () => {
    expect(earnedBadges({ hasBaselineData: false, goalSaved: false, paceMeets: false, doneCount: 0, progressPct: 0, reportExported: false })).toEqual([]);
    expect(earnedBadges({ hasBaselineData: true, goalSaved: true, paceMeets: true, doneCount: 1, progressPct: 100, reportExported: true }))
      .toEqual(['baseline', 'locked', 'pace', 'first', 'halfway', 'target', 'report']);
  });
  const created = new Date('2026-10-13T00:00:00Z');
  test.each([[12, '12'], [36, '36'], [60, '60']] as const)('%i months round-trips', (m, choice) => {
    expect(timelineFromGoal(targetDateFor(m, created), created.toISOString())).toBe(choice);
  });
});

describe('editable assumptions', () => {
  const b = { scope1Kg: 40_000, scope2Kg: 50_000, scope3Kg: 10_000, totalKg: 100_000 };
  const pick = (r: ReturnType<typeof calculateFeasibility>, id: string) => r.recommendedActions.find(a => a.id === id);

  test('a user figure replaces the default and changes the cut', () => {
    const solar = buildActions({ solarShare: 60 }).find(a => a.id === 'solar-rooftop')!;
    expect(solar.fraction).toBeCloseTo(0.6, 10);
    const p = solar.params.find(x => x.key === 'solarShare')!;
    expect(p.value).toBe(60);
    expect(p.default).toBe(30);
    expect(buildActions({ solarShare: 60 }).find(a => a.id === 'solar-rooftop')!.fraction).toBeGreaterThan(action('solar-rooftop').fraction);
  });
  test('figures outside the valid range are clamped', () => {
    const solar = buildActions({ solarShare: 250 }).find(a => a.id === 'solar-rooftop')!;
    expect(solar.params.find(x => x.key === 'solarShare')!.value).toBe(100);
    const pf = buildActions({ pf0: 0.1 }).find(a => a.id === 'power-factor')!;
    expect(pf.params.find(x => x.key === 'pf0')!.value).toBe(0.5);
  });
  test('figures that would raise emissions give no cut, never a negative one', () => {
    const hvac = buildActions({ iseerOld: 6, iseerNew: 4 }).find(a => a.id === 'hvac-upgrade')!;
    expect(hvac.fraction).toBe(0);
    const boiler = buildActions({ eff0: 90, eff1: 80 }).find(a => a.id === 'boiler-efficiency')!;
    expect(boiler.fraction).toBe(0);
    const r = calculateFeasibility(b, 30, 12, 'textile', { iseerOld: 6, iseerNew: 4 });
    expect(pick(r, 'hvac-upgrade')).toBeUndefined();
  });
  test('the roadmap uses the figures, and no figures means the defaults', () => {
    const base = calculateFeasibility(b, 30, 12, 'other');
    expect(calculateFeasibility(b, 30, 12, 'other', {})).toEqual(base);
    const edited = calculateFeasibility(b, 30, 12, 'other', { lightShare: 30 });
    expect(pick(edited, 'led-lighting')!.cutKg).toBeGreaterThan(pick(base, 'led-lighting')?.cutKg ?? 0);
  });
  test('saved figures keep only known keys with finite numbers', () => {
    expect(cleanAssumptions({ solarShare: 40, cop: 3.5, bogus: 1, lightShare: '20', coolShare: NaN, greenShare: Infinity })).toEqual({ solarShare: 40, cop: 3.5 });
    expect(cleanAssumptions(null)).toEqual({});
    expect(cleanAssumptions([1, 2])).toEqual({});
    expect(cleanAssumptions('x')).toEqual({});
  });
  test('every assumption has a key, default and range that holds the default', () => {
    const keys = new Set<string>();
    for (const a of REDUCTION_STRATEGIES) for (const p of a.params) {
      if (p.kind !== 'assumption') continue;
      expect(p.key).toBeTruthy();
      expect(p.min! <= p.default! && p.default! <= p.max!).toBe(true);
      expect(p.value).toBe(p.default!);
      keys.add(p.key!);
    }
    expect(keys.size).toBe(22);
  });
});
