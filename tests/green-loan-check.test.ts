import { describe, expect, test } from 'bun:test';
import { checkReadiness, summaryText } from '../src/lib/greenLoanCheck';

describe('guest green-loan check', () => {
  test('a visitor without a carbon footprint gets carbon as the next step', () => {
    const r = checkReadiness({ business: 'textiles', funding: '10l-50l', turnover: '1cr-5cr', use: 'solar', carbon: 'none', gst: 'yes', itr: 'yes' });
    expect(r.carbonNext).toBe(true);
    expect(r.lines.find((l) => l.id === 'carbon')?.state).toBe('next');
    expect(r.lines.filter((l) => l.state === 'ready').map((l) => l.id)).toEqual(['gst', 'itr', 'use']);
  });
  test('an estimate is not a measured footprint', () => {
    expect(checkReadiness({ carbon: 'estimate' }).carbonNext).toBe(true);
    expect(checkReadiness({ carbon: 'measured' }).carbonNext).toBe(false);
  });
  test('the result never claims eligibility, approval or a rate', () => {
    const text = JSON.stringify(checkReadiness({}));
    expect(text).not.toMatch(/eligib|approv|guarantee|interest rate|%/i);
  });
  test('the inbox summary names every answer in words', () => {
    const s = summaryText({ business: 'metals', funding: 'gt10cr', turnover: 'gt100cr', use: 'ev', carbon: 'measured', gst: 'no', itr: 'unsure' });
    expect(s).toContain('Metals & casting');
    expect(s).toContain('Above ₹10 crore');
    expect(s).toContain('Carbon footprint: Yes, measured from our invoices and bills');
    expect(s).toContain('ITR filed for recent years: Not sure');
  });
});
