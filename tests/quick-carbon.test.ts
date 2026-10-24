import { describe, expect, test } from 'bun:test';
import { FUELS, GRID_FACTOR, electricityKg, fuelLine } from '../src/lib/calculators/quickCarbon';
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '../supabase/functions/_shared/emissionFactors';

describe('quick carbon tools', () => {
  test('electricity uses the product grid factor', () => {
    expect(GRID_FACTOR).toBe(INDIA_GRID_FACTOR_KG_PER_KWH);
    expect(electricityKg(1000)).toBeCloseTo(1000 * INDIA_GRID_FACTOR_KG_PER_KWH, 6);
    expect(electricityKg([100, 200, -5, Number.NaN])).toBeCloseTo(300 * INDIA_GRID_FACTOR_KG_PER_KWH, 6);
  });

  test('fuel factors come from the shared table', () => {
    for (const f of FUELS) expect(f.factor).toBe(FUEL_FACTORS[f.id].value);
    expect(fuelLine({ fuel: 'DIESEL', unit: 'litre', qty: 100 }).kg).toBeCloseTo(100 * FUEL_FACTORS.DIESEL.value, 6);
    expect(fuelLine({ fuel: 'LPG', unit: 'cyl19', qty: 2 }).base).toBe(38);
    expect(fuelLine({ fuel: 'DIESEL', unit: 'kl', qty: 1 }).base).toBe(1000);
    expect(fuelLine({ fuel: 'PNG', unit: 'nope', qty: 10 }).base).toBe(10);
  });
});
