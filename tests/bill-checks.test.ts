// Bill authentication checks: stored evidence only (cached_result.evidence).
// Each check passes, flags and reports not_checked; the confidence score is
// the same as before the refactor; emission rows gain only factorCitation.
import { describe, expect, test } from 'bun:test';
import {
  buildBillEvidence, deterministicConfidence, monthsBetween, oldBillCheck, quantityByUnit, supplierIdentity, todayIst, totalsCheck, withoutEvidence,
  type BillCheckInput, type ConfidenceParams,
} from '../supabase/functions/_shared/billChecks';
import { gstinCheckChar, gstinFault } from '../supabase/functions/_shared/gstin';
import { buildEmissionRows } from '../supabase/functions/_shared/emissionRows';
import { evidenceGaps } from '../supabase/functions/_shared/verifyGate';
import { FUEL_FACTORS, INDIA_GRID_FACTOR_SOURCE, factorCitationFor } from '../supabase/functions/_shared/emissionFactors';

const NOW = new Date('2026-10-28T06:00:00Z'); // 28 Oct 2026, 11:30 IST
const VALID = '27AAPFU0939F1ZV';
const VALID_2 = '24AAACC1206D1ZM';

const base = (over: Partial<BillCheckInput> = {}): BillCheckInput => ({
  supplierGstin: VALID, buyerGstin: VALID_2, vendor: 'Shree Fuels', accountGstin: VALID_2,
  amount: 1180, subtotal: 1000, taxAmount: 180,
  lineItems: [{ quantity: 100, unit: 'litre', unitPrice: 10, total: 1000, sourcePage: 1, validationFlags: [] }],
  electricityBill: false, invoiceDate: '2026-09-14', now: NOW,
  billKey: null, invoiceKey: `inv|G:${VALID}|A1|2026-09-14`, splitSourceHash: null,
  earlier: [], duplicates: { repeatedLinesDropped: 0, twinDocumentId: null }, confidenceReasons: [],
  ...over,
});
const check = (input: BillCheckInput, id: string) => buildBillEvidence(input).checks.find((c) => c.id === id)!;

const ALL_IDS = ['supplier_gstin_valid', 'buyer_gstin_valid', 'billed_to_you', 'totals_add_up', 'line_prices', 'pages_in_range', 'old_bill', 'electricity_period_overlap', 'supplier_jump', 'duplicates'];

describe('evidence shape', () => {
  test('every check appears with a result, and the summary adds up', () => {
    const e = buildBillEvidence(base());
    expect(e.version).toBe(1);
    expect(e.checks.map((c) => c.id)).toEqual(ALL_IDS);
    for (const c of e.checks) {
      expect(['pass', 'flag', 'not_checked']).toContain(c.result);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.detail.length).toBeGreaterThan(0);
    }
    const s = e.summary;
    expect(s.passed + s.flagged + s.notChecked).toBe(ALL_IDS.length);
    expect(s.checksRun).toBe(s.passed + s.flagged);
    expect(s.duplicatesFound).toBe(0);
  });
  test('an empty read still reports every check, with zeros', () => {
    const e = buildBillEvidence(base({ supplierGstin: null, buyerGstin: null, vendor: null, accountGstin: null, amount: null, subtotal: null, taxAmount: null, lineItems: [], invoiceDate: null, earlier: null }));
    expect(e.checks).toHaveLength(ALL_IDS.length);
    expect(e.summary).toEqual({ checksRun: 1, passed: 1, flagged: 0, notChecked: 9, duplicatesFound: 0 });
  });
  test('never stores the account GSTIN, and GSTINs never appear in a detail', () => {
    const text = JSON.stringify(buildBillEvidence(base({ buyerGstin: VALID, accountGstin: VALID_2 })));
    expect(text).not.toContain(VALID_2);
    expect(text).not.toContain(VALID);
  });
  test('withoutEvidence removes only the evidence key', () => {
    const c = { vendor: 'x', evidence: { version: 1 } };
    expect(withoutEvidence(c)).toEqual({ vendor: 'x' });
    const plain = { vendor: 'x' };
    expect(withoutEvidence(plain)).toBe(plain);
    expect(withoutEvidence(null)).toBeNull();
  });
});

