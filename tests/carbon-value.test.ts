import { describe, expect, test } from 'bun:test';
import { creditValuation, CONFIRMED_CREDIT_PRICE, CREDIT_VALUE_WITHHELD, kgToTonnes, sumVerifiedKgOncePerEmission } from '../src/lib/carbonValue';
import * as server from '../supabase/functions/_shared/carbonValue';

describe('credit valuation is withheld without reductions and a dated price', () => {
  test('no confirmed price today, so emissions never become rupees', () => {
    expect(CONFIRMED_CREDIT_PRICE).toBeNull();
    expect(creditValuation(5_000_000)).toEqual({ available: false, reason: 'no_dated_price' });
    expect(CREDIT_VALUE_WITHHELD).not.toMatch(/₹|750/);
  });
  test('no verified reductions: withheld whatever the price', () => {
    const price = { inrPerT: 900, source: 'Exchange close', asOf: '2026-10-01' };
    expect(creditValuation(0, price)).toEqual({ available: false, reason: 'no_verified_reductions' });
    expect(creditValuation(-10, price).available).toBe(false);
    expect(creditValuation(Number.NaN, price).available).toBe(false);
  });
  test('a price without source or date is not used', () => {
    expect(creditValuation(1000, { inrPerT: 900, source: '', asOf: '2026-10-01' }).available).toBe(false);
    expect(creditValuation(1000, { inrPerT: 900, source: 'X', asOf: ' ' }).available).toBe(false);
  });
  test('with both, value is reduction tonnes x the dated price', () => {
    const price = { inrPerT: 900, source: 'Exchange close', asOf: '2026-10-01' };
    expect(creditValuation(2500, price)).toEqual({ available: true, valueInr: 2250, price });
  });
  test('browser and server copies agree', () => {
    expect(server.CONFIRMED_CREDIT_PRICE).toBe(CONFIRMED_CREDIT_PRICE);
    expect(server.CREDIT_VALUE_WITHHELD).toBe(CREDIT_VALUE_WITHHELD);
    const price = { inrPerT: 900, source: 'S', asOf: '2026-10-01' };
    expect(server.creditValuation(2500, price)).toEqual(creditValuation(2500, price));
  });
  test('kgToTonnes never negative', () => {
    expect(kgToTonnes(undefined)).toBe(0);
    expect(kgToTonnes(-500)).toBe(0);
  });
  test('counts each emission once and skips unverified', () => {
    const rows = [
      { id: 'a', kg: 100, v: true }, { id: 'a', kg: 100, v: true },
      { id: 'b', kg: 50, v: false }, { id: null, kg: 10, v: true },
    ];
    expect(sumVerifiedKgOncePerEmission(rows, r => r.id, r => r.kg, r => r.v)).toBe(110);
  });
});
