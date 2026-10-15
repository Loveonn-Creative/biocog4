import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { base64Bytes, GUEST_DAILY_SCANS, GUEST_IP_DAILY_SCANS, GUEST_MAX_BYTES, guestFileCheck } from '../supabase/functions/_shared/guestScan';
import { GUEST_RESULT_TTL_MS, guestDocumentId, guestResultsToDrop, guestRowsFor, isExpired, rowsForPreview } from '../src/lib/guestResults';
import { describeGuestCounts } from '../src/lib/guestImport';

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('guest limits and file checks', () => {
  test('owner decision: 30 invoices a device a day, 300 per network address', () => {
    expect(GUEST_DAILY_SCANS).toBe(30);
    expect(GUEST_IP_DAILY_SCANS).toBe(300);
  });
  test('decoded size is computed from base64 without decoding', () => {
    expect(base64Bytes(Buffer.from('hello world').toString('base64'))).toBe(11);
    expect(base64Bytes(Buffer.alloc(1000).toString('base64'))).toBe(1000);
  });
  test('over 10 MB is refused with the size in the message; types outside the list are refused', () => {
    const big = 'A'.repeat(Math.ceil(((GUEST_MAX_BYTES + 1024) * 4) / 3));
    const r = guestFileCheck(big, 'application/pdf');
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.status).toBe(413); expect(r.message).toMatch(/10\.0 MB|10 MB/); }
    const t = guestFileCheck('AAAA', 'application/zip');
    expect(t.ok).toBe(false);
    if (!t.ok) expect(t.status).toBe(415);
    expect(guestFileCheck('AAAA', 'image/png').ok).toBe(true);
    expect(guestFileCheck('AAAA', undefined).ok).toBe(true); // defaults to image/jpeg as the server does
  });
});

describe('browser-held results', () => {
  const extracted = {
    documentType: 'bill', vendor: 'DISCOM', invoiceNumber: 'B-1', date: '2026-09-30', amount: 9000, confidence: 92,
    lineItems: [
      { description: 'Energy charges', quantity: 1000, unit: 'kWh', productCategory: 'ELECTRICITY', scope: 2, co2Kg: 710, emissionFactor: 0.71, factorSource: 'CEA', classificationMethod: 'KEYWORD' as const },
      { description: 'Cement', quantity: 2, unit: 'tonne', productCategory: 'RAW_MATERIAL', scope: 3, classificationMethod: 'UNVERIFIABLE' as const },
    ],
  };
  test('rows are built by the same function as signed-in uploads, with local ids and no owner', () => {
    const rows = guestRowsFor(extracted, 'a'.repeat(64));
    expect(rows.length).toBe(1); // the line with no factor is not a record
    expect(rows[0]).toMatchObject({ id: `${guestDocumentId('a'.repeat(64))}-0`, user_id: null, session_id: null, co2_kg: 710, activity_data: 1000, emission_factor: 0.71, verified: false });
  });
  test('the preview carries the invoice fingerprint and fields the evidence gate checks', () => {
    const rows = guestRowsFor(extracted, 'b'.repeat(64));
    const [p] = rowsForPreview([{ hash: 'b'.repeat(64), fileName: 'bill.pdf', savedAt: 0, expiresAt: 1, extracted, rows }]);
    expect(p.documents.document_hash).toBe('b'.repeat(64));
    expect(p.documents.invoice_number).toBe('B-1');
    expect(JSON.parse(p.verification_notes).factorSource).toBe('CEA');
  });
  test('results expire after 24 hours and the store keeps at most 60', () => {
    const now = 1_000_000_000;
    expect(GUEST_RESULT_TTL_MS).toBe(86_400_000);
    expect(isExpired({ expiresAt: now }, now)).toBe(true);
    expect(isExpired({ expiresAt: now + 1 }, now)).toBe(false);
    const entries = Array.from({ length: 62 }, (_, i) => ({ hash: `h${i}`, savedAt: now - i, expiresAt: now + 1000 }));
    entries.push({ hash: 'old', savedAt: now - 1e9, expiresAt: now - 1 });
    const drop = guestResultsToDrop(entries, now);
    expect(drop).toContain('old');
    expect(drop).toContain('h61');
    expect(drop).toContain('h60');
    expect(drop).not.toContain('h0');
    expect(drop.length).toBe(3);
  });
  test('the import prompt counts browser-held invoices too', () => {
    expect(describeGuestCounts({ documents: 0, emissions: 0, verifications: 0, reports: 0 }, 2)).toBe('2 invoices');
    expect(describeGuestCounts({ documents: 1, emissions: 3, verifications: 0, reports: 0 }, 1)).toBe('2 invoices');
  });
});