describe('GSTIN checks', () => {
  test('checksum vectors', () => {
    expect(gstinFault(VALID)).toBeNull();
    expect(gstinFault(VALID_2)).toBeNull();
    expect(gstinCheckChar(VALID.slice(0, 14))).toBe('V');
    expect(gstinFault('27AAPFU0939F1ZW')).toBe('check');
    expect(gstinFault('00AAPFU0939F1ZV')).toBe('state');
    expect(gstinFault('27AAPFU0939F1Z')).toBe('shape');
  });
  test('supplier GSTIN: pass, flag, not_checked', () => {
    expect(check(base(), 'supplier_gstin_valid').result).toBe('pass');
    expect(check(base({ supplierGstin: '27 AAPFU 0939F1ZV' }), 'supplier_gstin_valid').result).toBe('pass');
    expect(check(base({ supplierGstin: '27AAPFU0939F1ZW' }), 'supplier_gstin_valid')).toMatchObject({ result: 'flag', detail: expect.stringContaining('check character') });
    expect(check(base({ supplierGstin: '00AAPFU0939F1ZV' }), 'supplier_gstin_valid')).toMatchObject({ result: 'flag', detail: expect.stringContaining('state code') });
    expect(check(base({ supplierGstin: 'ABC' }), 'supplier_gstin_valid')).toMatchObject({ result: 'flag', detail: expect.stringContaining('format') });
    expect(check(base({ supplierGstin: undefined }), 'supplier_gstin_valid').result).toBe('not_checked');
  });
  test('buyer GSTIN: pass, flag, not_checked', () => {
    expect(check(base(), 'buyer_gstin_valid').result).toBe('pass');
    expect(check(base({ buyerGstin: '24AAACC1206D1ZN' }), 'buyer_gstin_valid').result).toBe('flag');
    expect(check(base({ buyerGstin: '' }), 'buyer_gstin_valid').result).toBe('not_checked');
  });
  test('billed to you: pass when equal after normalising, flag when different, else not_checked', () => {
    expect(check(base({ buyerGstin: '24aaacc1206d1zm', accountGstin: '24 AAACC 1206D1ZM' }), 'billed_to_you').result).toBe('pass');
    expect(check(base({ buyerGstin: VALID }), 'billed_to_you').result).toBe('flag');
    expect(check(base({ accountGstin: null }), 'billed_to_you').result).toBe('not_checked');
    expect(check(base({ buyerGstin: null }), 'billed_to_you').result).toBe('not_checked');
  });
  test('billed to you: another state registration of the same business passes; a misread GSTIN is not judged', () => {
    const sameBusinessOtherState = '27AAACC1206D1Z' + gstinCheckChar('27AAACC1206D1Z');
    expect(check(base({ buyerGstin: sameBusinessOtherState, accountGstin: VALID_2 }), 'billed_to_you').result).toBe('pass');
    expect(check(base({ buyerGstin: '24AAACC1206D1ZN', accountGstin: VALID_2 }), 'billed_to_you').result).toBe('not_checked');
  });
});

describe('totals add up', () => {
  test('tolerance: ₹1, or 0.5% of the total when larger', () => {
    expect(totalsCheck(1000, 180, 1180).result).toBe('pass');
    expect(totalsCheck(80, 18, 99).result).toBe('pass'); // ₹1 gap, ₹1 allowed (0.5% is ₹0.50)
    expect(totalsCheck(80, 18, 99.01).result).toBe('flag'); // ₹1.01
    expect(totalsCheck(1000, 180, 1185.9).result).toBe('pass'); // ₹5.90 within 0.5% (₹5.93)
  });
  test('large totals use 0.5%', () => {
    expect(totalsCheck(100000, 18000, 118590).result).toBe('pass'); // 590 <= 592.95
    expect(totalsCheck(100000, 18000, 118600).result).toBe('flag'); // 600 > 593
  });
  test('missing subtotal, tax or total is not_checked', () => {
    expect(totalsCheck(undefined, 180, 1180).result).toBe('not_checked');
    expect(totalsCheck(1000, undefined, 1180).result).toBe('not_checked');
    expect(totalsCheck(1000, 180, undefined).result).toBe('not_checked');
  });
});

