import { describe, expect, test } from 'bun:test';
import {
  computeFuelSwitchSignal, computeEfficiencySignal, fuelKgCo2PerUnit, fuelMjPerUnit, footprintFactor, ratioWithLowerBound, tCritical90,
  FUEL_SPECS, MIN_BASELINE_DAYS, type FuelSwitchInput, type EfficiencyInput, type Period, type Fuel,
} from '../supabase/functions/_shared/reductionSignal';

// A placeholder grid factor for arithmetic tests only; real factors come from
// the factor table with their source and version.
const GRID = { kgPerKwh: 0.8, kind: 'combined_margin' as const, region: 'TEST', source: 'Test source', version: 'vTest' };
const MONTHS = ['2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
const lastDay = (ym: string) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
const month = (ym: string, extra: Partial<Period>): Period => ({ periodStart: `${ym}-01`, periodEnd: `${ym}-${String(lastDay(ym)).padStart(2, '0')}`, ...extra });

const fsBase: FuelSwitchInput = {
  oldFuel: 'DIESEL', newEnergy: 'PNG', startedOn: '2026-04-01', meterAccuracyPct: 1, factor: null,
  registeredElsewhere: false, oldEquipmentRetired: true, additionality: 'not_assessed',
  baseline: MONTHS.map((m) => month(m, { oldFuelQty: 1000 })),
  project: [month('2026-04', { oldFuelQty: 0, newEnergyQty: 980 })],
};

describe('fuel data (IPCC 2006 V2 Ch.1 Tables 1.2 and 1.4)', () => {
  test('default per-unit factors equal the platform footprint factors', () => {
    for (const f of Object.keys(FUEL_SPECS) as Fuel[]) expect(Math.round(fuelKgCo2PerUnit(f) * 100) / 100).toBe(footprintFactor(f));
  });
  test('diesel: 74,100 kgCO2/TJ x 43.0 MJ/kg x 0.84 kg/L', () => {
    expect(fuelKgCo2PerUnit('DIESEL')).toBeCloseTo(2.676492, 6);
    expect(fuelMjPerUnit('DIESEL')).toBeCloseTo(36.12, 6);
  });
  test('lower and upper limits bracket the default', () => {
    for (const f of Object.keys(FUEL_SPECS) as Fuel[]) {
      expect(fuelKgCo2PerUnit(f, 'lower')).toBeLessThan(fuelKgCo2PerUnit(f));
      expect(fuelKgCo2PerUnit(f, 'upper')).toBeGreaterThan(fuelKgCo2PerUnit(f));
    }
  });
});

describe('statistics', () => {
  test('two-sided 90% t critical values', () => {
    expect(tCritical90(11)).toBe(1.796);
    expect(tCritical90(1)).toBe(6.314);
    expect(tCritical90(1000)).toBe(1.645);
  });
  test('ratio mean is weighted by the denominator; the lower limit sits below it', () => {
    const r = ratioWithLowerBound([100, 120, 110], [10, 10, 10]);
    expect(r.mean).toBeCloseTo(11, 9);
    expect(r.lower).toBeLessThan(r.mean);
    expect(r.lower).toBeGreaterThan(0);
  });
  test('a single period gives no confidence limit (lower = 0)', () => {
    expect(ratioWithLowerBound([10], [2]).lower).toBe(0);
  });
});

describe('fuel switch', () => {
  test('diesel boiler to PNG, hand-checked: baseline is the lower of history and energy-equivalent', () => {
    const s = computeFuelSwitchSignal(fsBase);
    // History: 12,000 L over 365 days x 30 days = 986.30 L.
    // Energy-equivalent: 980 scm x 36.48 MJ/scm / 36.12 MJ/L = 989.77 L. Lower = 986.30 L.
    const hist = (12000 / 365) * 30;
    const be = hist * fuelKgCo2PerUnit('DIESEL');
    const pe = 980 * fuelKgCo2PerUnit('PNG');
    expect(s.status).toBe('ready');
    expect(s.centralTco2e).toBeCloseTo(Math.round((be - pe)) / 1000, 3);
    expect(s.centralTco2e).toBeCloseTo(0.634, 3);
    expect(s.baselineDays).toBe(365);
    expect(s.monitoringDays).toBe(30);
    expect(s.quantitySaved).toBeCloseTo(hist, 0);
    expect(s.quantityUnit).toBe('litre');
  });
  test('conservative figure is never above the central one and never negative', () => {
    const s = computeFuelSwitchSignal(fsBase);
    expect(s.conservativeTco2e!).toBeGreaterThanOrEqual(0);
    expect(s.conservativeTco2e!).toBeLessThanOrEqual(s.centralTco2e!);
  });
  test('lower production is not credited: the energy actually supplied caps the baseline', () => {
    const half = computeFuelSwitchSignal({ ...fsBase, project: [month('2026-04', { oldFuelQty: 0, newEnergyQty: 490 })] });
    // 490 scm supplies the energy of 494.9 L of diesel, below the historical 986 L: that is the baseline.
    const equivLitres = (490 * fuelMjPerUnit('PNG')) / fuelMjPerUnit('DIESEL');
    expect(equivLitres).toBeLessThan((12000 / 365) * 30);
    expect(half.centralTco2e!).toBeCloseTo((equivLitres * fuelKgCo2PerUnit('DIESEL') - 490 * fuelKgCo2PerUnit('PNG')) / 1000, 3);
  });
  test('growth is not credited: history caps the baseline', () => {
    const doubled = computeFuelSwitchSignal({ ...fsBase, project: [month('2026-04', { oldFuelQty: 0, newEnergyQty: 1960 })] });
    // Baseline stays at the historical 986 L while project emissions double: no reduction.
    expect(doubled.status).toBe('invalid');
    expect(doubled.checks.find((c) => c.id === 'reduction')!.pass).toBe(false);
  });
  test('with output every period, the baseline is per unit of output, capped at the highest baseline output', () => {
    const base = MONTHS.map((m) => month(m, { oldFuelQty: 1000, outputQty: 100 }));
    const grow = computeFuelSwitchSignal({ ...fsBase, baseline: base, project: [month('2026-04', { oldFuelQty: 0, newEnergyQty: 1960, outputQty: 200 })] });
    // Output is capped at the best baseline day rate (100/28 per day in February) x 30 days, so the baseline cannot double.
    expect(grow.notes.some((n) => n.includes('per unit of output'))).toBe(true);
    expect(grow.status).toBe('invalid');
  });
  test('switching diesel heat to grid electricity on a 0.8 grid raises emissions at equal efficiency', () => {
    const s = computeFuelSwitchSignal({ ...fsBase, newEnergy: 'GRID_ELECTRICITY', factor: GRID, project: [month('2026-04', { oldFuelQty: 0, newEnergyQty: 9000 })] });
    expect(s.status).toBe('invalid');
    expect(s.checks.find((c) => c.id === 'reduction')!.detail).toContain('does not lower');
  });
  test('electrification is never ready: outside CDM AMS-III.B, even when emissions fall', () => {
    const cleanGrid = { ...GRID, kgPerKwh: 0.05 };
    const s = computeFuelSwitchSignal({ ...fsBase, newEnergy: 'GRID_ELECTRICITY', factor: cleanGrid, project: [month('2026-04', { oldFuelQty: 0, newEnergyQty: 9000 })] });
    expect(s.checks.find((c) => c.id === 'reduction')!.pass).toBe(true);
    expect(s.checks.find((c) => c.id === 'method_scope')!.pass).toBe(false);
    expect(s.status).toBe('withheld');
    expect(s.centralTco2e).toBeNull();
  });
  test('a fossil-to-fossil switch passes the method scope check', () => {
    expect(computeFuelSwitchSignal(fsBase).checks.find((c) => c.id === 'method_scope')!.pass).toBe(true);
  });
  test('one year of baseline is accepted but flagged against the usual three', () => {
    expect(computeFuelSwitchSignal(fsBase).notes.some((n) => n.includes('three years'))).toBe(true);
  });
  test('grid electricity without a sourced factor: withheld, not judged', () => {
    const s = computeFuelSwitchSignal({ ...fsBase, newEnergy: 'GRID_ELECTRICITY', factor: null, project: [month('2026-04', { oldFuelQty: 0, newEnergyQty: 9000 })] });
    expect(s.status).toBe('withheld');
    expect(s.centralTco2e).toBeNull();
    expect(s.checks.find((c) => c.id === 'factor')!.pass).toBe(false);
  });
  test('less than a year of baseline withholds tonnes', () => {
    const s = computeFuelSwitchSignal({ ...fsBase, baseline: fsBase.baseline.slice(1) });
    expect(s.baselineDays).toBeLessThan(MIN_BASELINE_DAYS);
    expect(s.status).toBe('withheld');
    expect(s.checks.find((c) => c.id === 'reduction')!.detail).toContain('Shown once');
  });
  test('periods crossing the change date are left out; overlaps are invalid', () => {
    const crossing = computeFuelSwitchSignal({ ...fsBase, project: [...fsBase.project, { periodStart: '2026-03-20', periodEnd: '2026-04-10', newEnergyQty: 300 }] });
    expect(crossing.monitoringDays).toBe(30);
    const overlap = computeFuelSwitchSignal({ ...fsBase, project: [...fsBase.project, { periodStart: '2026-04-15', periodEnd: '2026-05-14', oldFuelQty: 0, newEnergyQty: 900 }] });
    expect(overlap.status).toBe('invalid');
  });
  test('double registration or moved equipment is invalid; unconfirmed is withheld', () => {
    expect(computeFuelSwitchSignal({ ...fsBase, registeredElsewhere: true }).status).toBe('invalid');
    expect(computeFuelSwitchSignal({ ...fsBase, oldEquipmentRetired: false }).status).toBe('invalid');
    expect(computeFuelSwitchSignal({ ...fsBase, registeredElsewhere: null }).status).toBe('withheld');
    expect(computeFuelSwitchSignal({ ...fsBase, oldEquipmentRetired: null }).status).toBe('withheld');
  });
  test('switching a fuel to itself is invalid', () => {
    expect(computeFuelSwitchSignal({ ...fsBase, newEnergy: 'DIESEL' }).status).toBe('invalid');
  });
});

const effBase: EfficiencyInput = {
  carrier: 'GRID_ELECTRICITY', outputUnit: 'tonnes', startedOn: '2026-04-01', meterAccuracyPct: 1, factor: GRID,
  registeredElsewhere: false, oldEquipmentRetired: true, additionality: 'not_assessed',
  // 130 kWh per tonne, 400 to 440 tonnes a month.
  baseline: MONTHS.map((m, i) => { const out = 400 + (i % 3) * 20; return month(m, { energyQty: out * 130 * (1 + ((i % 2) ? 0.02 : -0.02)), outputQty: out }); }),
  project: [month('2026-04', { energyQty: 420 * 110, outputQty: 420 })],
};

describe('energy efficiency', () => {
  test('savings = baseline kWh per tonne x output - kWh used; reduction = savings x factor', () => {
    const s = computeEfficiencySignal(effBase);
    const sumE = effBase.baseline.reduce((a, p) => a + p.energyQty!, 0), sumO = effBase.baseline.reduce((a, p) => a + p.outputQty!, 0);
    const savedKwh = (sumE / sumO) * 420 - 420 * 110;
    expect(s.status).toBe('ready');
    expect(s.quantitySaved).toBeCloseTo(savedKwh, 0);
    expect(s.centralTco2e).toBeCloseTo((savedKwh * 0.8) / 1000, 3);
    expect(s.conservativeTco2e!).toBeLessThan(s.centralTco2e!);
    expect(s.conservativeTco2e!).toBeGreaterThan(0);
  });
  test('lower output alone is not a saving', () => {
    const sumE = effBase.baseline.reduce((a, p) => a + p.energyQty!, 0), sumO = effBase.baseline.reduce((a, p) => a + p.outputQty!, 0);
    const sec = sumE / sumO;
    // Same energy per tonne as the baseline, at lower (but in-range) output: nothing saved.
    const s = computeEfficiencySignal({ ...effBase, project: [month('2026-04', { energyQty: 380 * sec, outputQty: 380 })] });
    expect(s.quantitySaved).toBeCloseTo(0, 0);
    expect(s.status).toBe('invalid');
  });
  test('periods with output outside the baseline range are left out, never extrapolated', () => {
    const s = computeEfficiencySignal({ ...effBase, project: [...effBase.project, month('2026-05', { energyQty: 900 * 110, outputQty: 900 })] });
    expect(s.excludedPeriods).toBe(1);
    expect(s.checks.find((c) => c.id === 'output_range')!.pass).toBe(false);
    expect(s.monitoringDays).toBe(30);
  });
  test('an unsteady baseline withholds tonnes', () => {
    const wild = effBase.baseline.map((p, i) => ({ ...p, energyQty: p.outputQty! * (i % 2 ? 200 : 80) }));
    const s = computeEfficiencySignal({ ...effBase, baseline: wild });
    expect(s.checks.find((c) => c.id === 'stable_baseline')!.pass).toBe(false);
    expect(s.status).toBe('withheld');
  });
  test('the +/-10% rule (BEE BM IN02.001): one baseline month 12% off its average withholds tonnes', () => {
    const base = MONTHS.map((m, i) => month(m, { energyQty: (i === 5 ? 1.12 : 0.99) * 130 * 400, outputQty: 400 }));
    const s = computeEfficiencySignal({ ...effBase, baseline: base, project: [month('2026-04', { energyQty: 400 * 110, outputQty: 400 })] });
    expect(s.checks.find((c) => c.id === 'stable_baseline')!.pass).toBe(false);
    expect(s.checks.find((c) => c.id === 'stable_baseline')!.detail).toContain('10%');
    expect(s.status).toBe('withheld');
    const ok = computeEfficiencySignal({ ...effBase, baseline: MONTHS.map((m, i) => month(m, { energyQty: (i === 5 ? 1.08 : 0.99) * 130 * 400, outputQty: 400 })), project: [month('2026-04', { energyQty: 400 * 110, outputQty: 400 })] });
    expect(ok.checks.find((c) => c.id === 'stable_baseline')!.pass).toBe(true);
  });
  test('periods without output are left out', () => {
    const s = computeEfficiencySignal({ ...effBase, project: [...effBase.project, month('2026-05', { energyQty: 40000 })] });
    expect(s.monitoringDays).toBe(30);
    expect(s.checks.find((c) => c.id === 'no_overlap')!.detail).toContain('without output');
  });
  test('a fuel carrier uses the IPCC factor; conservative uses its lower limit', () => {
    const base = MONTHS.map((m) => month(m, { energyQty: 2000, outputQty: 100 }));
    const s = computeEfficiencySignal({ ...effBase, carrier: 'LPG', factor: null, baseline: base, project: [month('2026-04', { energyQty: 1600, outputQty: 100 })] });
    // 20 kg per unit x 100 = 2,000 kg baseline; 400 kg LPG saved x 2.98.
    expect(s.status).toBe('ready');
    expect(s.centralTco2e).toBeCloseTo((400 * fuelKgCo2PerUnit('LPG')) / 1000, 3);
    expect(s.checks.find((c) => c.id === 'factor')).toBeUndefined();
  });
  test('missing output unit or date is invalid', () => {
    expect(computeEfficiencySignal({ ...effBase, outputUnit: ' ' }).status).toBe('invalid');
    expect(computeEfficiencySignal({ ...effBase, startedOn: 'soon' }).status).toBe('invalid');
  });
});
