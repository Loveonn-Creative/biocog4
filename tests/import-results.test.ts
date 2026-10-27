import { describe, expect, test } from 'bun:test';
import { finalRows, NOT_SAVED, type Outcome } from '../src/lib/import/results';
import { checkRecords } from '../src/lib/import/validate';

const NOW = new Date('2026-10-27T00:00:00Z');
const v = (o: Record<string, string> = {}) => ({ date: '2026-09-14', type: 'Diesel', quantity: '100', unit: 'litre', supplier: 'Shree Fuels', gstin: '27AAPFU0939F1ZV', invoice: 'A', amount: '', notes: '', ...o });

describe('import result screen', () => {
  const checked = checkRecords('activity', [
    { line: 2, values: v({ invoice: 'A' }) },
    { line: 3, values: v({ invoice: 'A' }) },
    { line: 4, values: v({ quantity: '0', invoice: 'B' }) },
    { line: 5, values: v({ invoice: 'C' }) },
    { line: 6, values: v({ invoice: 'D' }) },
    { line: 7, values: v({ invoice: 'E' }) },
  ], NOW);
  test('every row gets one status and the counts add up to the file', () => {
    const outcomes = new Map<number, Outcome>([
      [2, { line: 2, status: 'saved', documentId: 'd1', emissions: 1 }],
      [5, { line: 5, status: 'duplicate', reason: 'Already in your records.' }],
      [6, { line: 6, status: 'failed', reason: NOT_SAVED, code: 'save_failed' }],
    ]);
    const rows = finalRows(checked.rows, outcomes, NOT_SAVED);
    expect(rows.map((r) => [r.line, r.status])).toEqual([[2, 'saved'], [3, 'duplicate'], [4, 'fix'], [5, 'duplicate'], [6, 'failed'], [7, 'failed']]);
    expect(rows).toHaveLength(checked.counts.total);
  });
  test('a row is never reported saved unless the server saved it', () => {
    const rows = finalRows(checked.rows, new Map(), 'Monthly limit reached. Not saved.');
    expect(rows.filter((r) => r.status === 'saved')).toHaveLength(0);
    expect(rows.find((r) => r.line === 7)).toEqual({ line: 7, status: 'failed', reason: 'Monthly limit reached. Not saved.' });
  });
  test('the server finding a problem the browser missed shows as needs fixing', () => {
    const rows = finalRows(checked.rows, new Map([[5, { line: 5, status: 'invalid', reason: 'Check this row.' } as Outcome]]), NOT_SAVED);
    expect(rows.find((r) => r.line === 5)).toEqual({ line: 5, status: 'fix', reason: 'Check this row.' });
  });
});