describe('line prices and pages', () => {
  test('line prices: flag counts lines with an existing price check', () => {
    const lines = [{ quantity: 10, unitPrice: 10, total: 150, priceCheck: { expected: 100 } }, { quantity: 1, unitPrice: 5, total: 5 }];
    expect(check(base({ lineItems: lines }), 'line_prices')).toMatchObject({ result: 'flag', detail: expect.stringContaining('1 line of 2') });
    expect(check(base(), 'line_prices').result).toBe('pass');
    expect(check(base({ lineItems: [{ quantity: 1, unit: 'kg' }] }), 'line_prices').result).toBe('not_checked');
    expect(check(base({ electricityBill: true }), 'line_prices').result).toBe('not_checked');
  });
  test('pages: flag lines whose page was outside the file', () => {
    const out = { quantity: 1, unit: 'kg', validationFlags: ['Page reference 9 is outside this document; page unknown'] };
    expect(check(base({ lineItems: [out, { sourcePage: 1 }] }), 'pages_in_range')).toMatchObject({ result: 'flag', detail: expect.stringContaining('1 line') });
    expect(check(base(), 'pages_in_range').result).toBe('pass');
    expect(check(base({ lineItems: [{ quantity: 1 }] }), 'pages_in_range').result).toBe('not_checked');
  });
});

describe('old bill', () => {
  test('today is taken in India', () => {
    expect(todayIst(new Date('2026-10-27T19:00:00Z'))).toBe('2026-10-28'); // 00:30 IST
    expect(todayIst(new Date('2026-10-27T18:00:00Z'))).toBe('2026-10-27'); // 23:30 IST
  });
  test('boundary: exactly 12 months is fine, one day more is flagged', () => {
    expect(oldBillCheck('2025-10-28', NOW).result).toBe('pass');
    expect(oldBillCheck('2025-10-27', NOW)).toMatchObject({ result: 'flag', detail: expect.stringContaining('12 months') });
    expect(oldBillCheck('2024-04-01', NOW)).toMatchObject({ result: 'flag', detail: expect.stringContaining('30 months') });
    expect(oldBillCheck('2026-10-01', NOW).result).toBe('pass');
    expect(oldBillCheck('2026-12-01', NOW).result).toBe('pass');
    expect(oldBillCheck(null, NOW).result).toBe('not_checked');
    expect(monthsBetween('2025-10-28', '2026-10-28')).toBe(12);
    expect(monthsBetween('2025-10-29', '2026-10-28')).toBe(11);
  });
});

describe('electricity period overlap', () => {
  const key = (start: string, end: string, units = 342) => `elec|G:${VALID}|${start}|${end}|${units}`;
  const doc = (id: string, start: string, end: string, extra: Record<string, unknown> = {}) => ({
    id, cached_result: { supplierGstin: VALID, billKey: key(start, end), electricityBill: { billingPeriodStart: start, billingPeriodEnd: end, tariffCategory: 'LT-II Commercial', sanctionedLoadKw: 10, ...extra } },
  });
  const elec = (earlier: BillCheckInput['earlier'], over: Partial<BillCheckInput> = {}) => base({
    electricityBill: true, billingPeriodStart: '2026-09-01', billingPeriodEnd: '2026-09-30', tariffCategory: 'LT-II Commercial', sanctionedLoadKw: 10,
    billKey: key('2026-09-01', '2026-09-30', 400), earlier, ...over,
  });
  test('flags an overlapping earlier bill with its document id', () => {
    const c = check(elec([doc('doc-aug', '2026-08-01', '2026-08-31'), doc('doc-mid', '2026-09-15', '2026-10-14')]), 'electricity_period_overlap');
    expect(c.result).toBe('flag');
    expect(c.detail).toContain('doc-mid');
    expect(c.detail).not.toContain('doc-aug');
  });
  test('adjacent periods pass; touching on one day overlaps', () => {
    expect(check(elec([doc('a', '2026-08-01', '2026-08-31')]), 'electricity_period_overlap').result).toBe('pass');
    expect(check(elec([doc('a', '2026-08-01', '2026-09-01')]), 'electricity_period_overlap').result).toBe('flag');
  });
  test('a different connection (tariff or load) or supplier is not compared', () => {
    expect(check(elec([doc('a', '2026-09-01', '2026-09-30', { sanctionedLoadKw: 25 })]), 'electricity_period_overlap').result).toBe('pass');
    expect(check(elec([doc('a', '2026-09-01', '2026-09-30', { tariffCategory: 'HT-I Industrial' })]), 'electricity_period_overlap').result).toBe('pass');
    const other = { id: 'b', cached_result: { billKey: 'elec|V:other discom|2026-09-01|2026-09-30|342', electricityBill: { billingPeriodStart: '2026-09-01', billingPeriodEnd: '2026-09-30' } } };
    expect(check(elec([other]), 'electricity_period_overlap').result).toBe('pass');
  });
  test('not_checked: not electricity, no period or key, or no lookup', () => {
    expect(check(base(), 'electricity_period_overlap').result).toBe('not_checked');
    expect(check(elec([], { billKey: null }), 'electricity_period_overlap').result).toBe('not_checked');
    expect(check(elec([], { billingPeriodStart: null }), 'electricity_period_overlap').result).toBe('not_checked');
    expect(check(elec(null), 'electricity_period_overlap').result).toBe('not_checked');
  });
  test('the detail never carries a consumer, account or meter number', () => {
    const e = JSON.stringify(buildBillEvidence(elec([doc('doc-mid', '2026-09-15', '2026-10-14')])));
    expect(e).not.toMatch(/consumer|account no|meter no/i);
  });
});

