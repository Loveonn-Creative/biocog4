// Documents and emissions are written only on the server. The browser never
// inserts them, and a document created after the cutoff must carry a mark only
// a server read writes before its records can be verified.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import {
  evidenceGaps, hasServerReadMarker, lacksServerRead, previewVerification,
  SERVER_READ_GAP, SERVER_READ_REQUIRED_FROM,
} from '../supabase/functions/_shared/verifyGate';
import { FUEL_FACTORS } from '../supabase/functions/_shared/emissionFactors';

const notes = JSON.stringify({ factorSource: 'BIOCOG_MVR_INDIA_v1.1:DIESEL', classificationMethod: 'KEYWORD', hsnCode: null, sourceDescription: 'Diesel', assumptions: [] });
const row = (doc: Record<string, unknown>) => ({
  id: 'e1', document_id: 'd1', category: 'fuel', scope: 1, co2_kg: 100 * FUEL_FACTORS.DIESEL.value, activity_data: 100, activity_unit: 'litre',
  emission_factor: FUEL_FACTORS.DIESEL.value, data_quality: 'medium', verification_notes: notes,
  documents: { vendor: 'Shree Fuels', invoice_number: 'A1', amount: 9000, confidence: 95, document_hash: 'h', invoice_date: '2026-11-04', ...doc },
});
const AFTER = '2026-11-05T09:30:00Z';
const BEFORE = '2026-10-20T09:30:00Z';

describe('verify gate: server read required for documents created after the cutoff', () => {
  test('the cutoff is fixed at 1 November 2026', () => {
    expect(SERVER_READ_REQUIRED_FROM).toBe('2026-11-01T00:00:00Z');
  });
  test('after the cutoff, a document with no server mark gets the gap', () => {
    expect(evidenceGaps(row({ created_at: AFTER, cached_result: { vendor: 'Shree Fuels' }, file_url: null }), false)).toEqual([SERVER_READ_GAP]);
    expect(evidenceGaps(row({ created_at: AFTER, cached_result: null }), false)).toEqual([SERVER_READ_GAP]);
    expect(evidenceGaps(row({ created_at: '2026-11-01T00:00:00Z', cached_result: {} }), false)).toEqual([SERVER_READ_GAP]);
    // A repair replay checks the same rule.
    expect(evidenceGaps(row({ created_at: AFTER, cached_result: {} }), true)).toEqual([SERVER_READ_GAP]);
  });
  test('after the cutoff, each server mark is enough on its own', () => {
    expect(evidenceGaps(row({ created_at: AFTER, cached_result: { evidence: { checks: [] } } }), false)).toEqual([]);
    expect(evidenceGaps(row({ created_at: AFTER, cached_result: JSON.stringify({ evidence: {} }) }), false)).toEqual([]);
    expect(evidenceGaps(row({ created_at: AFTER, cached_result: {}, file_url: 'u1/abc.pdf' }), false)).toEqual([]);
    // An import passes this check and keeps its own bill gap.
    expect(evidenceGaps(row({ created_at: AFTER, cached_result: { source: 'import' } }), false))
      .toEqual(['bill: typed figures are verified only from the uploaded bill']);
  });
  test('before the cutoff nothing changes, so no live record loses verification', () => {
    expect(evidenceGaps(row({ created_at: BEFORE, cached_result: { vendor: 'Shree Fuels' }, file_url: null }), false)).toEqual([]);
    expect(evidenceGaps(row({ created_at: '2026-10-31T23:59:59Z', cached_result: null }), false)).toEqual([]);
    expect(lacksServerRead({ vendor: null, invoice_number: null, amount: null, confidence: null, created_at: 'not a date' })).toBe(false);
  });
  test('the guest preview (no created_at) is unchanged', () => {
    expect(evidenceGaps(row({ cached_result: undefined }), false)).toEqual([]);
    expect(previewVerification([row({})]).missingInputs).toEqual([]);
  });
  test('marker rules', () => {
    expect(hasServerReadMarker(null)).toBe(false);
    expect(hasServerReadMarker({ file_url: '  ' })).toBe(false);
    expect(hasServerReadMarker({ cached_result: '{bad' })).toBe(false);
    expect(hasServerReadMarker({ cached_result: { evidence: 'x' } })).toBe(false);
    expect(hasServerReadMarker({ cached_result: { source: 'upload' } })).toBe(false);
  });
  test('verify-carbon loads every document column the gate reads', () => {
    expect(readFileSync('supabase/functions/verify-carbon/index.ts', 'utf8')).toContain(".select('*, documents(*)')");
  });
  test('extract-document writes the evidence mark and the file path on the documents it creates', () => {
    const ex = readFileSync('supabase/functions/extract-document/index.ts', 'utf8');
    expect(ex).toContain('return { ...extracted, evidence };');
    expect(ex).toContain('cached_result: storedResult,');
    expect(ex).toContain('file_url: sourcePath,');
  });
});

describe('the browser never inserts documents or emissions', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f)) files.push(p);
    }
  };
  walk('src');
  test('no insert or upsert into documents or emissions anywhere under src/', () => {
    const offenders = files.filter((p) => {
      const s = readFileSync(p, 'utf8');
      // A chained call on the same table (no other from() in between).
      return /from\(\s*['"](documents|emissions)['"]\s*\)(?:(?!from\()[\s\S]){0,400}?\.(insert|upsert)\(/.test(s);
    });
    expect(offenders).toEqual([]);
  });
  test('the unused insert helpers are gone', () => {
    expect(readFileSync('src/hooks/useDocuments.ts', 'utf8')).not.toContain('saveDocument');
    expect(readFileSync('src/hooks/useEmissions.ts', 'utf8')).not.toContain('saveEmission');
  });
  test('signing in after a guest visit relies on the rows extract-document saved', () => {
    const g = readFileSync('src/lib/guestImportLocal.ts', 'utf8');
    expect(g).toContain('if (data.serverSaved && data.documentId && Array.isArray(data.emissionIds)) { out.added += 1; continue; }');
    expect(g).toContain("if (rows.length) { out.skipped.push(`${name}: could not be saved`); continue; }");
  });
  test('the upload page looks up server rows for a signed-in user and writes nothing for a guest', () => {
    const page = readFileSync('src/pages/Index.tsx', 'utf8');
    expect(page).toContain('if (!user || !documentHash) return null;');
  });
});
