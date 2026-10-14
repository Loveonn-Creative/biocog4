import { describe, expect, test } from 'bun:test';
import {
  aggregate, canonicalJson, classifyLine, documentChecks, evaluateDocument, evaluateLine, invoiceKeyMaterial,
  isValidGstin, resolveFactor, sealExtraction, type Scope3Factor, type SealedDocument, type SealedLine, type StoredLine,
} from '../supabase/functions/_shared/scope3';

// Placeholder factors for arithmetic tests only. Real factors come from the
// approved registry with their source, version, geography and material.
const GSTIN = '27AAPFU0939F1ZV';
const STEEL: Scope3Factor = {
  id: 'f-steel', factorKey: 'TEST_STEEL_HR', version: '1', scope3Category: 1, materialKey: 'hsn:7208', geography: 'IN',
  unit: 'tonne', kgPerUnit: 2000, dataClass: 'secondary_factor', sourceName: 'Test source', sourceRef: 'T1', publicationYear: 2025,
  validFrom: '2025-01-01', validTo: null,
};
const ROAD: Scope3Factor = { ...STEEL, id: 'f-road', factorKey: 'TEST_ROAD', scope3Category: 4, materialKey: 'freight:road', unit: 'tkm', kgPerUnit: 0.1 };
const SUPPLIER_STEEL: Scope3Factor = { ...STEEL, id: 'f-sup', factorKey: 'TEST_SUPPLIER_STEEL', geography: `SUPPLIER:${GSTIN}`, kgPerUnit: 1500, dataClass: 'supplier_specific_factor' };

const line = (p: Partial<SealedLine> = {}): SealedLine => ({
  index: 0, description: 'HR steel coil', hsn: '720810', quantity: 2, unit: 'MT', unitPrice: 50000, total: 100000,
  sourcePage: 1, sourceText: 'HR Coil 2 MT', logistics: null, ...p,
});
const doc = (lines: SealedLine[], p: Partial<SealedDocument> = {}): SealedDocument => ({
  documentType: 'invoice', vendor: 'Steel Co', invoiceNumber: 'INV-0042', date: '2026-04-10', supplierGstin: GSTIN, buyerGstin: null,
  amount: 118000, subtotal: lines.reduce((a, l) => a + (l.total ?? 0), 0), taxAmount: 18000, currency: 'INR', lines, ...p,
});

describe('sealed extraction', () => {
  test('keeps printed values only; never reads the unit from the description', () => {
    const s = sealExtraction({
      documentType: 'invoice', supplierGstin: ' 27aapfu0939f1zv ', amount: '1,18,000', date: '2026-04-10',
      lineItems: [{ description: 'Indane LPG cylinder 14.2 kg', quantity: 3, unit: null, total: '2,700', hsn_code: '2711.12', sourcePage: 9 }],
    }, 2);
    expect(s.supplierGstin).toBe(GSTIN);
    expect(s.amount).toBe(118000);
    expect(s.lines[0].unit).toBeNull();
    expect(s.lines[0].hsn).toBe('271112');
    expect(s.lines[0].total).toBe(2700);
    expect(s.lines[0].sourcePage).toBeNull(); // page 9 of 2 is not a page
  });
  test('canonical JSON is key-order independent', () => {
    expect(canonicalJson({ b: 1, a: [1, { d: 2, c: null }] })).toBe(canonicalJson({ a: [1, { c: null, d: 2 }], b: 1 }));
  });
});

describe('supplier identity and invoice key', () => {
  test('GSTIN check character', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
    expect(isValidGstin('29AAGCB7383J1Z4')).toBe(true);
    expect(isValidGstin('27AAPFU0939F1ZX')).toBe(false);
    expect(isValidGstin('27AAPFU0939F1Z')).toBe(false);
  });
  test('the same invoice number in another style is the same invoice', () => {
    const a = invoiceKeyMaterial(doc([line()], { invoiceNumber: 'INV/0042' }));
    const b = invoiceKeyMaterial(doc([line()], { invoiceNumber: 'inv-42' }));
    expect(a).toBe(`${GSTIN}|INV0042|2026-04-10`);
    expect(invoiceKeyMaterial(doc([line()], { invoiceNumber: null }))).toBeNull();
    expect(b).not.toBe(a); // "INV42" is not "INV0042": only leading zeros of a pure number are dropped
  });
});

