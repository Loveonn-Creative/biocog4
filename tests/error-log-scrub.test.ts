import { describe, expect, it } from 'bun:test';
import { scrubForLog } from '../src/lib/reliability/errorLog';

describe('scrubForLog', () => {
  it('removes emails, record ids and long numbers', () => {
    expect(scrubForLog('Invalid email asha.k@example.co.in for user')).toBe('Invalid email [email] for user');
    expect(scrubForLog('/history/3f2b8c1e-9a4d-4c2e-8b1a-1234567890ab')).toBe('/history/[id]');
    expect(scrubForLog('Call +91 98765 43210 now')).toBe('Call # now');
  });
  it('keeps ordinary error text readable', () => {
    expect(scrubForLog("Cannot read properties of undefined (reading 'map')")).toBe("Cannot read properties of undefined (reading 'map')");
    expect(scrubForLog('/answers/msme-loan-sma-0-sma-1-sma-2-meaning')).toBe('/answers/msme-loan-sma-0-sma-1-sma-2-meaning');
  });
});
