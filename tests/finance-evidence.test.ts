import { describe, expect, test } from 'bun:test';
import { computeFinanceEvidence, type FinanceLedgerRow } from '../src/lib/financeEvidence';

let n = 0;
const row = (p: Partial<FinanceLedgerRow>): FinanceLedgerRow => ({
  id: `r${++n}`, emission_id: `e${n}`, document_hash: `h${n}`, vendor: 'Discom', invoice_date: '2025-04-30',
  amount: null, currency: 'INR', scope: 2, activity_data: null, activity_unit: null, emission_factor: 0.7,
  factor_source: 'CEA', methodology_version: 'v1', co2_kg: 0, verification_status: 'verified',
  created_at: '2025-05-01T00:00:00Z', ...p,
});

describe('computeFinanceEvidence', () => {
  test('counts verified rows only, once per emission', () => {
    const r = computeFinanceEvidence([
      row({ emission_id: 'a', co2_kg: 100, created_at: '2025-05-01T00:00:00Z' }),
      row({ emission_id: 'a', co2_kg: 100, created_at: '2025-05-02T00:00:00Z' }), // re-verification of a
      row({ co2_kg: 50, verification_status: 'needs_review' }),
    ]);
    expect(r.summary.verifiedTonnes).toBe(0.1);
  });

  test('electricity: kWh, implied factor and missing months', () => {
    const r = computeFinanceEvidence([
      row({ activity_data: 1000, activity_unit: 'kWh', co2_kg: 710, invoice_date: '2025-04-30' }),
      row({ activity_data: 1000, activity_unit: 'units', co2_kg: 710, invoice_date: '2025-07-31' }),
    ]);
    expect(r.detail.electricity.kwh).toBe(2000);
    expect(r.detail.electricity.impliedFactor).toBe(0.71);
    expect(r.detail.electricity.months).toBe(2);
    expect(r.detail.electricity.missingMonths).toEqual(['2025-05', '2025-06']);
  });

  test('spend intensity uses each invoice amount once and INR only', () => {
    const r = computeFinanceEvidence([
      row({ document_hash: 'inv1', amount: 10000, co2_kg: 30 }),
      row({ document_hash: 'inv1', amount: null, co2_kg: 20 }),
      row({ document_hash: 'inv2', amount: 5000, currency: 'EUR', co2_kg: 999 }),
    ]);
    expect(r.detail.spendInr).toBe(10000);
    expect(r.detail.kgPerThousandInr).toBe(5); // 50 kg per ₹10,000
  });

  test('no figure without supporting records', () => {
    const r = computeFinanceEvidence([row({ co2_kg: 10, vendor: 'Only one' })]);
    expect(r.detail.electricity.impliedFactor).toBeNull();
    expect(r.detail.kgPerThousandInr).toBeNull();
    expect(r.detail.topSupplier).toBeNull();
    expect(computeFinanceEvidence([]).summary).toEqual({ verifiedTonnes: 0, invoices: 0, monthsCovered: 0, periodStart: null, periodEnd: null });
  });

  test('supplier concentration and trail completeness', () => {
    const r = computeFinanceEvidence([
      row({ vendor: 'A', co2_kg: 75 }),
      row({ vendor: 'B', co2_kg: 25, factor_source: null, methodology_version: '' }),
    ]);
    expect(r.detail.topSupplier).toEqual({ name: 'A', share: 0.75 });
    expect(r.detail.trail.fingerprinted).toBe(1);
    expect(r.detail.trail.factorSourced).toBe(0.5);
    expect(r.detail.trail.methodPinned).toBe(0.5);
    expect(r.detail.trail.methodVersions).toEqual(['v1']);
  });

  test('summary period and month coverage use invoice dates', () => {
    const r = computeFinanceEvidence([
      row({ co2_kg: 1, invoice_date: '2025-04-10' }),
      row({ co2_kg: 1, invoice_date: '2025-04-20' }),
      row({ co2_kg: 1, invoice_date: '2025-06-02' }),
    ]);
    expect(r.summary.monthsCovered).toBe(2);
    expect(r.summary.periodStart).toBe('2025-04-10');
    expect(r.summary.periodEnd).toBe('2025-06-02');
    expect(r.summary.invoices).toBe(3);
  });
});

describe('billing periods', () => {
  test('a bill covering two months fills both; uncovered months stay missing', () => {
    const rows = [
      row({ document_hash: 'b1', activity_data: 500, activity_unit: 'kWh', co2_kg: 355, invoice_date: '2025-05-15' }),
      row({ document_hash: 'b2', activity_data: 500, activity_unit: 'kWh', co2_kg: 355, invoice_date: '2025-08-15' }),
    ];
    const r = computeFinanceEvidence(rows, { b1: { start: '2025-04-12', end: '2025-05-11' } });
    expect(r.detail.electricity.months).toBe(3); // Apr, May from b1's period; Aug from b2's invoice month
    expect(r.detail.electricity.missingMonths).toEqual(['2025-06', '2025-07']);
  });
});