describe('classification', () => {
  test('goods, capital goods, services, fuel and electricity', () => {
    expect(classifyLine(line()).category).toBe(1);
    expect(classifyLine(line()).materialKeys).toEqual(['hsn:720810', 'hsn:7208']);
    const laptop = classifyLine(line({ hsn: '8471', description: 'Laptop' }));
    expect(laptop.category).toBe(2);
    expect(laptop.review).toContain('capitalisation_unconfirmed');
    expect(classifyLine(line({ hsn: '2716' })).scope).toBe(2);
    expect(classifyLine(line({ hsn: '271019', description: 'HSD diesel' })).scope).toBe(1);
    expect(classifyLine(line({ hsn: '998311', description: 'Consulting' })).category).toBe(1);
  });
  test('freight by SAC or keyword, with the mode from printed text', () => {
    const f = classifyLine(line({ hsn: '996511', description: 'Road freight Pune to Chennai' }));
    expect(f.category).toBe(4);
    expect(f.materialKeys).toEqual(['freight:road']);
    // "transportation" is freight, not coal combustion.
    const coal = classifyLine(line({ hsn: null, description: 'Coal transportation charges' }));
    expect(coal.category).toBe(4);
    expect(coal.missing).toContain('missing_mode');
  });
  test('nothing matches: unclassified, not a guess', () => {
    const c = classifyLine(line({ hsn: null, description: 'Misc charges' }));
    expect(c.category).toBeNull();
    expect(c.missing).toEqual(['unclassified']);
  });
});

describe('factor resolution', () => {
  const c = classifyLine(line());
  test("supplier's own factor first, then the country, never another country", () => {
    expect(resolveFactor(c, doc([line()]), [STEEL, SUPPLIER_STEEL])).toMatchObject({ factor: { id: 'f-sup' }, tier: 'supplier' });
    expect(resolveFactor(c, doc([line()]), [STEEL])).toMatchObject({ factor: { id: 'f-steel' }, tier: 'country' });
    expect(resolveFactor(c, doc([line()]), [{ ...STEEL, geography: 'DE' }])).toMatchObject({ factor: null, reason: 'no_factor' });
  });
  test('no material fallback above the HSN heading, and dates must fit', () => {
    expect(resolveFactor(c, doc([line()]), [{ ...STEEL, materialKey: 'hsn:72' }])).toMatchObject({ factor: null });
    expect(resolveFactor(c, doc([line()]), [{ ...STEEL, validTo: '2025-12-31' }])).toMatchObject({ factor: null });
  });
  test('two different approved factors for one line are ambiguous', () => {
    expect(resolveFactor(c, doc([line()]), [STEEL, { ...STEEL, id: 'x', factorKey: 'OTHER' }])).toMatchObject({ factor: null, reason: 'factor_ambiguous' });
  });
  test('no valid GSTIN, no geography', () => {
    expect(resolveFactor(c, doc([line()], { supplierGstin: null }), [STEEL])).toMatchObject({ factor: null, reason: 'supplier_identity' });
  });
});

