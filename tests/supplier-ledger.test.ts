import { describe, expect, test } from 'bun:test';
import { buildSupplierLedger, summariseCoverage, type SupplierSourceRecord } from '../src/lib/supplierLedger';

const row = (over: Partial<SupplierSourceRecord>): SupplierSourceRecord => ({
  vendor: 'Acme Fuels', invoiceDate: '2026-04-01', amount: null, currency: 'INR', co2Kg: 0,
  scope: 1, category: 'fuel', hsnCode: null, factorSource: 'BIOCOG_MVR_INDIA_v1.1:DIESEL',
  verificationStatus: 'verified', documentHash: null, ...over,
});

describe('supplier ledger groups by document', () => {
  test('a document with several lines counts once and its amount once', () => {
    const records = [
      row({ documentHash: 'h1', amount: 10000, co2Kg: 100 }),
      row({ documentHash: 'h1', amount: 10000, co2Kg: 50 }),
      row({ documentHash: 'h1', amount: 10000, co2Kg: 25 }),
      row({ documentHash: 'h2', amount: 5000, co2Kg: 10, verificationStatus: 'needs_review' }),
    ];
    const [s] = buildSupplierLedger(records);
    expect(s.documentCount).toBe(2);
    expect(s.spend).toBe(15000);
    expect(s.co2Kg).toBe(185);
    expect(s.verifiedCount).toBe(1);
  });

  test('amount stored on only one line (new ledger rows) is still counted', () => {
    const [s] = buildSupplierLedger([
      row({ documentHash: 'h1', amount: 8000, co2Kg: 1 }),
      row({ documentHash: 'h1', amount: null, co2Kg: 2 }),
    ]);
    expect(s.spend).toBe(8000);
    expect(s.documentCount).toBe(1);
  });

  test('documentId groups when there is no hash; NO_HASH rows stand alone', () => {
    const [s] = buildSupplierLedger([
      row({ documentId: 'd1', amount: 100 }),
      row({ documentId: 'd1', amount: 100 }),
      row({ documentHash: 'NO_HASH', amount: 30 }),
      row({ documentHash: 'NO_HASH', amount: 20 }),
    ]);
    expect(s.documentCount).toBe(3);
    expect(s.spend).toBe(150);
  });

  test('coverage totals use per-document spend', () => {
    const cov = summariseCoverage(buildSupplierLedger([
      row({ documentHash: 'h1', amount: 1000, co2Kg: 10, hsnCode: '2710' }),
      row({ documentHash: 'h1', amount: 1000, co2Kg: 10, hsnCode: '2710' }),
      row({ vendor: 'Beta Ltd', documentHash: 'h9', amount: 500, co2Kg: 0, verificationStatus: null, factorSource: null }),
    ]));
    expect(cov.totalSpend).toBe(1500);
    expect(cov.supplierCount).toBe(2);
  });
});
