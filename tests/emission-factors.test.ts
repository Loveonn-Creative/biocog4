import { describe, expect, test } from 'bun:test';
import {
  calculateEmissions,
  classifyByHSN,
  classifyByKeyword,
  normalizeUnit,
  totalsFor,
  FUEL_FACTORS,
  INDIA_GRID_FACTOR_KG_PER_KWH,
  publishedFactorFor,
} from '../supabase/functions/_shared/emissionFactors.ts';

describe('fuel factors', () => {
  test('corrected values', () => {
    expect(FUEL_FACTORS.LPG).toMatchObject({ value: 2.98, unit: 'kg' });
    expect(FUEL_FACTORS.PNG).toMatchObject({ value: 2.05, unit: 'scm' });
    expect(FUEL_FACTORS.FURNACE_OIL).toMatchObject({ value: 2.97, unit: 'litre' });
    expect(FUEL_FACTORS.NAPHTHA).toMatchObject({ value: 3.26, unit: 'kg' });
    expect(FUEL_FACTORS.KEROSENE).toMatchObject({ value: 2.52, unit: 'litre' });
    expect(INDIA_GRID_FACTOR_KG_PER_KWH).toBe(0.71);
  });

  test('kerosene has its own factor, not diesel', () => {
    const k = classifyByKeyword('Superior Kerosene Oil');
    expect(k?.fuelType).toBe('KEROSENE');
    const r = calculateEmissions(100, 'litre', 1, 'FUEL', 'KEROSENE');
    expect(r).toMatchObject({ kind: 'emission', co2Kg: 252, emissionFactor: 2.52 });
  });

  test('LPG per kg', () => {
    expect(calculateEmissions(14.2, 'kg', 1, 'FUEL', 'LPG')).toMatchObject({ co2Kg: 42.32, unit: 'kg' });
  });

  test('naphtha in litres gets no factor (per-kg source only)', () => {
    expect(calculateEmissions(100, 'litre', 1, 'FUEL', 'NAPHTHA')).toBeNull();
    expect(calculateEmissions(1, 't', 1, 'FUEL', 'NAPHTHA')).toMatchObject({ co2Kg: 3260, quantity: 1000, unit: 'kg' });
  });
});

describe('unit aliases', () => {
  test('normalizeUnit', () => {
    expect(normalizeUnit('MWh')).toEqual({ unit: 'kWh', multiplier: 1000 });
    expect(normalizeUnit(' Ltr ')).toEqual({ unit: 'litre', multiplier: 1 });
    expect(normalizeUnit('Litres')).toEqual({ unit: 'litre', multiplier: 1 });
    expect(normalizeUnit('L')).toEqual({ unit: 'litre', multiplier: 1 });
    expect(normalizeUnit('KL')).toEqual({ unit: 'litre', multiplier: 1000 });
    expect(normalizeUnit('m³')).toEqual({ unit: 'scm', multiplier: 1 });
    expect(normalizeUnit('SM3')).toEqual({ unit: 'scm', multiplier: 1 });
    expect(normalizeUnit('MT')).toEqual({ unit: 'kg', multiplier: 1000 });
    expect(normalizeUnit('tonne')).toEqual({ unit: 'kg', multiplier: 1000 });
    expect(normalizeUnit('nos')).toBeNull();
    expect(normalizeUnit(undefined)).toBeNull();
  });

  test('MWh is converted to kWh and quantity x factor = co2', () => {
    const r = calculateEmissions(2.5, 'MWh', 2, 'ELECTRICITY');
    expect(r).toMatchObject({ kind: 'emission', quantity: 2500, unit: 'kWh', emissionFactor: 0.71, co2Kg: 1775 });
  });

  test('kL of diesel and tonnes of coal', () => {
    expect(calculateEmissions(2, 'kl', 1, 'FUEL', 'DIESEL')).toMatchObject({ quantity: 2000, co2Kg: 5360 });
    expect(calculateEmissions(1.5, 'MT', 1, 'FUEL', 'COAL')).toMatchObject({ quantity: 1500, co2Kg: 3630 });
  });

  test('wrong dimension gives no factor', () => {
    expect(calculateEmissions(10, 'kg', 2, 'ELECTRICITY')).toBeNull();
    expect(calculateEmissions(10, 'litre', 1, 'FUEL', 'LPG')).toBeNull();
  });
});

