import { describe, expect, test } from 'bun:test';
import { daysUntilIst, msUntilNextIstMidnight } from '../src/lib/calendarDays';

describe('daysUntilIst', () => {
  test('counts calendar days in India time', () => {
    // 11 Oct 2026, 10:00 IST
    const now = Date.UTC(2026, 9, 11, 4, 30);
    expect(daysUntilIst('2027-09-30', now)).toBe(354);
  });
  test('changes at midnight IST, not UTC', () => {
    const before = Date.UTC(2026, 9, 11, 18, 29); // 23:59 IST on 11 Oct
    const after = Date.UTC(2026, 9, 11, 18, 31);  // 00:01 IST on 12 Oct
    expect(daysUntilIst('2027-09-30', before)).toBe(354);
    expect(daysUntilIst('2027-09-30', after)).toBe(353);
  });
  test('never negative, zero on the day', () => {
    expect(daysUntilIst('2027-09-30', Date.UTC(2027, 8, 30, 6))).toBe(0);
    expect(daysUntilIst('2027-09-30', Date.UTC(2028, 0, 1))).toBe(0);
  });
  test('next midnight is within a day', () => {
    const ms = msUntilNextIstMidnight(Date.UTC(2026, 9, 11, 18, 29));
    expect(ms).toBe(60_000);
  });
});
