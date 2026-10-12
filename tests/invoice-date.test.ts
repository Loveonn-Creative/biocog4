import { describe, expect, test } from 'bun:test';
import { activityDate, fiscalPeriod, parseInvoiceDate } from '../supabase/functions/_shared/invoiceDate';
import { applyFilters, monthlySeries, resolveWindow, DEFAULT_FILTERS } from '../src/lib/dashboardAnalytics';
import { verifiedMonthlyTrend } from '../src/lib/emissionLedger';

const now = new Date('2026-10-12T10:00:00Z');

describe('reporting periods follow the invoice date', () => {
  test('only a real YYYY-MM-DD date is accepted', () => {
    expect(parseInvoiceDate('2026-09-01', now)).toBe('2026-09-01');
    expect(parseInvoiceDate(' 2026-02-28 ', now)).toBe('2026-02-28');
    expect(parseInvoiceDate('2026-02-30', now)).toBeNull();
    expect(parseInvoiceDate('05/09/2026', now)).toBeNull(); // never guessed
    expect(parseInvoiceDate('1999-12-31', now)).toBeNull();
    expect(parseInvoiceDate('2027-06-01', now)).toBeNull(); // far future
    expect(parseInvoiceDate(null, now)).toBeNull();
  });
  test('activity date falls back to the upload date', () => {
    expect(activityDate('2026-03-15', '2026-10-01T00:00:00Z')).toBe('2026-03-15');
    expect(activityDate('bad', '2026-10-01T00:00:00Z')).toBe('2026-10-01T00:00:00Z');
  });
  test('Indian financial year and quarter from the invoice date', () => {
    expect(fiscalPeriod('2026-03-31')).toEqual({ fiscalYear: 'FY2025-2026', fiscalQuarter: 'Q4' });
    expect(fiscalPeriod('2026-04-01')).toEqual({ fiscalYear: 'FY2026-2027', fiscalQuarter: 'Q1' });
    expect(fiscalPeriod('2026-12-10')).toEqual({ fiscalYear: 'FY2026-2027', fiscalQuarter: 'Q3' });
  });
  test('a March bill uploaded in October counts in March', () => {
    const row = { id: 'a', document_id: 'd', scope: 2, co2_kg: 10, verified: true, category: 'electricity', created_at: new Date().toISOString(), activity_date: '2026-03-15' } as any;
    expect(verifiedMonthlyTrend([row]).map((b) => b.key)).toEqual(['2026-03']);
    const last30 = { ...DEFAULT_FILTERS, range: '30d' as const };
    expect(applyFilters([row], last30, resolveWindow('30d'))).toHaveLength(0);
    const all = { ...DEFAULT_FILTERS, range: 'all' as const };
    expect(monthlySeries(applyFilters([row], all, resolveWindow('all')), resolveWindow('all'))[0].scope2).toBe(10);
  });
});
