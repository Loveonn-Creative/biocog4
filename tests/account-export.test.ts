import { describe, expect, test } from 'bun:test';
import { buildAccountExport, safeCell } from '../src/lib/accountExport';

describe('download my data', () => {
  test('formula-looking text is neutralised', () => {
    expect(safeCell('=HYPERLINK("http://x")')).toBe(`'=HYPERLINK("http://x")`);
    expect(safeCell('+91 98')).toBe(`'+91 98`);
    expect(safeCell('@SUM(A1)')).toBe(`'@SUM(A1)`);
    expect(safeCell('MSEDCL')).toBe('MSEDCL');
    expect(safeCell(12.5)).toBe(12.5);
    expect(safeCell(NaN)).toBeNull();
  });

  test('keeps only owner-facing fields and replaces ids with document refs', () => {
    const sheets = buildAccountExport({
      profile: { id: 'u-1', business_name: 'Asha Textiles', gstin: '27AAAAA0000A1Z5', trust_layer_prefs: { a: 1 }, subscription_tier: 'scale' },
      documents: [
        { id: 'd-b', created_at: '2026-05-02T00:00:00Z', vendor: 'MSEDCL', amount: 1000, document_hash: 'abc', file_url: 'u/x.pdf', raw_ocr_data: { a: 1 }, cached_result: {}, session_id: 's' },
        { id: 'd-a', created_at: '2026-04-01T00:00:00Z', vendor: '=cmd', amount: 5 },
      ],
      emissions: [{ id: 'e1', document_id: 'd-b', scope: 2, category: 'electricity', activity_data: 100, activity_unit: 'kWh', co2_kg: 71, verified: true, user_id: 'u-1', organization_id: 'o' }],
      verifications: [{ id: 'v1', created_at: '2026-05-03T00:00:00Z', verification_status: 'verified', verification_score: 0.8, total_co2_kg: 71, ai_analysis: { secret: 1 }, idempotency_key: 'k' }],
      ledger: [{ id: 'l1', document_id: 'd-a', document_hash: 'h', vendor: 'X', co2_kg: 1, verification_status: 'verified' }],
    }, '2026-10-21');
    const json = JSON.stringify(sheets);
    for (const leak of ['u-1', 'd-a', 'd-b', 'e1', 'v1', 'abc', 'u/x.pdf', 'raw_ocr', 'session', 'secret', 'idempotency', 'organization', 'subscription_tier', '"h"']) expect(json).not.toContain(leak);
    const docs = sheets.find((s) => s.name === 'Documents')!.rows;
    expect(docs.map((d) => d.Ref)).toEqual(['Doc 1', 'Doc 2']);
    expect(docs[0].Supplier).toBe(`'=cmd`);
    expect(sheets.find((s) => s.name === 'Emissions')!.rows[0]).toMatchObject({ Document: 'Doc 2', 'kg CO2e': 71, Verified: true });
    expect(sheets.find((s) => s.name === 'Verifications')!.rows[0]['Evidence score (%)']).toBe(80);
    expect(sheets.find((s) => s.name === 'Profile')!.rows[0]).toEqual({ 'Business name': 'Asha Textiles', 'Tax ID': '27AAAAA0000A1Z5', Sector: null, Size: null, Location: null });
  });
});
