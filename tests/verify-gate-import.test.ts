// Typed (imported) rows stay unverified until the bill is uploaded.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { evidenceGaps, isImportedDocument } from '../supabase/functions/_shared/verifyGate';
import { isImportedEmission } from '../src/lib/import/imported';
import { FUEL_FACTORS } from '../supabase/functions/_shared/emissionFactors';

const notes = (extra: string[] = []) => JSON.stringify({ factorSource: 'BIOCOG_MVR_INDIA_v1.1:DIESEL', classificationMethod: 'KEYWORD', hsnCode: null, sourceDescription: 'Diesel', assumptions: extra });
const row = (cached: unknown, assumptions: string[] = []) => ({
  id: 'e1', document_id: 'd1', category: 'fuel', scope: 1, co2_kg: 100 * FUEL_FACTORS.DIESEL.value, activity_data: 100, activity_unit: 'litre',
  emission_factor: FUEL_FACTORS.DIESEL.value, data_quality: 'medium', verification_notes: notes(assumptions),
  documents: { vendor: 'Shree Fuels', invoice_number: 'A1', amount: 9000, confidence: null, document_hash: 'h', invoice_date: '2026-09-14', cached_result: cached },
});
const GAP = 'bill: typed figures are verified only from the uploaded bill';

describe('verification gate for imported rows', () => {
  test('an imported record gets the bill gap; the same record from an upload does not', () => {
    expect(evidenceGaps(row({ source: 'import', vendor: 'Shree Fuels' }), false)).toEqual([GAP]);
    expect(evidenceGaps(row({ vendor: 'Shree Fuels' }), false)).toEqual([]);
    expect(evidenceGaps(row(null), false)).toEqual([]);
  });
  test('cached_result read as text or object; bad text is not an import', () => {
    expect(evidenceGaps(row(JSON.stringify({ source: 'import' })), false)).toEqual([GAP]);
    expect(isImportedDocument('{not json')).toBe(false);
    expect(isImportedDocument({ source: 'upload' })).toBe(false);
  });
  test('the app recognises imported rows by their document or by their stored note', () => {
    expect(isImportedEmission(row(null), { source: 'import' })).toBe(true);
    expect(isImportedEmission(row(null, ['Imported from spreadsheet row 7']))).toBe(true);
    expect(isImportedEmission(row(null, ['Entered by you']))).toBe(false);
    expect(isImportedEmission({ verification_notes: 'legacy text' })).toBe(false);
  });
  test('the import writes the note the app looks for', () => {
    expect(readFileSync('supabase/functions/_shared/importRecord.ts', 'utf8')).toContain('a.push(`Imported from spreadsheet row ${ctx.line}`);');
  });
  test('imported rows are kept out of the verify set on the Verify page and in the background', () => {
    const verify = readFileSync('src/pages/Verify.tsx', 'utf8');
    expect(verify).toContain('const billRows = emissions.filter((e) => !isEntered(e));');
    expect(verify).toContain('verifyBuckets(billRows, checkedIds)');
    expect(readFileSync('src/components/AutoVerifier.tsx', 'utf8')).toContain('verifyBuckets(emissions.filter((e) => !isImportedEmission(e)), new Set<string>())');
  });
  test('replacing a typed row uses the existing delete-document function', () => {
    const c = readFileSync('src/components/import/ReplaceWithBill.tsx', 'utf8');
    expect(c).toContain('functions.invoke("delete-document", { body: { documentId } })');
    expect(c).toContain('This removes the typed row. Upload the bill to add it again, read from the bill.');
  });
});
