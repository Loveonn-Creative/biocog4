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
  rpc: async (name: string, args: any) => rpcHandler(name, args),
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
// RPC stand-in: "not found" (ledger not migrated) unless a test sets one.
const notFound = async () => ({ data: null, error: { code: 'PGRST202', message: 'function not found' } });
let rpcHandler: (name: string, args: any) => Promise<any> = notFound;
const rpcCalls: Array<{ name: string; args: any }> = [];
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

beforeEach(() => { rpcHandler = notFound; rpcCalls.length = 0; for (const k of Object.keys(db)) delete db[k]; for (const k of Object.keys(stored)) delete stored[k]; seq = 0; });

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

// Owner-approved bill reader rules (October 2026): printed kWh on kVAh bills,
// kVAh x printed power factor as a labelled estimate, bill charges as money,
// handwritten bills and meter photos labelled. Through the real handler.
describe('electricity bill reader: kVAh, charges, handwritten bills and meter photos', () => {
  const msedclHt = (extra: Row = {}) => ({
    documentType: 'Electricity Bill', vendor: 'MSEDCL', date: '2026-09-05', invoiceNumber: 'HT-9', amount: '1,95,000', currency: 'INR',
    billingPeriodStart: '2026-08-01', billingPeriodEnd: '2026-08-31',
    unitsConsumedKwh: 20000, unitsConsumedUnit: 'kVAh', unitsConsumedText: 'Billed Demand Consumption 20000 kVAh',
    lineItems: [
      { description: 'Electricity consumed', hsn_code: '2716', quantity: 20000, unit: 'kVAh' },
      { description: 'Demand Charges', total: 45000 }, { description: 'Wheeling Charge', total: 12000 },
      { description: 'TOD Tariff EC', total: 3000 }, { description: 'FAC', total: 2000 },
      { description: 'Electricity Duty', total: 9000 }, { description: 'Tax on Sale', total: 600 },
      { description: 'Prompt Payment Discount', total: -1500 }, { description: 'Incremental Consumption Rebate', total: -800 },
    ],
    ...extra,
  });
  const counted = (r: { body: any }) => r.body.data.lineItems.filter((l: any) => typeof l.co2Kg === 'number');

  test('kVAh bill with printed kWh: the printed kWh is used, basis read_from_bill, kVAh kept as evidence', async () => {
    ocr = msedclHt({ activeEnergyKwh: 19100, activeEnergyText: 'kWh Consumption 19100', powerFactor: 0.955, powerFactorText: 'Avg PF 0.955' });
    const r = await upload('ht-kwh');
    expect(r.body.emissionIds).toHaveLength(1);
    expect(db.emissions[0]).toMatchObject({ scope: 2, activity_data: 19100, activity_unit: 'kWh' });
    expect(db.emissions[0].co2_kg).toBeCloseTo(19100 * 0.71, 6);
    const [line] = counted(r);
    expect(line).toMatchObject({ basis: 'read_from_bill', basisLabel: 'Read from the bill' });
    expect(line.evidence.kvah).toBe(20000);
    expect(JSON.parse(db.emissions[0].verification_notes)).toMatchObject({ basis: 'read_from_bill' });
    expect(JSON.stringify(r.body.data)).not.toMatch(/HSN code/i);
  });

  test('kVAh bill with only a printed power factor: kWh = kVAh x PF, labelled estimate, lower data quality', async () => {
    ocr = msedclHt({ powerFactor: '0.95', powerFactorText: 'Average PF 0.95' });
    const r = await upload('ht-pf');
    expect(r.body.emissionIds).toHaveLength(1);
    expect(db.emissions[0]).toMatchObject({ activity_data: 19000, activity_unit: 'kWh' });
    const [line] = counted(r);
    expect(line.basis).toBe('estimated_kvah_pf');
    expect(line.evidence).toMatchObject({ kvah: 20000, powerFactor: 0.95 });
    expect(r.body.data.validationFlags.join(' ')).toContain('Estimated: kWh worked out from kVAh x the power factor printed on the bill (kVAh × PF)');
    const notes = JSON.parse(db.emissions[0].verification_notes);
    expect(notes.basis).toBe('estimated_kvah_pf');
    expect(notes.basisLabel).toMatch(/^Estimated/);
    expect(['medium', 'low']).toContain(db.emissions[0].data_quality);
  });

  test('kVAh bill with neither: no emissions, friendly guidance, reading again is not offered', async () => {
    ocr = msedclHt();
    const r = await upload('ht-none');
    expect(r.body.emissionIds).toEqual([]);
    expect(db.emissions ?? []).toHaveLength(0);
    expect(r.body.data.guidance.nextStep).toBe('Your bill is in kVAh. We need the kWh or power factor printed on it — usually near the meter readings.');
    expect(r.body.data.guidance.deterministicBlocker).toBe(true);
  });

  test('kVAh bill with neither, owner types the kWh: counted, labelled "Entered by you", lower data quality', async () => {
    ocr = msedclHt();
    const r = await upload('ht-entered', { enteredKwh: 19300 });
    expect(r.body.emissionIds).toHaveLength(1);
    expect(db.emissions[0]).toMatchObject({ scope: 2, activity_data: 19300, activity_unit: 'kWh' });
    const [line] = counted(r);
    expect(line).toMatchObject({ basis: 'entered_by_you', basisLabel: 'Entered by you' });
    expect(line.evidence).toMatchObject({ kvah: 20000, enteredKwh: 19300 });
    expect(['medium', 'low']).toContain(db.emissions[0].data_quality);
    expect(JSON.parse(db.emissions[0].verification_notes).basis).toBe('entered_by_you');
  });

  test('typed kWh that does not fit the bill (above its kVAh, or below kVAh x 0.5) is not used', async () => {
    for (const [seed, kwh] of [['ht-entered-high', 25000], ['ht-entered-low', 5000]] as const) {
      ocr = msedclHt();
      const r = await upload(seed, { enteredKwh: kwh });
      expect(r.body.emissionIds).toEqual([]);
      expect(r.body.data.guidance.deterministicBlocker).toBe(true);
    }
  });

  test('a printed kWh wins over a typed one', async () => {
    ocr = msedclHt({ activeEnergyKwh: 19100, activeEnergyText: 'kWh Consumption 19100' });
    const r = await upload('ht-entered-printed', { enteredKwh: 19300 });
    expect(db.emissions[0]).toMatchObject({ activity_data: 19100 });
    expect(counted(r)[0].basis).toBe('read_from_bill');
  });

  test('charge lines on an electricity bill are bill charges: not unrecognised, never an HSN request', async () => {
    ocr = msedclHt({ activeEnergyKwh: 19100, activeEnergyText: 'kWh 19100' });
    const r = await upload('ht-charges');
    const g = r.body.data.guidance;
    expect(g.billCharges).toBe(8);
    expect(g.unclassified).toBe(0);
    expect(g.needsData).toBe(0);
    const charges = r.body.data.lineItems.filter((l: any) => l.guidance?.status === 'bill_charge');
    expect(charges).toHaveLength(8);
    for (const c of charges) expect(c.guidance.nextStep).toBe('Part of this electricity bill: a cost, not a separate activity.');
    expect(r.body.data.validationFlags.join(' ')).not.toMatch(/Unclassified/);
    expect(JSON.stringify(r.body.data)).not.toMatch(/HSN code/i);
  });

  test('handwritten bill: read normally, labelled, one data-quality level lower', async () => {
    ocr = { ...diesel('100', 'HW-1'), documentCapture: 'handwritten' };
    const r = await upload('hw');
    expect(r.body.emissionIds).toHaveLength(1);
    const [line] = counted(r);
    expect(line).toMatchObject({ basis: 'handwritten', basisLabel: 'Read from a handwritten bill' });
    ocr = diesel('100', 'PR-1');
    const printed = await upload('printed');
    const [hw, pr] = db.emissions;
    expect(counted(printed)[0].basis).toBe('read_from_bill');
    const rank = { high: 3, medium: 2, low: 1 } as Record<string, number>;
    expect(rank[hw.data_quality]).toBeLessThan(rank[pr.data_quality]);
  });

  test('meter photo with two readings: consumption is the difference, worked out in code', async () => {
    ocr = { documentType: 'unknown', documentCapture: 'meter_photo', lineItems: [],
      meterReadings: [{ readingKwh: 48215, readingDate: '2026-09-01', sourceText: '48215 kWh' }, { readingKwh: 47815, readingDate: '2026-08-01', sourceText: '47815 kWh' }] };
    const r = await upload('meter2');
    expect(r.status).toBe(200);
    expect(r.body.emissionIds).toHaveLength(1);
    expect(db.emissions[0]).toMatchObject({ scope: 2, activity_data: 400, activity_unit: 'kWh' });
    const [line] = counted(r);
    expect(line).toMatchObject({ basis: 'meter_readings', basisLabel: 'Calculated from two meter readings in the photo' });
    expect(r.body.data.documentCapture).toBe('meter_photo');
  });

  test('meter photo with one reading: no emissions, asks for the previous reading', async () => {
    ocr = { documentType: 'bill', documentCapture: 'meter_photo', lineItems: [], meterReadings: [{ readingKwh: 48215, readingDate: null, sourceText: '48215' }] };
    const r = await upload('meter1');
    expect(r.status).toBe(200);
    expect(r.body.emissionIds).toEqual([]);
    expect(r.body.data.guidance.nextStep).toBe('Add your previous meter reading or the bill for this period.');
    expect(r.body.data.guidance.deterministicBlocker).toBe(true);
  });

  test('meter photo whose later reading is lower: rejected, nothing counted', async () => {
    ocr = { documentType: 'bill', documentCapture: 'meter_photo', lineItems: [],
      meterReadings: [{ readingKwh: 47815, readingDate: '2026-09-01', sourceText: '47815' }, { readingKwh: 48215, readingDate: '2026-08-01', sourceText: '48215' }] };
    const r = await upload('meter-neg');
    expect(r.body.emissionIds).toEqual([]);
    expect(r.body.data.validationFlags.join(' ')).toMatch(/not higher than the earlier/);
  });
});

