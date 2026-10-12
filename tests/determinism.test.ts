import { describe, expect, test } from 'bun:test';
import { calculateEmissions, totalsFor } from '../supabase/functions/_shared/emissionFactors';
import { sumVerifiedKgOncePerEmission } from '../src/lib/carbonValue';
import { groupByInvoice } from '../src/lib/bulkVerify';

// "One invoice gets the same maths-based emission output no matter how many
// times it is checked." Extraction for a known file returns its stored result
// (same hash); from there every number below must be a pure function of it.
const invoice = [
  { quantity: 4200, unit: 'kWh', scope: 2, category: 'ELECTRICITY' },
  { quantity: 120, unit: 'litre', scope: 1, category: 'FUEL', fuel: 'DIESEL' },
  { quantity: 2, unit: 'MWh', scope: 2, category: 'ELECTRICITY' },
];
const run = (lines: typeof invoice) => {
  const items = lines.map(l => {
    const r = calculateEmissions(l.quantity, l.unit, l.scope, l.category, l.fuel);
    return r && r.kind === 'emission' ? { co2Kg: r.co2Kg } : {};
  });
  return totalsFor(items).grossCo2Kg;
};

describe('same invoice, same numbers', () => {
  test('emission total is identical across 50 runs', () => {
    const first = run(invoice);
    expect(first).toBeGreaterThan(0);
    for (let i = 0; i < 50; i++) expect(run(invoice)).toBe(first);
  });
  test('line order does not change the total', () => {
    expect(run([...invoice].reverse())).toBeCloseTo(run(invoice), 9);
  });
  test('MRV total counts each emission once, however many verifications include it', () => {
    const rows = [
      { id: 'e1', kg: 2982, v: true }, { id: 'e2', kg: 321.6, v: true },
      { id: 'e1', kg: 2982, v: true }, // same emission seen again in a later verification
    ];
    const total = sumVerifiedKgOncePerEmission(rows, r => r.id, r => r.kg, r => r.v);
    expect(total).toBeCloseTo(3303.6, 6);
  });
  test('bulk verify sends the same id set for an invoice every time', () => {
    const a = groupByInvoice([{ id: 'b', document_id: 'd' }, { id: 'a', document_id: 'd' }]);
    const b = groupByInvoice([{ id: 'a', document_id: 'd' }, { id: 'b', document_id: 'd' }]);
    expect(a).toEqual(b);
  });
});
