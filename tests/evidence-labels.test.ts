// Ways an unverified record could look verified, closed.
import { describe, expect, test } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { replayGate, evidenceGaps, validateEmission } from '../supabase/functions/_shared/verifyGate';
import { guestRowsFor, rowsForPreview } from '../src/lib/guestResults';

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// A diesel bill whose record passes every check (5,000 L x 2.68 = 13,400 kg).
const diesel = {
  documentType: 'invoice', vendor: 'Fuel Station', invoiceNumber: 'F-77', date: '2026-10-01', amount: 450000, confidence: 94,
  lineItems: [{ description: 'HSD diesel', quantity: 5000, unit: 'litre', productCategory: 'FUEL', scope: 1, co2Kg: 13400, emissionFactor: 2.68, factorSource: 'BIOCOG_MVR_INDIA_v1.1:DIESEL', classificationMethod: 'KEYWORD' as const }],
};
const hash = 'd'.repeat(64);
const [base] = rowsForPreview([{ hash, fileName: 'diesel.pdf', savedAt: 0, expiresAt: 1, extracted: diesel, rows: guestRowsFor(diesel, hash) }]);

describe('replaying a stored verification re-checks each record', () => {
  test('the fixture passes the gate a new verification uses', () => {
    expect(evidenceGaps(base, false)).toEqual([]);
    expect(validateEmission(base).valid).toBe(true);
  });

  test('an unchanged record is flagged verified again', () => {
    const r = replayGate([base], [base.id], false);
    expect(r.reflagIds).toEqual([base.id]);
    expect(r.failed).toEqual([]);
  });

  test('a record changed since so that it now fails validation is not flagged verified', () => {
    // Low OCR confidence on its source document plus a missing unit: no longer valid.
    const changed = { ...base, id: 'changed-1', activity_unit: null, documents: { ...base.documents!, confidence: 40 } };
    const r = replayGate([base, changed], [base.id, changed.id], false);
    expect(r.reflagIds).toEqual([base.id]);
    expect(r.failed.map((f) => f.emissionId)).toEqual([changed.id]);
    expect(r.failed[0].flags).toContain('Low OCR confidence on source document');
  });

  test('a record whose stored figure was edited (quantity x factor no longer matches) is not flagged verified', () => {
    const edited = { ...base, id: 'edited-1', co2_kg: 1000 };
    const r = replayGate([edited], [edited.id], false);
    expect(r.reflagIds).toEqual([]);
    expect(r.failed[0].flags.join(' ')).toContain('quantity × factor');
  });

  test('only ids the stored result verified are considered', () => {
    const other = { ...base, id: 'other-1' };
    expect(replayGate([base, other], [base.id], false).reflagIds).toEqual([base.id]);
  });

  test('verify-carbon re-flags only what the replay gate passes, and reports the rest', () => {
    const v = src('supabase/functions/verify-carbon/index.ts');
    const start = v.indexOf('if (previous && evidenceComplete) {');
    const end = v.indexOf('// Step 1: Validate each emission', start);
    const block = v.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(block).toContain('replayGate(emissions, storedIds, repairOnly)');
    expect(block).toContain('const replayIds = replayed.reflagIds;');
    expect(block.indexOf('replayGate(')).toBeLessThan(block.indexOf(".update({ verified: true })"));
    expect(block).toContain('replayed.failed.flatMap((f) => f.flags)');
  });
});

describe('signed-in uploads: the browser never writes documents or records', () => {
  test('home page returns null with a clear message when the server did not save the bill', () => {
    const index = src('src/pages/Index.tsx');
    const start = index.indexOf('const saveEmissionToDatabase = async');
    const fn = index.slice(start, index.indexOf('const processLongPdf', start));
    const guardDoc = fn.indexOf("if (user && !documentId) {\n        toast.error(\"We couldn't save this bill. Upload it again.\");\n        return null;");
    const docInsert = fn.indexOf(".from('documents')\n          .insert(");
    expect(guardDoc).toBeGreaterThan(0);
    expect(docInsert).toBeGreaterThan(guardDoc);
    const guardRows = fn.indexOf("if (user) {\n        toast.error(\"We couldn't save this bill. Upload it again.\");\n        return null;");
    const rowInsert = fn.indexOf(".from('emissions')\n        .insert(");
    expect(guardRows).toBeGreaterThan(0);
    expect(rowInsert).toBeGreaterThan(guardRows);
  });
  test('bulk upload never inserts from the browser', () => {
    const bulk = src('src/components/BulkUpload.tsx');
    expect(bulk).not.toMatch(/\.insert\(/);
    expect(bulk).toContain("throw new Error(\"We couldn't save this bill. Upload it again.\");");
  });
});

describe('labels that read as verification', () => {
  test('trust gauge describes invoice details, not verification', () => {
    const g = src('src/components/trust/TrustScoreGauge.tsx');
    expect(g).toContain("'Invoice details complete' : integrityScore >= 50 ? 'Some invoice details missing' : 'Invoice details need review'");
    expect(g).not.toContain('Document integrity verified');
  });
  test('the unused document hash badge is gone', () => {
    expect(existsSync(new URL('../src/components/dashboard/DocumentHashBadge.tsx', import.meta.url))).toBe(false);
  });
});
