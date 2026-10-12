import { describe, expect, test } from 'bun:test';
import { computeCredibilityScore, type CredibilityLedgerInput } from '../src/lib/credibilityScore';

const line = (over: Partial<CredibilityLedgerInput>): CredibilityLedgerInput => ({
  id: Math.random().toString(36).slice(2), emission_id: null, document_id: 'd1', document_hash: 'h1',
  vendor: 'Vendor', invoice_date: '2026-09-01', amount: null, hsn_code: '2716', is_green_benefit: false,
  verification_status: 'verified', co2_kg: 10, created_at: '2026-09-02T00:00:00Z', ...over,
});

describe('credibility score', () => {
  test('failed attempts count as 0 instead of being left out', () => {
    const r = computeCredibilityScore(
      [{ verification_score: 0.9, verification_status: 'verified' }, { verification_score: 0, verification_status: 'failed' }, { verification_score: null, verification_status: 'needs_review' }],
      [],
    );
    expect(r.breakdown.verificationAvg).toBe(30);
    expect(r.counts.attempts).toBe(3);
  });

  test('pending attempts are not scored', () => {
    const r = computeCredibilityScore([{ verification_score: null, verification_status: 'pending' }], []);
    expect(r.counts.attempts).toBe(0);
  });

  test('amount stored once per invoice still makes the invoice complete', () => {
    const rows = [
      line({ emission_id: 'e1', amount: 1200 }),
      line({ emission_id: 'e2', amount: null }),
      line({ emission_id: 'e3', amount: null }),
    ];
    const r = computeCredibilityScore([], rows);
    expect(r.counts.invoices).toBe(1);
    expect(r.counts.completeInvoices).toBe(1);
    expect(r.breakdown.dataCompleteness).toBe(100);
  });

  test('a line without an HSN code makes its invoice incomplete', () => {
    const rows = [
      line({ emission_id: 'e1', amount: 1200 }),
      line({ emission_id: 'e2', hsn_code: null }),
      line({ emission_id: 'e3', document_id: 'd2', document_hash: 'h2', amount: 50 }),
    ];
    expect(computeCredibilityScore([], rows).breakdown.dataCompleteness).toBe(50);
  });

  test('history counts unique verified invoices, not attempts or lines', () => {
    const rows = [
      line({ emission_id: 'e1', amount: 1 }), line({ emission_id: 'e2' }),
      line({ emission_id: 'e3', document_id: 'd2', document_hash: 'h2', amount: 1, verification_status: 'needs_review' }),
    ];
    const many = Array.from({ length: 20 }, () => ({ verification_score: 1, verification_status: 'verified' }));
    const r = computeCredibilityScore(many, rows);
    expect(r.counts.verifiedInvoices).toBe(1);
    expect(r.breakdown.historyDepth).toBe(2);
  });

  test('re-verified emissions are read once (latest ledger row)', () => {
    const rows = [
      line({ emission_id: 'e1', amount: 1, hsn_code: null, created_at: '2026-09-01T00:00:00Z' }),
      line({ emission_id: 'e1', amount: 1, hsn_code: '2716', created_at: '2026-09-05T00:00:00Z' }),
    ];
    expect(computeCredibilityScore([], rows).breakdown.dataCompleteness).toBe(100);
  });

  test('green share does not move credibility', () => {
    const v = [{ verification_score: 1, verification_status: 'verified' }];
    const a = computeCredibilityScore(v, [line({ emission_id: 'g1', amount: 1, is_green_benefit: false })]);
    const b = computeCredibilityScore(v, [line({ emission_id: 'g1', amount: 1, is_green_benefit: true })]);
    expect(a.score).toBe(b.score);
    expect(b.breakdown.greenRatio).toBe(100);
  });
  test('full evidence and completeness with one verified invoice', () => {
    // 0.4 x 100 + 0.4 x 100 + 0.2 x (1/50 x 100) = 80.4 -> 80
    expect(computeCredibilityScore([{ verification_score: 1, verification_status: 'verified' }], [line({ emission_id: 'e1', amount: 100 })]).score).toBe(80);
  });
  test('no data scores zero', () => {
    expect(computeCredibilityScore([], []).score).toBe(0);
  });
});