describe('supplier jump', () => {
  const past = (id: string, qty: number, extra: Record<string, unknown> = {}) => ({ id, cached_result: { supplierGstin: VALID, vendor: 'Shree Fuels', lineItems: [{ quantity: qty, unit: 'litre' }], ...extra } });
  const three = [past('a', 90), past('b', 100), past('c', 110)];
  test('needs at least 3 earlier bills', () => {
    expect(check(base({ earlier: three.slice(0, 2) }), 'supplier_jump').result).toBe('not_checked');
    expect(check(base({ earlier: three }), 'supplier_jump').result).toBe('pass');
  });
  test('thresholds: more than 3x or less than a third of the median', () => {
    const at = (qty: number) => check(base({ earlier: three, lineItems: [{ quantity: qty, unit: 'litre' }] }), 'supplier_jump').result;
    expect(at(300)).toBe('pass');
    expect(at(301)).toBe('flag');
    expect(at(34)).toBe('pass');
    expect(at(33)).toBe('flag');
  });
  test('uses at most 12 earlier bills, the same supplier, and skips credit notes and copies of this invoice', () => {
    const many = [...Array.from({ length: 12 }, (_, i) => past(`n${i}`, 1000)), past('old1', 100), past('old2', 100), past('old3', 100)];
    expect(check(base({ earlier: many }), 'supplier_jump').result).toBe('flag'); // median 1000 from the latest 12
    const mixed = [past('x', 100, { supplierGstin: VALID_2, vendor: 'Other' }), past('cn', 100, { documentKind: 'credit_note' }), past('twin', 100, { invoiceKey: `inv|G:${VALID}|A1|2026-09-14` }), ...three.slice(0, 2)];
    expect(check(base({ earlier: mixed }), 'supplier_jump').result).toBe('not_checked');
  });
  test('vendor name when no GSTIN, normalised', () => {
    const byName = (id: string) => ({ id, cached_result: { vendor: 'SHREE  FUELS.', lineItems: [{ quantity: 100, unit: 'Litre' }] } });
    expect(supplierIdentity({ vendor: 'Shree Fuels' })).toBe(supplierIdentity({ vendor: 'SHREE  FUELS.' }));
    expect(check(base({ supplierGstin: null, earlier: [byName('a'), byName('b'), byName('c')], lineItems: [{ quantity: 1000, unit: 'litre' }] }), 'supplier_jump').result).toBe('flag');
  });
  test('reference-only lines are left out of the quantity', () => {
    expect([...quantityByUnit([{ quantity: 5, unit: 'kWh' }, { quantity: 6, unit: 'kVAh', referenceNote: 'kept for its printed figure' }])]).toEqual([['kwh', 5]]);
  });
  test('parts of the same PDF are not earlier bills', () => {
    const parts = three.map((d) => ({ ...d, cached_result: { ...d.cached_result, split: { sourceHash: 'h1' } } }));
    expect(check(base({ earlier: parts, splitSourceHash: 'h1' }), 'supplier_jump').result).toBe('not_checked');
  });
});

