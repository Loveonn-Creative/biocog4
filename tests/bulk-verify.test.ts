import { describe, expect, test } from 'bun:test';
import { chunk, groupByInvoice, planBulk } from '../src/lib/bulkVerify';

describe('bulk verify planning', () => {
  const rows = [
    { id: 'e3', document_id: 'd2' }, { id: 'e1', document_id: 'd1' },
    { id: 'e2', document_id: 'd1' }, { id: 'e4', document_id: null },
  ];
  test('groups per invoice with a stable, sorted id set', () => {
    const g = groupByInvoice(rows);
    expect(g.map(x => [x.key, x.emissionIds])).toEqual([['d1', ['e1', 'e2']], ['d2', ['e3']], ['row:e4', ['e4']]]);
    // Same input in another order gives the identical plan.
    expect(groupByInvoice([...rows].reverse())).toEqual(g);
  });
  test('an invoice with any missing line is blocked as a whole', () => {
    const p = planBulk(groupByInvoice(rows), [{ emissionId: 'e2', fields: ['quantity'] }]);
    expect(p.ready.map(g => g.key)).toEqual(['d2', 'row:e4']);
    expect(p.blocked.map(g => [g.key, g.missing[0].fields])).toEqual([['d1', ['quantity']]]);
  });
  test('empty field lists do not block', () => {
    expect(planBulk(groupByInvoice(rows), [{ emissionId: 'e1', fields: [] }]).blocked).toEqual([]);
  });
  test('chunks to the endpoint limit', () => {
    expect(chunk(Array.from({ length: 205 }, (_, i) => i)).map(c => c.length)).toEqual([100, 100, 5]);
  });
});
