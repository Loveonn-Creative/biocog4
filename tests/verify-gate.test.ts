import { describe, expect, test } from 'bun:test';
import { evidenceGaps, previewVerification } from '../supabase/functions/_shared/verifyGate';
import { guestRowsFor, rowsForPreview } from '../src/lib/guestResults';

// The case from the field: a guest's diesel bill, verified in the browser (now 5,000 L x 2.645 = 13,225 kg, v1.2).
const diesel = {
  documentType: 'invoice', vendor: 'Fuel Station', invoiceNumber: 'F-77', date: '2026-10-01', amount: 450000, confidence: 94,
  lineItems: [{ description: 'HSD diesel', quantity: 5000, unit: 'litre', productCategory: 'FUEL', scope: 1, co2Kg: 13225, emissionFactor: 2.645, factorSource: 'BIOCOG_MVR_INDIA_v1.2:DIESEL', classificationMethod: 'KEYWORD' as const }],
};

describe('guest verification preview (no server needed)', () => {
  const hash = 'c'.repeat(64);
  const rows = rowsForPreview([{ hash, fileName: 'diesel.pdf', savedAt: 0, expiresAt: 1, extracted: diesel, rows: guestRowsFor(diesel, hash) }]);
  test('a browser-held record passes the evidence gate: invoice, fingerprint, factor source, published factor, arithmetic', () => {
    expect(rows).toHaveLength(1);
    expect(evidenceGaps(rows[0], false)).toEqual([]);
  });
  test('the preview runs and returns an outcome instead of an error', () => {
    const r = previewVerification(rows);
    expect(r.missingInputs).toEqual([]);
    expect(r.totalCO2Kg).toBe(13225);
    expect(['would_verify', 'needs_review']).toContain(r.outcome);
    expect(r.score).toBe(1);
  });
  test('a tampered figure is caught (quantity x factor, published factor)', () => {
    const bad = previewVerification([{ ...rows[0], co2_kg: 1000 }]);
    expect(bad.outcome).toBe('needs_inputs');
    expect(JSON.stringify(bad.missingInputs)).toContain('quantity × factor');
    const wrongFactor = previewVerification([{ ...rows[0], emission_factor: 2.0, co2_kg: 10000 }]);
    expect(JSON.stringify(wrongFactor.missingInputs)).toContain('published factor');
  });
  test('a record saved by v1.1 at 2.68 still verifies (earlier versions are not re-derived)', () => {
    const old = { ...rows[0], emission_factor: 2.68, co2_kg: 13400, verification_notes: rows[0].verification_notes!.replace('v1.2:DIESEL', 'v1.1:DIESEL') };
    expect(evidenceGaps(old, false)).toEqual([]);
  });
  test('Scope 3 lines point to the supplier evidence trail, as for signed-in users', () => {
    const s3 = previewVerification([{ ...rows[0], scope: 3 }]);
    expect(JSON.stringify(s3.missingInputs)).toContain('supplier evidence trail');
  });
});
