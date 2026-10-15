// End-to-end journeys through the real extract-document handler: an
// in-memory database stands in for Supabase and a stub stands in for the AI
// provider. Checks what is stored (documents, emission rows) and what the
// browser is told, for the paths real users hit.
import { beforeEach, describe, expect, mock, test } from 'bun:test';

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const KNOWN = ['profiles', 'subscriptions', 'documents', 'emissions', 'financial_documents'];
const stored: Record<string, string[]> = {};
const USERS: Record<string, string> = { 'token-a': '00000000-0000-4000-8000-00000000000a' };
let seq = 0;

const field = (row: Row, col: string) => {
  const m = col.match(/^(\w+)->>(\w+)$/);
  return m ? row[m[1]]?.[m[2]] : row[col];
};

class Query {
  private filters: ((r: Row) => boolean)[] = [];
  private mode: 'select' | 'insert' | 'update' = 'select';
  private payload: any;
  private countOpt = false; private head = false; private one: 'single' | 'maybe' | null = null; private max = Infinity;
  private desc = false; private orderCol: string | null = null; private returning = false;
  constructor(private table: string) {}
  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode !== 'select') this.returning = true;
    if (opts?.count) this.countOpt = true; if (opts?.head) this.head = true;
    return this;
  }
  insert(rows: Row | Row[]) { this.mode = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(obj: Row) { this.mode = 'update'; this.payload = obj; return this; }
  upsert(rows: Row | Row[]) { return this.insert(rows); }
  eq(c: string, v: any) { this.filters.push((r) => field(r, c) === v); return this; }
  neq(c: string, v: any) { this.filters.push((r) => field(r, c) !== v); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.includes(field(r, c))); return this; }
  is(c: string, v: any) { this.filters.push((r) => (field(r, c) ?? null) === v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => String(field(r, c)) >= String(v)); return this; }
  order(c: string, o?: { ascending?: boolean }) { this.orderCol = c; this.desc = o?.ascending === false; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  then(res: (v: any) => any, rej?: (e: any) => any) { return Promise.resolve(this.run()).then(res, rej); }
  private run() {
    if (!KNOWN.includes(this.table)) return { data: null, error: { code: '42P01', message: 'relation does not exist' }, count: null };
    const t = (db[this.table] ??= []);
    if (this.mode === 'insert') {
      const added = this.payload.map((r: Row) => ({ id: `id-${++seq}`, created_at: new Date(Date.now() + seq).toISOString(), ...r }));
      t.push(...added);
      const data = this.returning ? (this.one ? added[0] : added) : null;
      return { data, error: null };
    }
    let rows = t.filter((r) => this.filters.every((f) => f(r)));
    if (this.mode === 'update') { rows.forEach((r) => Object.assign(r, this.payload)); return { data: null, error: null }; }
    if (this.orderCol) rows = [...rows].sort((a, b) => (a[this.orderCol!] < b[this.orderCol!] ? -1 : 1) * (this.desc ? -1 : 1));
    rows = rows.slice(0, this.max);
    if (this.head) return { data: null, error: null, count: rows.length };
    if (this.one) return { data: rows[0] ?? null, error: rows[0] || this.one === 'maybe' ? null : { code: 'PGRST116' }, count: this.countOpt ? rows.length : null };
    return { data: rows, error: null, count: this.countOpt ? rows.length : null };
  }
}

const client = {
  from: (t: string) => new Query(t),
  rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'function not found' } }),
  // Only the financial bucket accepts files in these tests (the invoice
  // source bucket is "not ready", as before its migration).
  storage: { from: (bucket: string) => ({
    upload: async (path: string) => {
      if (bucket !== 'financial-documents') return { error: { message: 'not ready' } };
      (stored[bucket] ??= []).push(path); return { error: null };
    },
    remove: async (paths: string[]) => { stored[bucket] = (stored[bucket] ?? []).filter((p) => !paths.includes(p)); return { error: null }; },
  }) },
  auth: { getUser: async (token: string) => (USERS[token] ? { data: { user: { id: USERS[token] } }, error: null } : { data: { user: null }, error: { message: 'bad' } }) },
};

let handler: (req: Request) => Promise<Response>;
mock.module('https://deno.land/std@0.168.0/http/server.ts', () => ({ serve: (fn: any) => { handler = fn; } }));
mock.module('https://esm.sh/@supabase/supabase-js@2', () => ({ createClient: () => client }));
mock.module('https://esm.sh/pdf-lib@1.17.1', () => ({}));
const env: Record<string, string> = { SUPABASE_URL: 'http://db.local', SUPABASE_SERVICE_ROLE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', GEMINI_API_KEY: 'g' };
(globalThis as any).Deno = { env: { get: (k: string) => env[k] } };
(globalThis as any).EdgeRuntime = { waitUntil: () => {} };

// What the AI "reads" next, or an HTTP status to fail with.
let ocr: Row | number = {};
let lastBody: unknown = null;
let figures: Row = {};
globalThis.fetch = (async (url: string, init?: RequestInit) => {
  lastBody = init?.body;
  if (!String(url).includes('generativelanguage')) return new Response('{}', { status: 404 });
  if (typeof ocr === 'number') return new Response('{"error":"x"}', { status: ocr });
  if (String(lastBody).includes('Indian business financial documents')) {
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(figures) } }] }), { status: 200 });
  }
  return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(ocr) } }] }), { status: 200 });
}) as typeof fetch;