describe('source contracts', () => {
  const extract = src('supabase/functions/extract-document/index.ts');
  test('extract-document: guests are capped and never written', () => {
    expect(extract).toContain("readUse(admin, device, 'guest_scan', GUEST_DAILY_SCANS)");
    expect(extract).toContain('await countGuestRead();'); // counted only after a successful read
    expect(extract).toContain('guestFileCheck(imageBase64, mimeType)');
    expect(extract).toContain('if (supabaseUrl && supabaseKey && isAuthenticated && userId) {');
    expect(extract).not.toMatch(/document_type: 'pending'/);
    expect(extract).not.toMatch(/\.eq\('session_id', sessionId\)/);
    expect(extract).toContain('ephemeral: true');
  });
  test('extract-document logs carry no AI or database error bodies', () => {
    expect(extract).not.toMatch(/console\.error\(`AI API error \(\$\{response\.status\}\):`, errorText\)/);
    expect(extract).not.toMatch(/console\.error\('Failed to parse flash response:', e\)/);
    expect(extract).not.toMatch(/console\.error\('Failed to cache result:', cacheError\)/);
  });
  test('home page: guests keep results in the browser, never insert rows', () => {
    const index = src('src/pages/Index.tsx');
    // Signed in: the server's rows, or the browser fallback. Guests: browser only.
    expect(index).toContain('user\n        ? (serverSaved(data) ?? await saveEmissionToDatabase(extractedData, data.documentHash))\n        : await keepGuestResult(');
    expect(index).toContain("user ? (serverSaved(data) ?? await saveEmissionToDatabase(extracted, data.documentHash)) : await keepGuestResult(extracted, data.documentHash, part.file.name)");
  });
  test('verify-carbon preview writes nothing and calls no AI', () => {
    const v = src('supabase/functions/verify-carbon/index.ts');
    const start = v.indexOf('if (body?.preview) {');
    const end = v.indexOf('if (!Array.isArray(emissionIds)', start);
    const block = v.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(block).not.toMatch(/\.insert\(|\.update\(|\.rpc\(|ai\.gateway/);
    expect(block).toContain("previewVerification(rows)");
    expect(block).toContain('Preview only. Nothing was recorded or verified.');
  });
});

describe('flow contracts (audit fixes)', () => {
  test('Monetize sends the owner so the access rule accepts the request', () => {
    expect(src('src/pages/Monetize.tsx')).toContain('...(user ? { user_id: user.id } : { session_id: sessionId })');
  });
  test('an invoice already in the account is never recorded twice (import and bulk upload)', () => {
    expect(src('src/lib/guestImportLocal.ts')).toContain(".in('document_id', (docs ?? []).map(");
    expect(src('src/components/BulkUpload.tsx')).toContain(".in('document_id', (ownerDocs ?? []).map(");
    const merge = src('supabase/functions/merge-session/index.ts');
    expect(merge).toContain('d.cached_result != null');
    expect(merge).toContain("ownedHashes.has(d.document_hash)");
  });
  test('402 is shown as paused on our side everywhere uploads are read', async () => {
    const { getFunctionErrorMessage, AI_PAUSED_MESSAGE } = await import('../src/lib/functionErrors');
    const err = Object.assign(new Error('Edge Function returned a non-2xx status code'), { context: new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }), { status: 402 }) });
    expect(await getFunctionErrorMessage(err, 'x')).toBe(AI_PAUSED_MESSAGE);
    const coded = Object.assign(new Error('x'), { context: new Response(JSON.stringify({ code: 'ai_unavailable', error: 'paused' }), { status: 500 }) });
    expect(await getFunctionErrorMessage(coded, 'x')).toBe(AI_PAUSED_MESSAGE);
  });
});