describe('duplicates are copied, not decided', () => {
  test('repeated lines and an uncounted twin', () => {
    expect(check(base(), 'duplicates').result).toBe('pass');
    const e = buildBillEvidence(base({ duplicates: { repeatedLinesDropped: 2, twinDocumentId: 'doc-twin' } }));
    expect(e.summary.duplicatesFound).toBe(3);
    expect(e.checks.find((c) => c.id === 'duplicates')).toMatchObject({ result: 'flag', detail: expect.stringContaining('doc-twin') });
  });
});

// ============= CONFIDENCE: identical to the function before the refactor =============
// Verbatim copy of calculateDeterministicConfidence from extract-document as it was.
const ORIGINAL_PENALTIES = {
  MISSING_QUANTITY: 20, MISSING_UNIT: 15, MISSING_INVOICE_NUMBER: 10, MISSING_SUPPLIER_GSTIN: 10, MISSING_DATE: 5, MISSING_AMOUNT: 5,
  UNVERIFIABLE_ITEM: 15, MISSING_EMISSION_FACTOR: 10, NO_LINE_ITEMS: 30, LOW_EXTRACTION_RATE: 15, HSN_CLASSIFICATION_BONUS: 5,
} as const;
function originalConfidence(params: ConfidenceParams): number {
  const CONFIDENCE_PENALTIES = ORIGINAL_PENALTIES;
  let confidence = 100;
  if (!params.hasQuantity) confidence -= CONFIDENCE_PENALTIES.MISSING_QUANTITY;
  if (!params.hasUnit) confidence -= CONFIDENCE_PENALTIES.MISSING_UNIT;
  if (!params.hasInvoiceNumber) confidence -= CONFIDENCE_PENALTIES.MISSING_INVOICE_NUMBER;
  if (!params.hasSupplierGstin) confidence -= CONFIDENCE_PENALTIES.MISSING_SUPPLIER_GSTIN;
  if (!params.hasDate) confidence -= CONFIDENCE_PENALTIES.MISSING_DATE;
  if (!params.hasAmount) confidence -= CONFIDENCE_PENALTIES.MISSING_AMOUNT;
  confidence -= params.unverifiableCount * CONFIDENCE_PENALTIES.UNVERIFIABLE_ITEM;
  confidence -= params.missingEmissionFactorCount * CONFIDENCE_PENALTIES.MISSING_EMISSION_FACTOR;
  if (params.lineItemCount === 0) confidence -= CONFIDENCE_PENALTIES.NO_LINE_ITEMS;
  if (params.extractedFieldRatio < 0.5) confidence -= CONFIDENCE_PENALTIES.LOW_EXTRACTION_RATE;
  const hsnBonus = Math.min(params.hsnClassifiedCount * CONFIDENCE_PENALTIES.HSN_CLASSIFICATION_BONUS, 10);
  confidence += hsnBonus;
  return Math.max(0, Math.min(100, Math.round(confidence)));
}

