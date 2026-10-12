import { describe, expect, test } from 'bun:test';
import { computeSolarSignal, MAX_CAPACITY_FACTOR, periodDays, type SolarInput } from '../supabase/functions/_shared/solarSignal';

// A placeholder factor for arithmetic tests only; real factors come from the
// factor table with their source and version.
const F = { kgPerKwh: 0.8, kind: 'combined_margin' as const, region: 'TEST', source: 'Test source', version: 'vTest' };
const base: SolarInput = {
  capacityKwp: 10, commissionedOn: '2026-01-01', meterAccuracyPct: 1, factor: F, registeredElsewhere: false, additionality: 'not_assessed',
  readings: [
    { periodStart: '2026-02-01', periodEnd: '2026-02-28', kwh: 1200, evidence: 'net_meter_bill' },
    { periodStart: '2026-03-01', periodEnd: '2026-03-31', kwh: 1400, evidence: 'net_meter_bill' },
  ],
};

describe('rooftop solar signal (AMS-I.F arithmetic)', () => {
  test('reduction = metered kWh x combined-margin factor, with a meter-accuracy deduction', () => {
    const s = computeSolarSignal(base);
    expect(s.status).toBe('ready');
    expect(s.eligibleKwh).toBe(2600);
    expect(s.centralTco2e).toBe(2.08);
    expect(s.conservativeTco2e).toBe(2.059);
    expect(s.monitoringStart).toBe('2026-02-01');
    expect(s.monitoringEnd).toBe('2026-03-31');
    expect(s.coveredDays).toBe(59);
  });
  test('no factor: kWh shown, tonnes withheld', () => {
    const s = computeSolarSignal({ ...base, factor: null });
    expect(s.status).toBe('withheld');
    expect(s.eligibleKwh).toBe(2600);
    expect(s.centralTco2e).toBeNull();
  });
  test('a factor without source or version is not used', () => {
    expect(computeSolarSignal({ ...base, factor: { ...F, source: ' ' } }).status).toBe('withheld');
    expect(computeSolarSignal({ ...base, factor: { ...F, version: '' } }).status).toBe('withheld');
  });
  test('a reading above the physical ceiling is left out, not capped', () => {
    const ceiling = 10 * 24 * 31 * MAX_CAPACITY_FACTOR; // 2,232 kWh for March
    const s = computeSolarSignal({ ...base, readings: [base.readings[0], { ...base.readings[1], kwh: ceiling + 1 }] });
    expect(s.excludedReadings).toBe(1);
    expect(s.eligibleKwh).toBe(1200);
    expect(s.checks.find((c) => c.id === 'plausible')!.pass).toBe(false);
  });
  test('overlapping periods and double registration make it invalid', () => {
    const overlap = computeSolarSignal({ ...base, readings: [base.readings[0], { ...base.readings[1], periodStart: '2026-02-20' }] });
    expect(overlap.status).toBe('invalid');
    expect(computeSolarSignal({ ...base, registeredElsewhere: true }).status).toBe('invalid');
  });
  test('unconfirmed registration status withholds tonnes', () => {
    expect(computeSolarSignal({ ...base, registeredElsewhere: null }).status).toBe('withheld');
  });
  test('readings before commissioning or with bad values do not count; gaps are not filled', () => {
    const s = computeSolarSignal({ ...base, readings: [
      { periodStart: '2025-12-01', periodEnd: '2025-12-31', kwh: 900, evidence: 'net_meter_bill' },
      { periodStart: '2026-02-01', periodEnd: '2026-02-28', kwh: -5, evidence: 'net_meter_bill' },
      base.readings[1],
    ] });
    expect(s.eligibleKwh).toBe(1400);
    expect(s.coveredDays).toBe(31);
  });
  test('period days include both ends', () => {
    expect(periodDays('2026-03-01', '2026-03-31')).toBe(31);
  });
});
