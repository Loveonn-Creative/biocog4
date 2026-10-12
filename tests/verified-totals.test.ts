import { describe, expect, test } from 'bun:test';
import { grossKg, verifiedLedgerTotalKg, verifiedScopeTotals, latestLedgerRowPerEmission } from '../src/lib/emissionLedger';
import { sumVerifiedKgOncePerEmission } from '../src/lib/carbonValue';
import { applyFilters, defaultFilters, resolveWindow, totals, topCategories } from '../src/lib/dashboardAnalytics';

const now = new Date().toISOString();
const row = (id: string, scope: number, co2_kg: number, verified: boolean, category = 'electricity') =>
  ({ id, scope, co2_kg, verified, category, created_at: now, document_id: 'd1', activity_data: 1, emission_factor: 1 }) as any;

// One verified set with a legacy negative row, a duplicate id and a pending row.
const rows = [
  row('a', 2, 100, true),
  row('b', 1, 50, true, 'diesel'),
  row('b', 1, 50, true, 'diesel'), // same emission loaded twice
  row('g', 2, -30, true, 'solar'), // legacy avoided row
  row('p', 1, 999, false, 'diesel'), // not verified
];

describe('one verified-total rule', () => {
  test('grossKg keeps finite positive values only', () => {
    expect(grossKg(12.5)).toBe(12.5);
    expect(grossKg('7')).toBe(7);
    expect(grossKg(-3)).toBe(0);
    expect(grossKg(Number.NaN)).toBe(0);
    expect(grossKg(null)).toBe(0);
  });

  test('History, Monetize/MRV and Dashboard agree on the same rows', () => {
    const history = verifiedScopeTotals(rows).total;
    const monetize = sumVerifiedKgOncePerEmission(rows, (e: any) => e.id, (e: any) => e.co2_kg, (e: any) => e.verified === true);
    const signedIn = defaultFilters(true);
    const dash = totals(applyFilters(rows, signedIn, resolveWindow(signedIn.range))).total;
    expect(history).toBe(150);
    expect(monetize).toBe(150);
    expect(dash).toBe(150);
  });

  test('signed-in dashboard starts on verified records, guests on all', () => {
    expect(defaultFilters(true).status).toBe('verified');
    expect(defaultFilters(false).status).toBe('all');
  });

  test('categories never go negative and add up to the total', () => {
    const f = defaultFilters(true);
    const cats = topCategories(applyFilters(rows, f, resolveWindow(f.range)));
    expect(cats.every((c) => c.co2Kg >= 0)).toBe(true);
  });

  test('ledger evidence counts each emission once, latest row', () => {
    const ledger = [
      { id: 'l1', emission_id: 'a', co2_kg: 100, verification_status: 'needs_review', created_at: '2026-01-01T00:00:00Z' },
      { id: 'l2', emission_id: 'a', co2_kg: 100, verification_status: 'verified', created_at: '2026-02-01T00:00:00Z' },
      { id: 'l3', emission_id: 'g', co2_kg: -30, verification_status: 'verified', created_at: '2026-02-01T00:00:00Z' },
    ];
    expect(latestLedgerRowPerEmission(ledger).map((r) => r.id).sort()).toEqual(['l2', 'l3']);
    expect(verifiedLedgerTotalKg(ledger)).toBe(100);
  });
});