await import('../supabase/functions/extract-document/index.ts');

const file = (seed: string) => Buffer.from(`fake-image-${seed}-`.repeat(20)).toString('base64');
const upload = async (seed: string, extra: Row = {}) => {
  const res = await handler(new Request('http://fn/extract-document', {
    method: 'POST',
    headers: { Authorization: 'Bearer token-a', apikey: 'anon', 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: file(seed), mimeType: 'image/jpeg', ...extra }),
  }));
  return { status: res.status, body: await res.json() };
};

const diesel = (qty: string | null, number = 'INV-118') => ({
  documentType: 'Tax Invoice', vendor: 'Shree Fuels', date: '2026-09-14', invoiceNumber: number,
  supplierGstin: '27AAPFU0939F1ZV', amount: '₹4,690',
  lineItems: [{ description: 'HSD Diesel', hsn_code: '2710', quantity: qty, unit: qty ? 'litre' : null, total: '4,690' }],
});

beforeEach(() => { for (const k of Object.keys(db)) delete db[k]; for (const k of Object.keys(stored)) delete stored[k]; seq = 0; });

describe('invoice to stored records, through the real handler', () => {
  test('a readable fuel invoice: document and emission row are created on the server', async () => {
    ocr = diesel('1,250');
    const r = await upload('a');
    expect(r.status).toBe(200);
    expect(r.body.serverSaved).toBe(true);
    expect(r.body.emissionIds).toHaveLength(1);
    expect(db.documents).toHaveLength(1);
    expect(db.emissions).toHaveLength(1);
    const e = db.emissions[0];
    expect(e).toMatchObject({ document_id: db.documents[0].id, user_id: USERS['token-a'], scope: 1, activity_data: 1250, activity_unit: 'litre', verified: false });
    expect(e.co2_kg).toBeCloseTo(1250 * e.emission_factor, 6);
    expect(db.documents[0].amount).toBe(4690);
    expect(r.body.data.invoiceKey).toContain('27AAPFU0939F1ZV');
  });

  test('the same file again: stored result, nothing new', async () => {
    ocr = diesel('50');
    await upload('a');
    const r = await upload('a');
    expect(r.body.isDuplicate).toBe(true);
    expect(db.documents).toHaveLength(1);
    expect(db.emissions).toHaveLength(1);
  });

  test('the same invoice as a different file: counted once, linked to the stored copy', async () => {
    ocr = diesel('50');
    const first = await upload('a');
    const r = await upload('b');
    expect(r.body).toMatchObject({ isDuplicate: true, duplicateReason: 'same_invoice', documentHash: first.body.documentHash });
    expect(db.documents).toHaveLength(1);
    expect(db.emissions).toHaveLength(1);
  });

  test('missing litres: saved with no rows and one next step; read again once a clearer read has them', async () => {
    ocr = diesel(null, 'INV-200');
    const r = await upload('c');
    expect(r.body.serverSaved).toBe(true);
    expect(r.body.emissionIds).toEqual([]);
    expect(r.body.data.guidance).toMatchObject({ counted: 0, needsData: 1 });
    expect(r.body.data.guidance.nextStep).toMatch(/fuel slip/);
    expect(db.emissions ?? []).toHaveLength(0);

    ocr = diesel('40', 'INV-200');
    const again = await upload('c', { reread: true });
    expect(again.body.reread).toBe(true);
    expect(again.body.emissionIds).toHaveLength(1);
    expect(db.documents).toHaveLength(1);
    expect(db.emissions).toHaveLength(1);
    expect(db.documents[0].cached_result.lineItems[0].quantity).toBe(40);
  });

  test('read again is refused once the invoice is counted', async () => {
    ocr = diesel('50');
    await upload('a');
    ocr = diesel('999');
    const r = await upload('a', { reread: true });
    expect(r.body.isDuplicate).toBe(true);
    expect(db.emissions).toHaveLength(1);
    expect(db.emissions[0].activity_data).toBe(50);
  });

  test('a clearer copy of an invoice that produced nothing is stored and counted', async () => {
    ocr = diesel(null, 'INV-300');
    await upload('d');
    ocr = diesel('30', 'INV-300');
    const r = await upload('e');
    expect(r.body.isDuplicate).toBeUndefined();
    expect(r.body.emissionIds).toHaveLength(1);
    expect(db.documents).toHaveLength(2);
    expect(db.emissions).toHaveLength(1);
  });

  test('electricity bill in kWh: Scope 2 row at the CEA factor', async () => {
    ocr = { documentType: 'Electricity Bill', vendor: 'MSEDCL', date: '2026-09-05', invoiceNumber: 'B-77', amount: '9,000', currency: 'INR',
      unitsConsumedKwh: 1000, unitsConsumedUnit: 'kWh', unitsConsumedText: 'Units Consumed: 1000',
      lineItems: [{ description: 'Electricity consumed', quantity: 1000, unit: 'kWh', hsn_code: '2716' }] };
    const r = await upload('f');
    expect(r.body.emissionIds).toHaveLength(1);
    expect(db.emissions[0]).toMatchObject({ scope: 2, activity_data: 1000, activity_unit: 'kWh' });
    expect(db.emissions[0].co2_kg).toBeCloseTo(710, 6);
  });

  test('AI provider down: a clear our-side error, nothing stored', async () => {
    ocr = 500;
    const r = await upload('g');
    expect(r.status).toBe(503);
    expect(r.body.code).toBe('ai_down');
    expect(db.documents ?? []).toHaveLength(0);
  });

  test('oversized upload from a signed-in user is refused before any read', async () => {
    const big = Buffer.alloc(16 * 1024 * 1024).toString('base64');
    const res = await handler(new Request('http://fn', { method: 'POST', headers: { Authorization: 'Bearer token-a', apikey: 'anon' }, body: JSON.stringify({ imageBase64: big, mimeType: 'image/jpeg' }) }));
    expect(res.status).toBe(413);
  });

  test('a financial statement is not rejected: stored privately with allow-listed figures only', async () => {
    ocr = { documentType: 'Financial Statements', vendor: 'Asha Textiles Pvt Ltd', lineItems: [], notes: 'Balance Sheet as at 31 March 2026; Statement of Profit and Loss' };
    figures = { document_kind: 'financial_statement', financial_year: '2025-26', gross_turnover_inr: '48500000', net_profit_inr: 3100000, pan: 'ABCDE1234F', director_name: 'R. Mehta' };
    const r = await upload('fin');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ success: true, financialDocument: true, stored: true });
    expect(r.body.data).toBeUndefined();
    expect(db.documents ?? []).toHaveLength(0);
    expect(db.emissions ?? []).toHaveLength(0);
    expect(db.financial_documents).toHaveLength(1);
    const row = db.financial_documents[0];
    expect(row).toMatchObject({ user_id: USERS['token-a'], doc_kind: 'financial_statement', mime_type: 'image/jpeg' });
    expect(row.figures).toEqual({ document_kind: 'financial_statement', financial_year: '2025-26', gross_turnover_inr: 48500000, net_profit_inr: 3100000 });
    expect(JSON.stringify(row)).not.toMatch(/ABCDE1234F|Mehta/);
    expect(stored['financial-documents']).toEqual([row.storage_path]);
  });

  test('the same financial document twice is stored once', async () => {
    ocr = { documentType: 'unknown', notes: 'Income Tax Return ITR-4 Acknowledgement Number 123 Assessment Year 2026-27', lineItems: [] };
    figures = { document_kind: 'itr', total_income_inr: 900000 };
    await upload('itr');
    // The fake database has no unique index, so mimic Postgres refusing the repeat.
    const realInsert = Query.prototype.insert;
    Query.prototype.insert = function (this: any, rows: any) { if ((this as any).table === 'financial_documents') { (this as any).run = () => ({ data: null, error: { code: '23505' } }); return this; } return realInsert.call(this, rows); } as any;
    const again = await upload('itr');
    Query.prototype.insert = realInsert;
    expect(again.body).toMatchObject({ financialDocument: true, stored: true, alreadyStored: true });
    expect(db.financial_documents).toHaveLength(1);
  });

  test('an accountant\'s tax invoice for ITR filing stays an invoice', async () => {
    ocr = { documentType: 'Tax Invoice', vendor: 'Gupta & Co', invoiceNumber: 'GC/77', date: '2026-08-01', supplierGstin: '27AAPFU0939F1ZV', amount: 5900,
      lineItems: [{ description: 'Professional fees: ITR filing and preparation of financial statements', hsn_code: '998221', total: 5000 }] };
    const r = await upload('ca');
    expect(r.body.financialDocument).toBeUndefined();
    expect(r.body.success).toBe(true);
    expect(db.documents).toHaveLength(1);
    expect(db.financial_documents ?? []).toHaveLength(0);
  });

  test('before the storage migration: nothing kept, a clear message', async () => {
    ocr = { documentType: 'Bank Statement', notes: 'Bank Statement for account, IFSC HDFC0001234, branch Pune; opening balance 10,000 closing balance 12,000', lineItems: [] };
    figures = {};
    const realFrom = client.from;
    client.from = ((t: string) => (t === 'financial_documents' ? { insert: () => Promise.resolve({ error: { code: '42P01' } }) } : realFrom(t))) as any;
    const r = await upload('bank');
    client.from = realFrom;
    expect(r.body).toMatchObject({ financialDocument: true, stored: false });
    expect(stored['financial-documents'] ?? []).toHaveLength(0);
  });
});
