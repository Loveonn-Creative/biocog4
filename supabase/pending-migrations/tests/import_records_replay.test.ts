// Replay test (run by run_import_records.sh, skipped otherwise): an uploaded
// bill (the real extract-document handler, AI stubbed) and an imported
// spreadsheet row (the real import-records handler) written to a local copy of
// the production schema. Both must land in documents, emissions and the reads
// ledger with the same shape, and pass Verify's evidence gate.
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { asServiceRole, connect, pgClient } from './pg_rest_adapter';
import { evidenceGaps, validateEmission } from '../../functions/_shared/verifyGate';

const DB = process.env.IMPORT_REPLAY_DB;
const USER = '00000000-0000-4000-8000-0000000000aa';
const run = DB ? describe : describe.skip;

run('upload and import on the replayed schema', () => {
  // deno-lint-ignore no-explicit-any
  let sql: any; let upload: (req: Request) => Promise<Response>;
  // deno-lint-ignore no-explicit-any
  let importHandler: any; let client: any;

  beforeAll(async () => {
    sql = connect(DB!);
    await sql`insert into auth.users (id, email) values (${USER}, 'replay@example.test') on conflict do nothing`;
    await sql`insert into public.profiles (id) values (${USER}) on conflict (id) do nothing`;
    await sql`update public.profiles set subscription_tier = 'pro', subscription_expires_at = now() + interval '200 days', location = 'Pune, India' where id = ${USER}`;
    await asServiceRole(sql);
    client = pgClient(sql, { 'token-a': USER });
    mock.module('https://deno.land/std@0.168.0/http/server.ts', () => ({ serve: (fn: never) => { upload = fn; } }));
    mock.module('https://esm.sh/@supabase/supabase-js@2', () => ({ createClient: () => client }));
    mock.module('https://esm.sh/pdf-lib@1.17.1', () => ({}));
    const env: Record<string, string> = { SUPABASE_URL: 'http://db.local', SUPABASE_SERVICE_ROLE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', GEMINI_API_KEY: 'g' };
    (globalThis as never as { Deno: unknown }).Deno = { env: { get: (k: string) => env[k] } };
    (globalThis as never as { EdgeRuntime: unknown }).EdgeRuntime = { waitUntil: () => {} };
    const ocr = {
      documentType: 'Tax Invoice', vendor: 'Shree Fuels', date: '2026-09-14', invoiceNumber: 'INV-118',
      supplierGstin: '27AAPFU0939F1ZV', amount: '₹4,690',
      lineItems: [{ description: 'HSD Diesel', hsn_code: '2710', quantity: '1,250', unit: 'litre', total: '4,690' }],
    };
    globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(ocr) } }] }), { status: 200 })) as never;
    await import('../../functions/extract-document/index.ts');
    importHandler = (await import('../../functions/import-records/handler.ts')).handleImportRecords;
  });
  afterAll(async () => { await sql?.end(); });

  const file = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('replay-image-'.repeat(20))]).toString('base64');
  let failEmissions = false;
  // The real client, except that emission inserts can be made to fail.
  const hooked = () => ({ ...client, from: (t: string) => {
    const q = client.from(t);
    if (t === 'emissions' && failEmissions) q.insert = () => ({ select: async () => ({ data: null, error: { code: 'XX000', message: 'forced' } }) });
    return q;
  } });
  const imp = async (rows: unknown[]) => {
    const res = await importHandler(new Request('http://fn/import-records', {
      method: 'POST', headers: { Authorization: 'Bearer token-a', apikey: 'anon', 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'bills', rows }),
    }), { env: (k: string) => ({ SUPABASE_URL: 'http://db.local', SUPABASE_SERVICE_ROLE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon' } as Record<string, string>)[k], makeClient: () => hooked() });
    return res.json();
  };
  const row = (o: Record<string, string> = {}) => ({ line: 2, values: { date: '2026-09-20', type: 'Diesel', quantity: '800', unit: 'litre', supplier: 'Shree Fuels', gstin: '27AAPFU0939F1ZV', invoice: 'INV-200', amount: '72000', notes: '', ...o } });

  test('an uploaded bill and an imported row are stored the same way', async () => {
    const up = await upload(new Request('http://fn/extract-document', {
      method: 'POST', headers: { Authorization: 'Bearer token-a', apikey: 'anon', 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: file, mimeType: 'image/jpeg' }),
    }));
    const upBody = await up.json();
    expect(upBody.serverSaved).toBe(true);
    const out = await imp([row()]);
    expect(out.results[0]).toMatchObject({ status: 'saved', emissions: 1 });

    const docs = await sql`select * from public.documents where user_id = ${USER} order by created_at`;
    expect(docs).toHaveLength(2);
    const [uploaded, imported] = docs;
    expect(imported.cached_result.source).toBe('import');
    const filled = (r: Record<string, unknown>) => Object.keys(r).filter((k) => r[k] !== null).sort();
    // Same columns filled, apart from what only a read file has.
    const fileOnly = new Set(['confidence']);
    expect(filled(imported)).toEqual(filled(uploaded).filter((k) => !fileOnly.has(k)));

    const ems = await sql`select e.*, d.document_hash, d.vendor, d.invoice_number, d.amount, d.confidence as doc_confidence, d.invoice_date, d.cached_result
      from public.emissions e join public.documents d on d.id = e.document_id where e.user_id = ${USER} order by e.created_at`;
    expect(ems).toHaveLength(2);
    expect(filled(ems[1])).toEqual(filled(ems[0]).filter((k) => !['doc_confidence'].includes(k)));
    for (const e of ems) {
      expect(e).toMatchObject({ scope: 1, category: 'fuel', activity_unit: 'litre', verified: false });
      const record = { ...e, documents: { vendor: e.vendor, invoice_number: e.invoice_number, amount: e.amount, confidence: e.doc_confidence, document_hash: e.document_hash, invoice_date: e.invoice_date, cached_result: e.cached_result } };
      expect(evidenceGaps(record, false)).toEqual([]);
      expect(validateEmission(record).valid).toBe(true);
    }
    expect(ems[1].emission_factor).toBe(ems[0].emission_factor);

    const reads = await sql`select status, document_id, pages, units from public.invoice_reads where user_id = ${USER} order by created_at`;
    expect(reads.map((r: { status: string }) => r.status)).toEqual(['committed', 'committed']);
    expect(reads.map((r: { document_id: string }) => r.document_id)).toEqual(docs.map((d: { id: string }) => d.id));
  });

  test('the same row again, and the uploaded bill as a row, are not stored twice', async () => {
    const again = await imp([row()]);
    expect(again.results[0]).toMatchObject({ status: 'duplicate' });
    const asRow = await imp([row({ date: '2026-09-14', quantity: '1250', invoice: 'INV-118', amount: '4690' })]);
    expect(asRow.results[0]).toMatchObject({ status: 'duplicate', reason: 'This bill is already in your records.' });
    const [{ n }] = await sql`select count(*)::int as n from public.documents where user_id = ${USER}`;
    expect(n).toBe(2);
    const [{ r }] = await sql`select count(*)::int as r from public.invoice_reads where user_id = ${USER} and status = 'committed'`;
    expect(r).toBe(2);
  });

  test('freight is stored as a record with no emission row', async () => {
    const out = await imp([row({ type: 'Freight', quantity: '4800', unit: 'tonne-km', supplier: 'VRL Logistics', gstin: '', invoice: 'VRL-9' })]);
    expect(out.results[0]).toMatchObject({ status: 'saved', emissions: 0 });
    const [{ n }] = await sql`select count(*)::int as n from public.emissions e join public.documents d on d.id = e.document_id where d.invoice_number = 'VRL-9'`;
    expect(n).toBe(0);
  });

  test('a failed emission insert leaves no document behind and is saved once on retry', async () => {
    failEmissions = true;
    const r = await imp([row({ invoice: 'INV-300' })]);
    failEmissions = false;
    expect(r.results[0]).toMatchObject({ status: 'failed', reason: 'Not saved. Try again.' });
    const [{ n }] = await sql`select count(*)::int as n from public.documents where invoice_number = 'INV-300'`;
    expect(n).toBe(0);
    const released = await sql`select status from public.invoice_reads where user_id = ${USER} and status = 'released'`;
    expect(released.length).toBeGreaterThan(0);
    const again = await imp([row({ invoice: 'INV-300' })]);
    expect(again.results[0]).toMatchObject({ status: 'saved', emissions: 1 });
    const [{ m }] = await sql`select count(*)::int as m from public.documents where invoice_number = 'INV-300'`;
    expect(m).toBe(1);
  });

  test('the same row from two tabs at once is stored once', async () => {
    const [a, b] = await Promise.all([imp([row({ invoice: 'INV-400' })]), imp([row({ invoice: 'INV-400' })])]);
    expect([a.results[0].status, b.results[0].status].sort()).toEqual(['duplicate', 'saved']);
    const [{ n }] = await sql`select count(*)::int as n from public.documents where invoice_number = 'INV-400'`;
    expect(n).toBe(1);
    const [{ e }] = await sql`select count(*)::int as e from public.emissions em join public.documents d on d.id = em.document_id where d.invoice_number = 'INV-400'`;
    expect(e).toBe(1);
  });
});
