import { describe, expect, test } from 'bun:test';
import { indicativeValueInr, indicativeValueFromKg, kgToTonnes, sumVerifiedKgOncePerEmission } from '../src/lib/carbonValue';

describe('carbonValue', () => {
  test('tonnes x 750, rounded', () => {
    expect(indicativeValueInr(1)).toBe(750);
    expect(indicativeValueInr(2.5)).toBe(1875);
    expect(indicativeValueFromKg(1234)).toBe(926);
  });
  test('never negative, never NaN', () => {
    expect(indicativeValueInr(-3)).toBe(0);
    expect(indicativeValueInr(NaN)).toBe(0);
    expect(kgToTonnes(undefined)).toBe(0);
    expect(kgToTonnes(-500)).toBe(0);
  });
  test('counts each emission once and skips unverified', () => {
    const rows = [
      { id: 'a', kg: 100, v: true }, { id: 'a', kg: 100, v: true },
      { id: 'b', kg: 50, v: false }, { id: null, kg: 10, v: true },
    ];
    expect(sumVerifiedKgOncePerEmission(rows, r => r.id, r => r.kg, r => r.v)).toBe(110);
  });
});