describe('confidence score is unchanged and its reasons add up', () => {
  const full: ConfidenceParams = { hasQuantity: true, hasUnit: true, hasInvoiceNumber: true, hasSupplierGstin: true, hasDate: true, hasAmount: true, lineItemCount: 2, unverifiableCount: 0, missingEmissionFactorCount: 0, hsnClassifiedCount: 1, extractedFieldRatio: 1 };
  const fixtures: ConfidenceParams[] = [
    full,
    { ...full, hsnClassifiedCount: 0 },
    { ...full, hasSupplierGstin: false, hasDate: false, unverifiableCount: 1, hsnClassifiedCount: 3 },
    { ...full, hasQuantity: false, hasUnit: false, lineItemCount: 0, hsnClassifiedCount: 0, extractedFieldRatio: 2 / 7 },
    { ...full, unverifiableCount: 9, missingEmissionFactorCount: 4 },
    { hasQuantity: false, hasUnit: false, hasInvoiceNumber: false, hasSupplierGstin: false, hasDate: false, hasAmount: false, lineItemCount: 0, unverifiableCount: 0, missingEmissionFactorCount: 0, hsnClassifiedCount: 0, extractedFieldRatio: 0 },
  ];
  test('fixtures: same score', () => {
    for (const f of fixtures) expect(deterministicConfidence(f).score).toBe(originalConfidence(f));
  });
  test('5,000 generated inputs: same score, and 100 + reasons = score', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let i = 0; i < 5000; i++) {
      const p: ConfidenceParams = {
        hasQuantity: rnd() < 0.5, hasUnit: rnd() < 0.5, hasInvoiceNumber: rnd() < 0.5, hasSupplierGstin: rnd() < 0.5, hasDate: rnd() < 0.5, hasAmount: rnd() < 0.5,
        lineItemCount: Math.floor(rnd() * 6), unverifiableCount: Math.floor(rnd() * 5), missingEmissionFactorCount: Math.floor(rnd() * 5),
        hsnClassifiedCount: Math.floor(rnd() * 5), extractedFieldRatio: Math.floor(rnd() * 8) / 7,
      };
      const { score, reasons } = deterministicConfidence(p);
      expect(score).toBe(originalConfidence(p));
      expect(100 + reasons.reduce((s, r) => s + r.points, 0)).toBe(score);
    }
  });
  test('reasons name each penalty applied', () => {
    const { score, reasons } = deterministicConfidence(fixtures[2]);
    expect(score).toBe(80);
    expect(reasons).toEqual([
      { points: -10, reason: 'No supplier GSTIN' },
      { points: -5, reason: 'No invoice date' },
      { points: -15, reason: '1 line could not be classified' },
      { points: 10, reason: '3 lines classified by HSN code' },
    ]);
    expect(deterministicConfidence(full).reasons).toEqual([{ points: 5, reason: '1 line classified by HSN code' }, { points: -5, reason: 'Score kept between 0 and 100' }]);
  });
  test('the reasons reach the evidence unchanged', () => {
    const { reasons } = deterministicConfidence(fixtures[2]);
    expect(buildBillEvidence(base({ confidenceReasons: reasons })).confidenceReasons).toEqual(reasons);
  });
});

