import { describe, expect, test } from 'bun:test';
import {
  documentEmissionStatus,
  latestLedgerRowPerEmission,
  verifiedLedgerTotalKg,
  verifiedMonthlyTrend,
  verifiedScopeTotals,
  verifyListState,
} from '../src/lib/emissionLedger';

const ledger = (id: string, emission_id: string | null, co2_kg: number, verification_status: string, created_at: string) =>
  ({ id, emission_id, co2_kg, verification_status, created_at, verified_at: null });

const em = (id: string, scope: number, co2_kg: number, verified: boolean | null, created_at = '2026-05-10T00:00:00Z', document_id: string | null = 'doc-1') =>
  ({ id, scope, co2_kg, verified, created_at, document_id });

describe('audit ledger dedupe', () => {
  test('keeps only the latest ledger row per emission after re-verification', () => {
    const rows = [
      ledger('l1', 'e1', 100, 'needs_review', '2026-05-01T00:00:00Z'),
      ledger('l2', 'e1', 100, 'verified', '2026-05-03T00:00:00Z'),
      ledger('l3', 'e2', 50, 'verified', '2026-05-02T00:00:00Z'),
    ];
    const latest = latestLedgerRowPerEmission(rows);
    expect(latest.map(r => r.id)).toEqual(['l2', 'l3']);
  });

  test('order of input does not change which row wins', () => {
    const rows = [
      ledger('l2', 'e1', 100, 'verified', '2026-05-03T00:00:00Z'),
      ledger('l1', 'e1', 100, 'rejected', '2026-05-01T00:00:00Z'),
    ];
    expect(latestLedgerRowPerEmission(rows).map(r => r.id)).toEqual(['l2']);
  });

  test('verified total counts each emission once and skips unverified latest rows', () => {
    const rows = [
      ledger('l1', 'e1', 100, 'verified', '2026-05-01T00:00:00Z'),
      ledger('l2', 'e1', 100, 'verified', '2026-05-03T00:00:00Z'),
      ledger('l3', 'e2', 40, 'verified', '2026-05-01T00:00:00Z'),
      ledger('l4', 'e2', 40, 'needs_review', '2026-05-04T00:00:00Z'),
      ledger('l5', 'e3', 7, 'needs_review', '2026-05-04T00:00:00Z'),
    ];
    expect(verifiedLedgerTotalKg(rows)).toBe(100);
  });

  test('rows without emission_id are kept and counted individually', () => {
    const rows = [
      ledger('l1', null, 10, 'verified', '2026-05-01T00:00:00Z'),
      ledger('l2', null, 5, 'verified', '2026-05-02T00:00:00Z'),
    ];
    expect(latestLedgerRowPerEmission(rows)).toHaveLength(2);
    expect(verifiedLedgerTotalKg(rows)).toBe(15);
  });
});

describe('History totals', () => {
  test('scope totals use verified rows only, once per emission id', () => {
    const rows = [
      em('e1', 1, 10, true),
      em('e1', 1, 10, true),
      em('e2', 2, 20, false),
      em('e3', 3, 30, null),
      em('e4', 3, 5, true),
    ];
    expect(verifiedScopeTotals(rows)).toEqual({ scope1: 10, scope2: 0, scope3: 5, total: 15 });
  });

  test('nothing verified gives zero totals', () => {
    expect(verifiedScopeTotals([em('e1', 1, 10, false)]).total).toBe(0);
  });

  test('trend is sorted chronologically by yyyy-mm, not by label', () => {
    const rows = [
      em('a', 1, 1, true, '2026-08-15T12:00:00Z'),
      em('b', 1, 2, true, '2025-12-15T12:00:00Z'),
      em('c', 1, 3, true, '2026-04-15T12:00:00Z'),
      em('d', 1, 99, false, '2026-01-15T12:00:00Z'),
    ];
    const trend = verifiedMonthlyTrend(rows);
    expect(trend.map(t => t.key)).toEqual(['2025-12', '2026-04', '2026-08']);
    expect(trend.map(t => t.month)).toEqual(['Dec 25', 'Apr 26', 'Aug 26']);
  });
});

describe('Verify list state', () => {
  test('all verified requires at least one verified row and no pending', () => {
    expect(verifyListState([]).allVerified).toBe(false);
    expect(verifyListState([em('e1', 1, 1, true)]).allVerified).toBe(true);
    expect(verifyListState([em('e1', 1, 1, true), em('e2', 1, 1, false)]).allVerified).toBe(false);
  });

  test('scopes to the navigated document', () => {
    const rows = [em('e1', 1, 1, false, undefined, 'doc-1'), em('e2', 1, 1, true, undefined, 'doc-2')];
    const doc2 = verifyListState(rows, 'doc-2');
    expect(doc2.scoped.map(r => r.id)).toEqual(['e2']);
    expect(doc2.pending).toHaveLength(0);
    expect(doc2.allVerified).toBe(true);
    const missing = verifyListState(rows, 'doc-3');
    expect(missing.scoped).toHaveLength(0);
    expect(missing.allVerified).toBe(false);
  });
});

describe('document emission status', () => {
  test('stub without cached extraction is processing', () => {
    expect(documentEmissionStatus([], null)).toEqual({ kind: 'processing' });
  });

  test('extraction with items lacking quantity and unit is not calculable', () => {
    expect(documentEmissionStatus([], { lineItems: [{ description: 'x' }] }))
      .toEqual({ kind: 'not_calculable', reason: 'missing quantity/unit' });
  });

  test('rows decide verified versus pending', () => {
    expect(documentEmissionStatus([{ verified: true }], null)).toEqual({ kind: 'verified' });
    expect(documentEmissionStatus([{ verified: true }, { verified: false }], null)).toEqual({ kind: 'pending', count: 1 });
  });
});

import { verifyBuckets } from '../src/lib/emissionLedger';
describe('verify buckets', () => {
  const row = (id: string, scope: number, verified: boolean) => ({ id, scope, co2_kg: 1, verified, created_at: '2026-10-01' });
  test('scope 3 and already-checked records never block "done"', () => {
    const rows = [row('a', 1, true), row('b', 3, false), row('c', 2, false)];
    const b = verifyBuckets(rows, new Set(['c']));
    expect(b.toVerify).toHaveLength(0);
    expect(b.reviewed.map((r) => r.id)).toEqual(['c']);
    expect(b.scope3Held.map((r) => r.id)).toEqual(['b']);
    expect(b.done).toBe(true);
  });
  test('unchecked scope 1/2 records are the ones to verify', () => {
    const b = verifyBuckets([row('a', 1, false), row('b', 2, false)], new Set());
    expect(b.toVerify.map((r) => r.id)).toEqual(['a', 'b']);
    expect(b.done).toBe(false);
  });
  test('nothing verified is never done', () => {
    expect(verifyBuckets([row('b', 3, false)], new Set()).done).toBe(false);
  });
});
