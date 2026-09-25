import { describe, expect, test } from 'bun:test';
import { buildEmissionRows } from '../src/lib/mrvPersistence';

describe('MRV persistence', () => {
  test('preserves every independently calculated line item', () => {
    const rows = buildEmissionRows({
      confidence: 92,
      lineItems: [
        {
          description: 'Units consumed 1,000 kWh', quantity: 1000, unit: 'kWh',
          productCategory: 'ELECTRICITY', scope: 2, co2Kg: 708,
          emissionFactor: 0.708, factorSource: 'BIOCOG_MVR_INDIA_v1.0:INDIA_GRID_AVG',
          classificationMethod: 'KEYWORD',
        },
        {
          description: 'Diesel 20 litre', quantity: 20, unit: 'litre',
          productCategory: 'FUEL', scope: 1, co2Kg: 53.6,
          emissionFactor: 2.68, factorSource: 'BIOCOG_MVR_INDIA_v1.0:DIESEL',
          classificationMethod: 'KEYWORD', hsn_code: '2710',
        },
      ],
    }, { documentId: 'doc', sessionId: null, userId: 'user' });

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.scope)).toEqual([2, 1]);
    expect(rows.reduce((sum, row) => sum + row.co2_kg, 0)).toBeCloseTo(761.6);
    expect(JSON.parse(rows[0].verification_notes).factorSource).toContain('INDIA_GRID_AVG');
    expect(JSON.parse(rows[1].verification_notes).hsnCode).toBe('2710');
  });

  test('does not persist ambiguous or uncalculated evidence', () => {
    const rows = buildEmissionRows({
      confidence: 35,
      lineItems: [
        { description: 'Monthly electricity charge', quantity: 1, unit: 'month', productCategory: 'ELECTRICITY', scope: 2, classificationMethod: 'KEYWORD' },
        { description: 'Unreadable handwritten line', classificationMethod: 'UNVERIFIABLE' },
      ],
    }, { documentId: 'doc', sessionId: 'session', userId: null });

    expect(rows).toEqual([]);
  });
});