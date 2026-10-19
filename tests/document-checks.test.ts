import { describe, expect, test } from 'bun:test';
import { isInfoNote, splitDocumentNotes } from '../supabase/functions/_shared/documentChecks';
import { electricityBillIdentity } from '../supabase/functions/_shared/extractionRead';

describe('Checks count only what weakens the document', () => {
  test('notes on how a value was read are information, not checks', () => {
    expect(isInfoNote('"Units consumed": unit "units" read as kWh (electricity billing unit)')).toBe(true);
    expect(isInfoNote('"Units consumed": printed kWh read as grid electricity')).toBe(true);
    expect(isInfoNote('Billed consumption 4200 kWh taken from the printed units on the bill')).toBe(true);
    expect(isInfoNote('India grid factor used: no country is set in Settings')).toBe(true);
  });
  test('missing GSTIN, invoice number and date stay checks (owner decision)', () => {
    const { checks, info } = splitDocumentNotes(['Missing supplier GSTIN', 'Missing invoice number', 'Missing invoice date', 'Billed consumption 10 kWh taken from the printed units on the bill']);
    expect(checks).toEqual(['Missing supplier GSTIN', 'Missing invoice number', 'Missing invoice date']);
    expect(info).toHaveLength(1);
  });
  test('real problems stay checks', () => {
    expect(isInfoNote('Electricity bill: billed units (kWh) not found on the bill, so emissions cannot be calculated')).toBe(false);
    expect(isInfoNote('Unclassified: Packing material')).toBe(false);
  });
});

describe('electricity bill identity', () => {
  const base = { supplierGstin: '27AAECM2933K1ZB', vendor: 'MSEDCL', billingPeriodStart: '2026-08-01', billingPeriodEnd: '2026-08-31', unitsConsumedKwh: '4,200' };
  test('supplier, period and units only: amount and bill number do not change it', () => {
    expect(electricityBillIdentity(base)).toBe('elec|G:27AAECM2933K1ZB|2026-08-01|2026-08-31|4200');
    expect(electricityBillIdentity({ ...base, unitsConsumedKwh: 4200 })).toBe(electricityBillIdentity(base));
  });
  test('any missing part gives no identity', () => {
    expect(electricityBillIdentity({ ...base, billingPeriodEnd: undefined })).toBeNull();
    expect(electricityBillIdentity({ ...base, unitsConsumedKwh: null })).toBeNull();
    expect(electricityBillIdentity({ ...base, supplierGstin: '', vendor: 'AB' })).toBeNull();
  });
  test('a different month or different units is a different bill', () => {
    expect(electricityBillIdentity({ ...base, billingPeriodStart: '2026-09-01', billingPeriodEnd: '2026-09-30' })).not.toBe(electricityBillIdentity(base));
    expect(electricityBillIdentity({ ...base, unitsConsumedKwh: 4201 })).not.toBe(electricityBillIdentity(base));
  });
});
