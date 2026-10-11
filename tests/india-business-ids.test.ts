import { describe, expect, test } from 'bun:test';
import { checkBusinessId, checkCin, checkGstin, checkPan, gstinCheckChar } from '../src/lib/indiaBusinessIds';

describe('GSTIN', () => {
  test('accepts a GSTIN whose check character matches and derives state and PAN', () => {
    // Sample GSTIN widely used in GST documentation.
    const r = checkGstin('27AAPFU0939F1ZV');
    expect(r.status).toBe('format_ok');
    expect(r.facts.state).toBe('Maharashtra');
    expect(r.facts.pan).toBe('AAPFU0939F');
    expect(r.facts.holderType).toBe('Firm or LLP');
  });
  test('rejects a wrong check character', () => {
    const first14 = '27AAPFU0939F1Z';
    const wrong = gstinCheckChar(first14) === 'A' ? 'B' : 'A';
    expect(checkGstin(first14 + wrong).status).toBe('invalid');
  });
  test('rejects an unknown state code and bad shape', () => {
    expect(checkGstin('45AAPFU0939F1ZV').status).toBe('invalid');
    expect(checkGstin('27AAPFU0939F1XV').status).toBe('invalid');
  });
});

describe('PAN', () => {
  test('accepts a company PAN and rejects personal PANs', () => {
    expect(checkPan('AAACR5055K')).toMatchObject({ status: 'format_ok', facts: { holderType: 'Company' } });
    expect(checkPan('ABCPK1234L').status).toBe('invalid');
    expect(checkPan('AAAC5055K').status).toBe('invalid');
  });
});

describe('CIN', () => {
  test('derives listing, state, year and company type', () => {
    const r = checkCin('U72900KA2015PTC082988');
    expect(r.status).toBe('format_ok');
    expect(r.facts).toMatchObject({ listed: false, state: 'Karnataka', yearIncorporated: 2015, companyType: 'Private limited company' });
  });
  test('rejects impossible years and unknown state codes', () => {
    expect(checkCin('U72900KA2999PTC082988').status).toBe('invalid');
    expect(checkCin('U72900ZZ2015PTC082988').status).toBe('invalid');
  });
});

describe('detection', () => {
  test('routes by length and handles empty and wrong lengths', () => {
    expect(checkBusinessId('').status).toBe('idle');
    expect(checkBusinessId('27 aapfu 0939 f1zv').type).toBe('gstin');
    expect(checkBusinessId('12345').status).toBe('invalid');
  });
});
