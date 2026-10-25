import { describe, expect, test } from 'bun:test';
import {
  cylinderToKg, fileCheck, guideDocument, guideLine, invoiceIdentity, normalizeDocumentType,
  parseAiJson, parseAmount, parseQuantity, providerFailure,
} from '../supabase/functions/_shared/extractionRead.ts';

describe('reading AI output', () => {
  test('numbers with commas, rupee signs and spaces', () => {
    expect(parseAmount('1,250.50')).toBe(1250.5);
    expect(parseAmount('₹ 12,345')).toBe(12345);
    expect(parseAmount('Rs. 900')).toBe(900);
    expect(parseAmount(42)).toBe(42);
    expect(parseAmount('about 40')).toBeNull();
    expect(parseAmount('12 litres')).toBeNull();
    expect(parseQuantity('0')).toBeUndefined();
    expect(parseQuantity('1,200')).toBe(1200);
  });
  test('JSON with fences or a sentence around it', () => {
    expect(parseAiJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseAiJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseAiJson('Here is the data:\n{"a":{"b":2}}\nDone.')).toEqual({ a: { b: 2 } });
    expect(() => parseAiJson('no data here')).toThrow();
  });
  test('document types as models phrase them', () => {
    expect(normalizeDocumentType('Tax Invoice')).toBe('invoice');
    expect(normalizeDocumentType('Electricity Bill')).toBe('bill');
    expect(normalizeDocumentType('Fuel slip')).toBe('receipt');
    expect(normalizeDocumentType('Renewable energy certificate')).toBe('certificate');
    expect(normalizeDocumentType(null)).toBe('unknown');
    expect(normalizeDocumentType('passport')).toBe('passport');
  });
});

describe('same invoice, different file', () => {
  const inv = { supplierGstin: '27AAPFU0939F1ZV', invoiceNumber: 'INV/2026/0042', date: '2026-09-14' };
  test('GSTIN, number and date identify an invoice; punctuation and case do not matter', () => {
    expect(invoiceIdentity(inv)).toBe(invoiceIdentity({ ...inv, invoiceNumber: 'inv-2026-0042', supplierGstin: '27aapfu0939f1zv' }));
    expect(invoiceIdentity(inv)).not.toBe(invoiceIdentity({ ...inv, invoiceNumber: 'INV/2026/0043' }));
    expect(invoiceIdentity(inv)).not.toBe(invoiceIdentity({ ...inv, date: '2026-09-15' }));
  });
  test('no GSTIN: supplier name stands in; too little printed: no identity', () => {
    expect(invoiceIdentity({ vendor: 'Shree Fuels', invoiceNumber: '118', date: '2026-01-02' })).toContain('V:SHREEFUELS');
    expect(invoiceIdentity({ vendor: 'AB', invoiceNumber: '118', date: '2026-01-02' })).toBeNull();
    expect(invoiceIdentity({ ...inv, date: '14/09/2026' })).toBeNull();
    expect(invoiceIdentity({ ...inv, invoiceNumber: '' })).toBeNull();
  });
  test('electricity bills: supplier, period, units and amount', () => {
    const bill = { vendor: 'MSEDCL', billingPeriodStart: '2026-08-01', billingPeriodEnd: '2026-08-31', unitsConsumedKwh: '4,200', amount: '38,950' };
    expect(invoiceIdentity(bill)).toBe('bill|V:MSEDCL|2026-08-01|2026-08-31|4200|38950');
    expect(invoiceIdentity({ ...bill, unitsConsumedKwh: null })).toBeNull();
  });
});