describe('HSN classification', () => {
  test('2716 electricity is checked before chapter 27 fuel', () => {
    expect(classifyByHSN('27160000')).toMatchObject({ productCategory: 'ELECTRICITY', scope: 2 });
    expect(classifyByHSN('27101944')).toMatchObject({ productCategory: 'FUEL', scope: 1 });
  });
  test('chapter 10 cereals is not biomass fuel', () => {
    expect(classifyByHSN('10063020')).toBeNull();
  });
});

describe('keyword classification', () => {
  test('generic words no longer match', () => {
    for (const text of [
      'MS angle 40x40', 'Unit price adjustment', 'Units: 12 nos', '5 kW motor', 'Power supply unit',
      'Fuel surcharge', 'Tel. no. 0123', 'FO number', 'Switch board', 'Server maintenance',
    ]) {
      const hit = classifyByKeyword(text);
      expect(hit?.productCategory === 'FUEL' || hit?.productCategory === 'ELECTRICITY' || hit?.productCategory === 'IT_HARDWARE').toBe(false);
    }
  });
  test('whole-word matching', () => {
    expect(classifyByKeyword('Dieselpunk poster')).toBeNull();
    expect(classifyByKeyword('HSD diesel 200 L')?.fuelType).toBe('DIESEL');
    expect(classifyByKeyword('Furnace oil LSHS')?.fuelType).toBe('FURNACE_OIL');
    expect(classifyByKeyword('Electricity charges March')?.productCategory).toBe('ELECTRICITY');
    expect(classifyByKeyword('Domestic LPG cylinder')?.fuelType).toBe('LPG');
  });
});

describe('avoided emissions are separate', () => {
  test('green items return a non-negative avoided amount, not negative emissions', () => {
    const r = calculateEmissions(1000, 'kWh', 2, 'SOLAR_ENERGY');
    expect(r).toMatchObject({ kind: 'avoided', avoidedCo2Kg: 710 });
    expect(r && 'co2Kg' in r).toBe(false);
  });
  test('totals keep gross and avoided apart; a positive gross stays positive', () => {
    const t = totalsFor([{ co2Kg: 100 }, { avoidedCo2Kg: 500 }, { co2Kg: -40 }]);
    expect(t).toEqual({ grossCo2Kg: 100, avoidedCo2Kg: 500 });
  });
});

describe('no generic Scope 3 factors', () => {
  test('freight and waste lines get no number here (the Scope 3 trail handles them with approved factors)', () => {
    expect(calculateEmissions(1000, 'ton-km', 3, 'TRANSPORT')).toBeNull();
    expect(calculateEmissions(500, 'kg', 3, 'WASTE')).toBeNull();
  });
});

describe('publishedFactorFor (verification re-derives the factor)', () => {
  test('current sources map to their published factor', () => {
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG')).toBe(0.71);
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.1:DIESEL')).toBe(2.68);
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.1:LPG')).toBe(2.98);
  });
  test('earlier versions and unknown keys are not re-derived here', () => {
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.0:INDIA_GRID_AVG')).toBeNull();
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.1:SOLAR_AVOIDED_GRID')).toBeNull();
    expect(publishedFactorFor(null)).toBeNull();
  });
  test('every factor the calculator writes re-derives to itself', () => {
    const cases: Array<[number, string, number, string, string?]> = [[342, 'kWh', 2, 'ELECTRICITY'], [100, 'litre', 1, 'FUEL', 'DIESEL'], [14.2, 'kg', 1, 'FUEL', 'LPG'], [2, 'kl', 1, 'FUEL', 'DIESEL']];
    for (const [q, u, s, c, f] of cases) {
      const r = calculateEmissions(q, u, s, c, f);
      expect(r && r.kind === 'emission' && publishedFactorFor(r.factorSource)).toBe(r && r.kind === 'emission' ? r.emissionFactor : -1);
    }
  });
});
