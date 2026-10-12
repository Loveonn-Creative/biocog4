import { describe, expect, test } from 'bun:test';
import { industries, cbamExposedSectors } from '../src/data/industriesData';
import { computeExample, factorFor } from '../src/lib/industryExample';
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '../src/lib/factors';

describe('industry data', () => {
  test('CBAM coverage matches Regulation (EU) 2023/956 Annex I goods only', () => {
    expect(cbamExposedSectors.sort()).toEqual(['aluminium', 'cement', 'fertiliser', 'steel']);
  });
  test('every sector is complete and ids are unique', () => {
    expect(new Set(industries.map(i => i.id)).size).toBe(industries.length);
    for (const i of industries) {
      expect(i.buyer.question.length).toBeGreaterThan(20);
      expect(i.example.length).toBeGreaterThan(0);
      expect(i.exampleNote.length).toBeGreaterThan(10);
      for (const list of [i.scope1Sources, i.scope2Sources, i.scope3Sources, i.reductionStrategies]) expect(list.length).toBeGreaterThan(2);
    }
  });
  test('existing URLs are kept', () => {
    for (const id of ['textile', 'chemical', 'steel', 'logistics', 'construction', 'automobile']) expect(industries.some(i => i.id === id)).toBe(true);
  });
  test('no claimed savings or reduction percentages', () => {
    const text = JSON.stringify(industries);
    expect(text).not.toMatch(/\d+\s*(-|to)\s*\d+\s*%/);
    expect(text).not.toMatch(/\d+%\s*(reduction|saving|lower)/i);
  });
});

describe('worked example', () => {
  test('uses the pipeline factors exactly', () => {
    expect(factorFor('GRID')).toBe(INDIA_GRID_FACTOR_KG_PER_KWH);
    expect(factorFor('COAL')).toBe(FUEL_FACTORS.COAL.value);
    const r = computeExample([{ label: 'Grid', unit: 'kWh', factor: 'GRID', qty: 0, max: 1e6 }, { label: 'Diesel', unit: 'litre', factor: 'DIESEL', qty: 0, max: 1e6 }], [1000, 100]);
    const kg = 1000 * 12 * INDIA_GRID_FACTOR_KG_PER_KWH + 100 * 12 * FUEL_FACTORS.DIESEL.value;
    expect(r.annualTonnes).toBe(Math.round(kg / 100) / 10);
    expect(r.scope2Tonnes).toBe(Math.round((1000 * 12 * INDIA_GRID_FACTOR_KG_PER_KWH) / 100) / 10);
  });
  test('negative, missing and oversized inputs are handled', () => {
    const r = computeExample([{ label: 'x', unit: 'kWh', factor: 'GRID', qty: 0, max: 10 }], [-5]);
    expect(r.annualTonnes).toBe(0);
    expect(computeExample([{ label: 'x', unit: 'kWh', factor: 'GRID', qty: 0, max: 10 }], [1e9]).lines[0].qty).toBe(10);
  });
});