describe('file checks and our-side failures', () => {
  test('type and size', () => {
    expect(fileCheck(Buffer.from('%PDF-1.7 hello').toString('base64'), 'application/pdf').ok).toBe(true);
    expect(fileCheck('aGVsbG8=', 'text/plain')).toMatchObject({ ok: false, status: 415 });
    expect(fileCheck('A'.repeat(24), 'image/png', 10)).toMatchObject({ ok: false, status: 413 });
  });

  test('the content must really be a PDF or photo, whatever the declared type', () => {
    const b64 = (b: number[] | string) => Buffer.from(b as any).toString('base64');
    const tail = 'x'.repeat(40);
    expect(fileCheck(b64([0xff, 0xd8, 0xff, 0xe1, ...Buffer.from(tail)]), 'image/jpeg').ok).toBe(true);
    expect(fileCheck(b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(tail)]), 'image/png').ok).toBe(true);
    expect(fileCheck(b64('RIFF\x00\x00\x00\x00WEBPVP8 ' + tail), 'image/webp').ok).toBe(true);
    expect(fileCheck(b64('\x00\x00\x00\x18ftypheic' + tail), 'image/heic').ok).toBe(true);
    // A phone that labels a HEIC photo as JPEG still gets read.
    expect(fileCheck(b64('\x00\x00\x00\x18ftypmif1' + tail), 'image/jpeg').ok).toBe(true);
    // A PDF header after a few junk bytes, as some scanners write.
    expect(fileCheck(b64('\r\n%PDF-1.4 ' + tail), 'application/pdf').ok).toBe(true);
    // Anything else is refused before any read or storage write.
    expect(fileCheck(b64('MZ\x90\x00 windows program ' + tail), 'application/pdf')).toMatchObject({ ok: false, status: 415 });
    expect(fileCheck(b64('PK\x03\x04 zip or xlsx ' + tail), 'application/pdf')).toMatchObject({ ok: false, status: 415 });
    expect(fileCheck(b64('<script>alert(1)</script>' + tail), 'image/png')).toMatchObject({ ok: false, status: 415 });
    expect(fileCheck('', 'image/jpeg')).toMatchObject({ ok: false, status: 415 });
  });
  test('provider failures never blame the image', () => {
    for (const s of [undefined, 400, 404, 500, 503]) {
      expect(providerFailure(s).message).toMatch(/Nothing was counted/);
      expect(providerFailure(s).message).not.toMatch(/file|photo|image|PDF/i);
    }
    expect(providerFailure(429)).toMatchObject({ status: 429, code: 'ai_busy' });
    expect(providerFailure(402).status).toBe(503);
  });
});

describe('missing data: one plain next step', () => {
  test('counted and avoided lines need nothing', () => {
    expect(guideLine({ productCategory: 'FUEL', co2Kg: 26.8 }).status).toBe('counted');
    expect(guideLine({ productCategory: 'SOLAR_PANELS', avoidedCo2Kg: 5 }).status).toBe('avoided');
  });
  test('fuel without litres points to the fuel slip', () => {
    const g = guideLine({ productCategory: 'FUEL', fuelType: 'DIESEL', description: 'HSD' });
    expect(g).toMatchObject({ status: 'needs_data', need: 'Litres or kg' });
    expect(g.nextStep).toMatch(/fuel slip/);
  });
  test('kVAh-only bills ask for kWh', () => {
    expect(guideLine({ productCategory: 'ELECTRICITY', quantity: 900, unit: 'kVAh', validationFlags: ['billed consumption is printed in kVAh'] }).nextStep).toMatch(/kWh/);
  });
  test('purchased goods are kept as Scope 3 evidence, not an error', () => {
    expect(guideLine({ productCategory: 'RAW_MATERIAL', quantity: 10, unit: 'kg' }).status).toBe('not_covered');
  });
  test('unclassified lines', () => {
    expect(guideLine({ description: 'Misc' }).status).toBe('unclassified');
  });
  test('document summary picks the step that unlocks a calculation', () => {
    const d = guideDocument([
      { productCategory: 'RAW_MATERIAL', quantity: 10, unit: 'kg' },
      { productCategory: 'FUEL', fuelType: 'DIESEL' },
      { productCategory: 'ELECTRICITY', co2Kg: 710 },
    ]);
    expect(d).toMatchObject({ counted: 1, needsData: 1, notCovered: 1 });
    expect(d.nextStep).toMatch(/fuel slip/);
    expect(guideDocument([{ productCategory: 'FUEL', co2Kg: 2 }]).nextStep).toBeNull();
  });
});

describe('cylinders', () => {
  test('converts only with the size printed on the line', () => {
    expect(cylinderToKg({ description: 'Commercial LPG cylinder 19 kg', quantity: 2, unit: 'Nos' })).toEqual({ quantity: 38, unit: 'kg' });
    expect(cylinderToKg({ description: 'LPG 14.2KG refill', quantity: 3, unit: 'cyl' })).toEqual({ quantity: 42.6, unit: 'kg' });
    expect(cylinderToKg({ description: 'Commercial LPG cylinder', quantity: 2, unit: 'Nos' })).toBeNull();
    expect(cylinderToKg({ description: 'Steel bolts 5 kg box', quantity: 2, unit: 'Nos' })).toBeNull();
    expect(cylinderToKg({ description: 'LPG 19 kg', quantity: 38, unit: 'kg' })).toBeNull();
  });
});