// ============= EMISSION ROWS: identical except factorCitation =============
// Golden output of buildEmissionRows before this change (origin/main), for the fixture below.
const FIXTURE = {
  confidence: 85,
  documentKind: 'tax_invoice',
  methodology: { factorVersion: 'IND_EF_2026_10' },
  lineItems: [
    { description: 'HSD Diesel', hsn_code: '2710', quantity: 1250, unit: 'litre', productCategory: 'FUEL', scope: 1, co2Kg: 3350, emissionFactor: 2.68, factorSource: 'BIOCOG_MVR_INDIA_v1.1:DIESEL', classificationMethod: 'HSN' as const, basis: 'read_from_bill', basisLabel: 'Read from bill', sourcePage: 1, assumptions: [] },
    { description: 'Electricity consumed', hsn_code: '2716', quantity: 342, unit: 'kWh', productCategory: 'ELECTRICITY', scope: 2, co2Kg: 242.82, emissionFactor: 0.71, factorSource: 'BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG', classificationMethod: 'HSN' as const, basis: 'estimated_kvah_pf', basisLabel: 'Estimated', assumptions: ['Grid factor for IN'] },
    { description: 'LPG cylinder 19 kg', quantity: 38, unit: 'kg', productCategory: 'FUEL', scope: 1, co2Kg: 113.24, emissionFactor: 2.98, factorSource: 'BIOCOG_MVR_INDIA_v1.1:LPG', classificationMethod: 'KEYWORD' as const },
    { description: 'Old diesel', quantity: 10, unit: 'litre', productCategory: 'FUEL', scope: 1, co2Kg: 26.8, emissionFactor: 2.68, factorSource: 'BIOCOG_MVR_INDIA_v1.0:DIESEL', classificationMethod: 'KEYWORD' as const },
    { description: 'Freight', quantity: 5, unit: 'km', productCategory: 'TRANSPORT', scope: 3, classificationMethod: 'KEYWORD' as const },
  ],
};
const OWNER = { documentId: 'doc-1', sessionId: null, userId: 'user-1', organizationId: 'org-1' };
const GOLDEN = JSON.parse(String.raw`[{"document_id":"doc-1","organization_id":"org-1","session_id":null,"user_id":"user-1","scope":1,"category":"fuel","co2_kg":3350,"activity_data":1250,"activity_unit":"litre","emission_factor":2.68,"data_quality":"high","verification_notes":"{\"factorSource\":\"BIOCOG_MVR_INDIA_v1.1:DIESEL\",\"classificationMethod\":\"HSN\",\"hsnCode\":\"2710\",\"sourceDescription\":\"HSD Diesel\",\"basis\":\"read_from_bill\",\"basisLabel\":\"Read from bill\",\"factorSetVersion\":\"IND_EF_2026_10\",\"sourcePage\":1,\"assumptions\":[]}","verified":false},{"document_id":"doc-1","organization_id":"org-1","session_id":null,"user_id":"user-1","scope":2,"category":"electricity","co2_kg":242.82,"activity_data":342,"activity_unit":"kWh","emission_factor":0.71,"data_quality":"medium","verification_notes":"{\"factorSource\":\"BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG\",\"classificationMethod\":\"HSN\",\"hsnCode\":\"2716\",\"sourceDescription\":\"Electricity consumed\",\"basis\":\"estimated_kvah_pf\",\"basisLabel\":\"Estimated\",\"factorSetVersion\":\"IND_EF_2026_10\",\"assumptions\":[\"Grid factor for IN\"]}","verified":false},{"document_id":"doc-1","organization_id":"org-1","session_id":null,"user_id":"user-1","scope":1,"category":"fuel","co2_kg":113.24,"activity_data":38,"activity_unit":"kg","emission_factor":2.98,"data_quality":"high","verification_notes":"{\"factorSource\":\"BIOCOG_MVR_INDIA_v1.1:LPG\",\"classificationMethod\":\"KEYWORD\",\"hsnCode\":null,\"sourceDescription\":\"LPG cylinder 19 kg\",\"factorSetVersion\":\"IND_EF_2026_10\"}","verified":false},{"document_id":"doc-1","organization_id":"org-1","session_id":null,"user_id":"user-1","scope":1,"category":"fuel","co2_kg":26.8,"activity_data":10,"activity_unit":"litre","emission_factor":2.68,"data_quality":"high","verification_notes":"{\"factorSource\":\"BIOCOG_MVR_INDIA_v1.0:DIESEL\",\"classificationMethod\":\"KEYWORD\",\"hsnCode\":null,\"sourceDescription\":\"Old diesel\",\"factorSetVersion\":\"IND_EF_2026_10\"}","verified":false}]`);

describe('emission rows gain only factorCitation', () => {
  const rows = buildEmissionRows(FIXTURE, OWNER);
  test('identical to the golden output once factorCitation is removed', () => {
    const stripped = rows.map((r) => {
      const notes = JSON.parse(r.verification_notes);
      delete notes.factorCitation;
      return { ...r, verification_notes: JSON.stringify(notes) };
    });
    expect(stripped).toEqual(GOLDEN);
    // Byte-for-byte: every other column, and the notes text up to the new key.
    rows.forEach((r, i) => expect(r.verification_notes.startsWith(GOLDEN[i].verification_notes.slice(0, -1))).toBe(true));
  });
  test('the citation is the source defined with the factor', () => {
    const cite = rows.map((r) => JSON.parse(r.verification_notes).factorCitation);
    expect(cite).toEqual([FUEL_FACTORS.DIESEL.source, INDIA_GRID_FACTOR_SOURCE, FUEL_FACTORS.LPG.source, undefined]);
    expect(factorCitationFor('BIOCOG_MVR_INDIA_v1.0:DIESEL')).toBeNull();
    expect(factorCitationFor('BIOCOG_MVR_INDIA_v1.1:SOLAR_AVOIDED_GRID')).toBeNull();
    expect(factorCitationFor(null)).toBeNull();
  });
  test('the verification gate still passes these rows', () => {
    for (const [i, r] of rows.entries()) {
      expect(evidenceGaps({ id: `e${i}`, ...r, documents: { vendor: 'Shree Fuels', invoice_number: 'A1', amount: 1000, confidence: 85, document_hash: 'h', invoice_date: '2026-09-14', cached_result: { evidence: { version: 1 } } } }, false).filter((g) => !g.startsWith('Scope 3'))).toEqual([]);
    }
  });
});