describe('document kinds through the real handler', () => {
  test('a tax invoice is labelled and counted as before, with its calculation trail stored', async () => {
    ocr = { ...diesel('100', 'INV-900'), documentTitle: 'Tax Invoice' };
    const r = await upload('k1');
    expect(r.body.data.documentKind).toBe('tax_invoice');
    expect(r.body.emissionIds).toHaveLength(1);
    const notes = JSON.parse(db.emissions[0].verification_notes);
    expect(notes.factorSetVersion).toBe(r.body.data.methodology.factorVersion);
    expect(Array.isArray(notes.assumptions)).toBe(true);
  });

  test('a credit note is stored as evidence and never counted', async () => {
    ocr = { ...diesel('100', 'CN-12'), documentType: 'Credit Note', documentTitle: 'Credit Note' };
    const r = await upload('k2');
    expect(r.status).toBe(200);
    expect(r.body.data.documentKind).toBe('credit_note');
    expect(r.body.serverSaved).toBe(true);
    expect(r.body.emissionIds).toEqual([]);
    expect(db.emissions ?? []).toHaveLength(0);
    expect(db.documents).toHaveLength(1);
    expect(r.body.data.totalCO2Kg).toBeUndefined();
    expect(r.body.data.lineItems[0].co2Kg).toBeUndefined();
    expect(r.body.data.lineItems[0].guidance.status).toBe('reference');
  });

  test('a credit note citing a counted invoice is not taken for that invoice', async () => {
    ocr = { ...diesel('100', 'INV-950'), documentTitle: 'Tax Invoice' };
    await upload('k3');
    ocr = { ...diesel('100', 'INV-950'), documentTitle: 'Credit Note' };
    const r = await upload('k4');
    expect(r.body.isDuplicate).toBeUndefined();
    expect(r.body.data.documentKind).toBe('credit_note');
    expect(db.documents).toHaveLength(2);
    expect(db.emissions).toHaveLength(1);
  });

  test('a purchase order is stored as evidence and never counted', async () => {
    ocr = { ...diesel('500', 'PO-7'), documentType: 'Purchase Order', documentTitle: 'Purchase Order' };
    const r = await upload('k5');
    expect(r.body.data.documentKind).toBe('purchase_order');
    expect(db.emissions ?? []).toHaveLength(0);
  });

  test('price check flags a mismatch and changes no figure', async () => {
    ocr = { ...diesel('100', 'INV-960'), documentTitle: 'Tax Invoice' };
    (ocr as any).lineItems[0].unitPrice = '92.50';
    (ocr as any).lineItems[0].total = '925';
    const r = await upload('k6');
    const line = r.body.data.lineItems[0];
    expect(line.priceCheck).toMatchObject({ expected: 9250, total: 925 });
    expect(line.validationFlags.some((f: string) => f.startsWith('Price check'))).toBe(true);
    expect(db.emissions[0].activity_data).toBe(100);
    expect(line.guidance.status).toBe('counted');
  });
});

