import { describe, expect, test } from 'bun:test';
import { decideDocumentDelete } from '../supabase/functions/_shared/deletePolicy';

describe('decideDocumentDelete', () => {
  test('unverified invoice: delete its emissions and ledger rows', () => {
    const d = decideDocumentDelete([{ id: 'e1', verified: false }, { id: 'e2', verified: null }], [{ id: 'l1', emission_id: 'e1', verification_status: 'pending' }]);
    expect(d).toEqual({ allowed: true, emissionIds: ['e1', 'e2'], ledgerIds: ['l1'] });
  });
  test('any verified emission blocks the delete', () => {
    const d = decideDocumentDelete([{ id: 'e1', verified: true }, { id: 'e2', verified: false }], []);
    expect(d.allowed).toBe(false);
  });
  test('a verified ledger row blocks the delete even if the emission flag lags', () => {
    const d = decideDocumentDelete([{ id: 'e1', verified: false }], [{ id: 'l1', emission_id: 'e1', verification_status: 'Verified' }]);
    expect(d.allowed).toBe(false);
  });
  test('a document with no derived rows can be deleted', () => {
    expect(decideDocumentDelete([], [])).toEqual({ allowed: true, emissionIds: [], ledgerIds: [] });
  });
});