describe('one invoice, end to end', () => {
  test('verified only with printed activity, an approved factor and every check passing', () => {
    const d = doc([line()]);
    const r = evaluateDocument(d, [STEEL]).lines[0];
    expect(r.status).toBe('verified');
    expect(r.kgCo2e).toBe(4000);
    expect(r.activityQty).toBe(2);
    expect(r.activityUnit).toBe('tonne');
    expect(r.formula).toBe('2 MT = 2000 kg = 2 tonne x 2000 kgCO2e/tonne (TEST_STEEL_HR v1) = 4000 kgCO2e');
    expect(r.dataClass).toBe('secondary_factor');
    expect(r.confidence).toBe('low'); // 4-digit heading factor
    expect(Object.values(r.checks).every((v) => v !== 'fail')).toBe(true);
  });
  test('a missing quantity blocks the number: Needs Data, never an estimate', () => {
    const d = doc([line({ quantity: null, unitPrice: null })]);
    const r = evaluateDocument(d, [STEEL]).lines[0];
    expect(r.status).toBe('needs_data');
    expect(r.kgCo2e).toBeNull();
    expect(r.reasons).toContain('missing_quantity');
    expect(r.nextAction).toMatch(/quantity/);
  });
  test('no approved factor: Needs Data with a next step', () => {
    const r = evaluateDocument(doc([line()]), []).lines[0];
    expect(r.status).toBe('needs_data');
    expect(r.dataClass).toBe('unverified');
    expect(r.reasons).toEqual(['no_factor']);
  });
  test('totals that do not reconcile: calculated but held for review', () => {
    const d = doc([line()], { subtotal: 150000 });
    const r = evaluateDocument(d, [STEEL]).lines[0];
    expect(r.kgCo2e).toBe(4000);
    expect(r.status).toBe('needs_review');
    expect(r.reasons).toContain('invoice_totals');
  });
  test('quantity x rate must equal the line total when all are printed', () => {
    const d = doc([line({ unitPrice: 60000 })]);
    expect(evaluateDocument(d, [STEEL]).lines[0].reasons).toContain('line_math');
  });
  test('the same line twice is flagged', () => {
    const d = doc([line(), line({ index: 1 })]);
    expect(evaluateDocument(d, [STEEL]).lines.every((l) => l.reasons.includes('duplicate_line'))).toBe(true);
  });
  test("a unit that cannot convert to the factor's unit is not forced", () => {
    const d = doc([line({ unit: 'nos', unitPrice: 50000 })]);
    const r = evaluateDocument(d, [STEEL]).lines[0];
    expect(r.kgCo2e).toBeNull();
    expect(r.reasons).toContain('unit_mismatch');
  });
  test('freight: printed weight x distance, or Needs Data', () => {
    const fl = line({ description: 'Road freight', hsn: '996511', quantity: 1, unit: 'trip', unitPrice: 20000, total: 20000, logistics: { mode: 'Road', weightKg: 12000, distanceKm: 1180, origin: 'Pune', destination: 'Chennai' } });
    const r = evaluateDocument(doc([fl]), [ROAD]).lines[0];
    expect(r.status).toBe('verified');
    expect(r.activityQty).toBe(14160);
    expect(r.kgCo2e).toBe(1416);
    expect(r.formula).toBe('12000 kg / 1000 x 1180 km = 14160 t-km x 0.1 kgCO2e/tkm (TEST_ROAD v1) = 1416 kgCO2e');
    const noWeight = evaluateDocument(doc([{ ...fl, logistics: { ...fl.logistics!, weightKg: null } }]), [ROAD]).lines[0];
    expect(noWeight.status).toBe('needs_data');
    expect(noWeight.reasons).toContain('missing_weight');
  });
  test('fuel and electricity lines are not Scope 3', () => {
    expect(evaluateDocument(doc([line({ hsn: '2716', description: 'Electricity' })]), [STEEL]).lines[0].status).toBe('not_scope3');
  });
  test('capital goods stay in review until capitalisation is confirmed', () => {
    const r = evaluateDocument(doc([line({ hsn: '847130', description: 'Laptop', unit: 'nos', quantity: 2, unitPrice: 50000 })]), []).lines[0];
    expect(r.scope3Category).toBe(2);
    expect(r.reasons).toContain('capitalisation_unconfirmed');
  });
  test('no invoice number: cannot be deduplicated, so not verified', () => {
    const r = evaluateDocument(doc([line()], { invoiceNumber: null }), [STEEL]).lines[0];
    expect(r.status).toBe('needs_review');
    expect(r.reasons).toContain('invoice_identity');
  });
  test('line totals missing: invoice cannot be reconciled', () => {
    expect(documentChecks(doc([line({ total: null, unitPrice: null })], { subtotal: 100000 })).reasons).toContain('line_totals_missing');
  });
  test('same input, same output', () => {
    const d = doc([line()]);
    expect(canonicalJson(evaluateLine(d.lines[0], d, documentChecks(d), [STEEL]))).toBe(canonicalJson(evaluateLine(d.lines[0], d, documentChecks(d), [STEEL])));
  });
});

describe('aggregation', () => {
  test('only verified lines count; duplicates and other scopes never do', () => {
    const rows: StoredLine[] = [
      { status: 'verified', scope3Category: 1, supplierGstin: GSTIN, supplierName: 'Steel Co', kgCo2e: 4000, lineTotal: 100000, dataClass: 'secondary_factor' },
      { status: 'duplicate', scope3Category: 1, supplierGstin: GSTIN, supplierName: 'Steel Co', kgCo2e: 4000, lineTotal: 100000, dataClass: 'secondary_factor' },
      { status: 'needs_review', scope3Category: 1, supplierGstin: GSTIN, supplierName: 'Steel Co', kgCo2e: 4000, lineTotal: 100000, dataClass: 'secondary_factor' },
      { status: 'needs_data', scope3Category: 4, supplierGstin: null, supplierName: 'Transporter', kgCo2e: null, lineTotal: 20000, dataClass: 'unverified' },
      { status: 'not_scope3', scope3Category: null, supplierGstin: GSTIN, supplierName: 'Steel Co', kgCo2e: null, lineTotal: 1, dataClass: 'unverified' },
    ];
    const a = aggregate(rows);
    expect(a.totalKg).toBe(4000);
    expect(a.byCategory.get(1)).toBe(4000);
    expect(a.lines).toBe(3);
    expect(a.verifiedLines).toBe(1);
    expect(a.needsData).toBe(1);
    expect(a.needsReview).toBe(1);
    expect(a.bySupplier.get(GSTIN)).toMatchObject({ kg: 4000, verifiedLines: 1, lines: 2 });
  });
});