describe('reading budget', () => {
  test('first read is flash with a 4,096-token cap', async () => {
    ocr = { ...diesel('10', 'INV-970'), documentTitle: 'Tax Invoice' };
    await upload('k7');
    const body = JSON.parse(String(lastBody));
    expect(body.max_tokens).toBe(4096);
    expect(body.model).toContain('flash');
  });
});


describe('reads ledger', () => {
  const ledger = (reserve: any) => async (name: string, args: any) => {
    rpcCalls.push({ name, args });
    if (name === 'reserve_invoice_read') return { data: reserve, error: null };
    if (!/_invoice_read$/.test(name)) return notFound();
    return { data: true, error: null };
  };
  const settled = () => rpcCalls.filter((c) => /_invoice_read$/.test(c.name) && c.name !== 'reserve_invoice_read').map((c) => c.name);

  test('a read is reserved with its page count and committed with the stored document', async () => {
    rpcHandler = ledger({ ok: true, id: 'read-1', units: 1 });
    ocr = { ...diesel('10', 'INV-L1'), documentTitle: 'Tax Invoice' };
    const r = await upload('l1');
    expect(r.status).toBe(200);
    const reserve = rpcCalls.find((c) => c.name === 'reserve_invoice_read')!;
    expect(reserve.args).toMatchObject({ p_pages: 1, p_plan_limit: 10 });
    expect(settled()).toEqual(['commit_invoice_read']);
    expect(rpcCalls.at(-1)!.args).toMatchObject({ p_id: 'read-1', p_document_id: db.documents[0].id });
  });

  test('the same invoice as another file is released, not counted', async () => {
    ocr = { ...diesel('10', 'INV-L2'), documentTitle: 'Tax Invoice' };
    await upload('l2');
    rpcHandler = ledger({ ok: true, id: 'read-2', units: 1 });
    const r = await upload('l3');
    expect(r.body.duplicateReason).toBe('same_invoice');
    expect(settled()).toEqual(['release_invoice_read']);
  });

  test('a failed read is released', async () => {
    rpcHandler = ledger({ ok: true, id: 'read-3', units: 1 });
    ocr = 500;
    await upload('l4');
    expect(settled()).toEqual(['release_invoice_read']);
  });

  test('over the limit with no credits: refused before the AI reads it, with a top-up hint', async () => {
    rpcHandler = ledger({ ok: false, reason: 'limit', used: 10, credits: 0, units: 3 });
    ocr = diesel('10', 'INV-L5');
    lastBody = null;
    const r = await upload('l5');
    expect(r.status).toBe(429);
    expect(r.body).toMatchObject({ code: 'monthly_limit', topUp: true });
    expect(r.body.error).toContain('top up credits');
    expect(lastBody).toBeNull(); // the AI was never called
    expect(db.documents ?? []).toHaveLength(0);
  });
});
