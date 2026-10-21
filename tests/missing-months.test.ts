import { describe, expect, test } from 'bun:test';
import { missingElectricityMonths } from '../src/lib/missingMonths';

const bill = (d: string, extra: Partial<{ scope: number; category: string }> = {}) => ({ scope: 2, category: 'electricity', activity_date: d, created_at: '2026-10-01T00:00:00Z', ...extra });

describe('missingElectricityMonths', () => {
  test('flags only months between the first and last bill', () => {
    expect(missingElectricityMonths([bill('2026-04-10'), bill('2026-07-08'), bill('2026-05-02')])).toEqual(['2026-06']);
  });
  test('nothing with one bill or no gaps', () => {
    expect(missingElectricityMonths([bill('2026-04-10')])).toEqual([]);
    expect(missingElectricityMonths([bill('2026-04-10'), bill('2026-05-10')])).toEqual([]);
  });
  test('ignores other categories and crosses the year', () => {
    expect(missingElectricityMonths([bill('2025-11-03'), bill('2026-02-01'), bill('2025-12-20', { scope: 1, category: 'diesel' })])).toEqual(['2025-12', '2026-01']);
  });
});
