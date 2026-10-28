// The import-records handler against an in-memory database: what is stored
// for each spreadsheet row, duplicates, the plan allowance and access rules.
// Also checks that imported rows land in the same shape as an uploaded bill
// and pass the same verification evidence gate.
import { beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { handleImportRecords, MESSAGES } from '../supabase/functions/import-records/handler';
import { buildImportedRecord, importDocumentHash, importIdentityJson } from '../supabase/functions/_shared/importRecord';
import { evidenceGaps, validateEmission } from '../supabase/functions/_shared/verifyGate';
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '../supabase/functions/_shared/emissionFactors';
import { invoiceIdentity } from '../supabase/functions/_shared/extractionRead';

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const USER = '00000000-0000-4000-8000-00000000000a';
const ORG = '11111111-1111-4111-8111-111111111111';
const USERS: Record<string, string> = { 'token-a': USER };
let seq = 0;

const field = (row: Row, col: string) => {
  const m = col.match(/^(\w+)->>(\w+)$/);
  return m ? row[m[1]]?.[m[2]] : row[col];
};

class Query {
  private filters: ((r: Row) => boolean)[] = [];
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any;
  private countOpt = false; private head = false; private one: 'single' | 'maybe' | null = null; private max = Infinity;
  private orders: Array<[string, boolean]> = []; private returning = false;
  constructor(private table: string) {}
  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode !== 'select') this.returning = true;
    if (opts?.count) this.countOpt = true; if (opts?.head) this.head = true;
    return this;
  }
  insert(rows: Row | Row[]) { this.mode = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(obj: Row) { this.mode = 'update'; this.payload = obj; return this; }
  delete() { this.mode = 'delete'; return this; }
  eq(c: string, v: any) { this.filters.push((r) => field(r, c) === v); return this; }
  neq(c: string, v: any) { this.filters.push((r) => field(r, c) !== v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => String(field(r, c)) >= String(v)); return this; }
  order(c: string, o?: { ascending?: boolean }) { this.orders.push([c, o?.ascending === false]); return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  then(res: (v: any) => any, rej?: (e: any) => any) { return Promise.resolve(this.run()).then(res, rej); }
  private run() {
    const t = (db[this.table] ??= []);
    if (this.mode === 'insert') {
      if (failInsert === this.table) return { data: null, error: { code: '23505' } };
      const added = this.payload.map((r: Row) => ({ id: `id-${String(++seq).padStart(4, '0')}`, created_at: new Date(Date.parse('2026-10-27T06:00:00Z') + seq * 1000).toISOString(), ...r }));
      t.push(...added);
      onInsert?.(this.table, added);
      return { data: this.returning ? (this.one ? added[0] : added) : null, error: null };
    }
    let rows = t.filter((r) => this.filters.every((f) => f(r)));
    if (this.mode === 'delete') { db[this.table] = t.filter((r) => !rows.includes(r)); return { data: null, error: null }; }
    for (const [col, desc] of [...this.orders].reverse()) rows = [...rows].sort((a, b) => (a[col] === b[col] ? 0 : (a[col] < b[col] ? -1 : 1) * (desc ? -1 : 1)));
    rows = rows.slice(0, this.max);
    if (this.head) return { data: null, error: null, count: rows.length };
    if (this.one) return { data: rows[0] ?? null, error: rows[0] || this.one === 'maybe' ? null : { code: 'PGRST116' } };
    return { data: rows, error: null, count: this.countOpt ? rows.length : null };
  }
}

const notFound = async () => ({ data: null, error: { code: 'PGRST202', message: 'function not found' } });
let rpcHandler: (name: string, args: any) => Promise<any> = notFound;
const rpcCalls: Array<{ name: string; args: any }> = [];
let failInsert: string | null = null;
let onInsert: ((table: string, rows: Row[]) => void) | null = null;
const client = {
  from: (t: string) => new Query(t),
  rpc: async (name: string, args: any) => { rpcCalls.push({ name, args }); return rpcHandler(name, args); },
  auth: { getUser: async (token: string) => (USERS[token] ? { data: { user: { id: USERS[token] } }, error: null } : { data: { user: null }, error: { message: 'bad' } }) },
};
const env: Record<string, string> = { SUPABASE_URL: 'http://db.local', SUPABASE_SERVICE_ROLE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon' };
const NOW = new Date('2026-10-27T06:00:00Z');
const deps = { env: (k: string) => env[k], makeClient: () => client, now: () => NOW };

const call = async (body: Row, token: string | null = 'token-a') => {
  const res = await handleImportRecords(new Request('http://fn/import-records', {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), apikey: 'anon', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), deps);
  return { status: res.status, body: await res.json() };
};

const values = (o: Partial<Record<string, string>> = {}) => ({
  date: '2026-09-14', type: 'Diesel', quantity: '1,250', unit: 'litre', supplier: 'Shree Fuels',
  gstin: '27AAPFU0939F1ZV', invoice: 'INV-118', amount: '4,690', notes: '', ...o,
});
const bills = (...rows: Row[]) => ({ kind: 'bills', rows: rows.map((v, i) => ({ line: i + 2, values: v })) });

beforeEach(() => {
  rpcHandler = notFound; rpcCalls.length = 0; failInsert = null; onInsert = null; seq = 0;
  for (const k of Object.keys(db)) delete db[k];
  db.profiles = [{ id: USER, subscription_tier: 'pro', subscription_expires_at: '2027-10-01T00:00:00Z', location: 'Pune, India' }];
  db.subscriptions = [];
});

describe('access', () => {
  test('signed-out callers are refused and nothing is stored', async () => {
    for (const token of [null, 'anon']) {
      const r = await call(bills(values()), token);
      expect(r.status).toBe(401);
      expect(r.body.error).toBe(MESSAGES.signIn);
    }
    const bad = await call(bills(values()), 'token-expired');
    expect(bad.status).toBe(401);
    expect(db.documents ?? []).toHaveLength(0);
  });
  test('a team role without upload rights is refused for the organisation', async () => {
    rpcHandler = async (name) => (name === 'service_org_can' ? { data: false, error: null } : notFound());
    const r = await call({ ...bills(values()), organizationId: ORG });
    expect(r.status).toBe(403);
    expect(rpcCalls.find((c) => c.name === 'service_org_can')?.args).toMatchObject({ p_user_id: USER, p_organization_id: ORG, p_capability: 'records.upload' });
    expect(db.documents ?? []).toHaveLength(0);
  });
  test('an organisation member with upload rights saves into the organisation', async () => {
    rpcHandler = async (name) => (name === 'service_org_can' ? { data: true, error: null } : notFound());
    const r = await call({ ...bills(values()), organizationId: ORG });
    expect(r.body.counts.saved).toBe(1);
    expect(db.documents[0].organization_id).toBe(ORG);
    expect(db.emissions[0].organization_id).toBe(ORG);
  });
  test('supplier lists, empty and oversized batches are refused', async () => {
    expect((await call({ kind: 'suppliers', rows: [{ line: 2, values: { name: 'A' } }] })).status).toBe(400);
    expect((await call({ kind: 'bills', rows: [] })).status).toBe(400);
    expect((await call({ kind: 'bills', rows: Array.from({ length: 101 }, (_, i) => ({ line: i + 2, values: values({ invoice: `I-${i}` }) })) })).status).toBe(413);
    expect((await call({ ...bills(values()), organizationId: 'not-a-uuid' })).status).toBe(400);
  });
});

describe('request problems', () => {
  test('technical problems give one plain message and a code', async () => {
    const send = async (init: RequestInit) => {
      const res = await handleImportRecords(new Request('http://fn/import-records', init), deps);
      return { status: res.status, body: await res.json() };
    };
    const auth = { Authorization: 'Bearer token-a', apikey: 'anon', 'Content-Type': 'application/json' };
    const cases = [
      [await send({ method: 'GET' }), 'method_not_allowed'],
      [await send({ method: 'POST', headers: auth, body: 'not json' }), 'bad_json'],
      [await send({ method: 'POST', headers: auth, body: JSON.stringify({ kind: 'other', rows: [] }) }), 'unknown_kind'],
      [await send({ method: 'POST', headers: auth, body: JSON.stringify({ kind: 'bills', rows: [] }) }), 'no_rows'],
      [await send({ method: 'POST', headers: auth, body: JSON.stringify({ ...bills(values()), organizationId: 'x' }) }), 'invalid_organization'],
    ] as const;
    for (const [r, code] of cases) expect(r.body).toEqual({ error: MESSAGES.generic, code });
    expect(MESSAGES.generic).toBe('We could not save these rows. Try again in a minute.');
  });
});

describe('saving rows', () => {
  test('a ready diesel row becomes one document and one unverified emission row, like an uploaded bill', async () => {
    const r = await call(bills(values()));
    expect(r.status).toBe(200);
    expect(r.body.results).toEqual([{ line: 2, status: 'saved', documentId: db.documents[0].id, emissions: 1 }]);
    const d = db.documents[0];
    expect(d).toMatchObject({ user_id: USER, document_type: 'Diesel bill', vendor: 'Shree Fuels', invoice_number: 'INV-118', invoice_date: '2026-09-14', amount: 4690, file_url: null, session_id: null, confidence: null });
    expect(d.document_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(d.cached_result.source).toBe('import');
    expect(d.cached_result.lineItems).toHaveLength(1);
    expect(d.cached_result.invoiceKey).toBe(invoiceIdentity({ supplierGstin: '27AAPFU0939F1ZV', vendor: 'Shree Fuels', invoiceNumber: 'INV-118', date: '2026-09-14' }));
    const e = db.emissions[0];
    expect(e).toMatchObject({ document_id: d.id, user_id: USER, session_id: null, scope: 1, category: 'fuel', activity_data: 1250, activity_unit: 'litre', emission_factor: FUEL_FACTORS.DIESEL.value, verified: false, data_quality: 'medium' });
    expect(e.co2_kg).toBeCloseTo(1250 * FUEL_FACTORS.DIESEL.value, 6);
    const notes = JSON.parse(e.verification_notes);
    expect(notes).toMatchObject({ factorSource: 'BIOCOG_MVR_INDIA_v1.2:DIESEL', classificationMethod: 'KEYWORD', basis: 'entered_by_you', basisLabel: 'Entered by you', factorSetVersion: 'IND_EF_2026_11' });
    expect(notes.assumptions).toContain('Imported from spreadsheet row 2');
    // Verify holds a typed row back until its bill is uploaded; the same
    // record from an uploaded bill would pass.
    const record = { ...e, documents: { vendor: d.vendor, invoice_number: d.invoice_number, amount: d.amount, confidence: d.confidence, document_hash: d.document_hash, invoice_date: d.invoice_date, cached_result: d.cached_result } };
    expect(evidenceGaps(record, false)).toEqual(['bill: typed figures are verified only from the uploaded bill']);
    const asUploaded = { ...record, documents: { ...record.documents, cached_result: { ...d.cached_result, source: undefined } } };
    expect(evidenceGaps(asUploaded, false)).toEqual([]);
    expect(validateEmission(record).valid).toBe(true);
  });
  test('units are converted to the factor unit and the typed figures kept', async () => {
    await call(bills(values({ type: 'Electricity', quantity: '12.48', unit: 'MWh', supplier: 'MSEDCL', invoice: 'EB-1' })));
    const e = db.emissions[0];
    expect(e).toMatchObject({ scope: 2, category: 'electricity', activity_data: 12480, activity_unit: 'kWh', emission_factor: 0.675 });
    const item = db.documents[0].cached_result.lineItems[0];
    expect(item).toMatchObject({ originalQuantity: 12.48, originalUnit: 'MWh', quantity: 12480, unit: 'kWh' });
    expect(item.assumptions).toContain('Grid factor for IN');
  });
  test('freight is saved as a record with no emission row, as an uploaded freight invoice is', async () => {
    const r = await call(bills(values({ type: 'Freight', quantity: '4800', unit: 'tonne-km', supplier: 'VRL Logistics', invoice: 'VRL-1' })));
    expect(r.body.results[0]).toMatchObject({ status: 'saved', emissions: 0 });
    expect(db.documents).toHaveLength(1);
    expect(db.emissions ?? []).toHaveLength(0);
    expect(db.documents[0].cached_result.lineItems[0]).toMatchObject({ productCategory: 'TRANSPORT', scope: 3 });
    expect(db.documents[0].cached_result.lineItems[0].co2Kg).toBeUndefined();
  });
  test('rows are checked again on the server: a bad row is refused, whatever the browser said', async () => {
    const r = await call(bills(values({ quantity: '0' }), values({ gstin: '27AAPFU0939F1ZA', invoice: 'X' }), values({ unit: 'cylinder', type: 'LPG', invoice: 'Y' })));
    expect(r.body.results.map((x: Row) => x.status)).toEqual(['invalid', 'invalid', 'invalid']);
    expect(r.body.results[0].reason).toBe('Quantity must be more than 0.');
    expect(db.documents ?? []).toHaveLength(0);
  });
  test('a failed save is reported and its read released', async () => {
    rpcHandler = async (name) => (name === 'reserve_invoice_read' ? { data: { ok: true, id: 'read-1' }, error: null } : { data: true, error: null });
    failInsert = 'documents';
    const r = await call(bills(values()));
    expect(r.body.results[0]).toMatchObject({ status: 'failed', code: 'save_failed', reason: 'Not saved. Try again.' });
    expect(rpcCalls.map((c) => c.name)).toContain('release_invoice_read');
    expect(rpcCalls.map((c) => c.name)).not.toContain('commit_invoice_read');
  });
});

describe('nothing half-saved', () => {
  test('when the emission row cannot be stored, the document is removed, the read released and the row reported failed', async () => {
    rpcHandler = async (name) => (name === 'reserve_invoice_read' ? { data: { ok: true, id: 'read-1' }, error: null } : { data: true, error: null });
    failInsert = 'emissions';
    const r = await call(bills(values()));
    expect(r.body.results[0]).toEqual({ line: 2, status: 'failed', reason: 'Not saved. Try again.', code: 'save_failed' });
    expect(r.body.counts).toEqual({ saved: 0, duplicate: 0, invalid: 0, failed: 1 });
    expect(db.documents ?? []).toHaveLength(0);
    expect(db.emissions ?? []).toHaveLength(0);
    const names = rpcCalls.map((c) => c.name);
    expect(names).toContain('release_invoice_read');
    expect(names).not.toContain('commit_invoice_read');
    // Running the same rows again saves them once.
    failInsert = null; rpcCalls.length = 0;
    const again = await call(bills(values()));
    expect(again.body.results[0]).toMatchObject({ status: 'saved', emissions: 1 });
    expect(db.documents).toHaveLength(1);
    expect(db.emissions).toHaveLength(1);
    expect(rpcCalls.map((c) => c.name)).toContain('commit_invoice_read');
  });
  test('two tabs importing the same row at once: the later copy is removed and reported as a duplicate', async () => {
    rpcHandler = async (name) => (name === 'reserve_invoice_read' ? { data: { ok: true, id: 'read-2' }, error: null } : { data: true, error: null });
    // Another tab stores the same row between our check and our save.
    onInsert = (table, rows) => {
      if (table !== 'documents' || rows[0].id === 'other') return;
      onInsert = null;
      db.documents.unshift({ ...rows[0], id: 'other', created_at: '2026-10-27T05:59:59.000Z' });
      db.emissions = [{ id: 'other-em', document_id: 'other' }];
    };
    const r = await call(bills(values()));
    expect(r.body.results[0]).toEqual({ line: 2, status: 'duplicate', reason: MESSAGES.stored });
    expect(db.documents.map((d) => d.id)).toEqual(['other']);
    expect(db.emissions.map((e) => e.document_id)).toEqual(['other']);
    expect(rpcCalls.map((c) => c.name)).toContain('release_invoice_read');
    expect(rpcCalls.map((c) => c.name)).not.toContain('commit_invoice_read');
  });
  test('every row sent gets exactly one outcome, and the counts add up', async () => {
    const r = await call(bills(values(), values(), values({ quantity: 'x', invoice: 'Z' }), values({ type: 'Freight', unit: 'tkm', invoice: 'F' })));
    expect(r.body.results).toHaveLength(4);
    const c = r.body.counts;
    expect(c.saved + c.duplicate + c.invalid + c.failed).toBe(4);
    expect(c).toEqual({ saved: 2, duplicate: 1, invalid: 1, failed: 0 });
  });
});

describe('duplicates', () => {
  test('the same row imported twice is the same document', async () => {
    await call(bills(values()));
    const again = await call(bills(values({ quantity: '1250' })));
    expect(again.body.results[0]).toEqual({ line: 2, status: 'duplicate', reason: MESSAGES.stored });
    expect(db.documents).toHaveLength(1);
    expect(db.emissions).toHaveLength(1);
  });
  test('the same bill already uploaded and counted is skipped (same invoiceKey)', async () => {
    const key = invoiceIdentity({ supplierGstin: '27AAPFU0939F1ZV', vendor: 'Shree Fuels', invoiceNumber: 'INV-118', date: '2026-09-14' });
    db.documents = [{ id: 'up-1', user_id: USER, document_hash: 'filehash', created_at: '2026-09-20', cached_result: { invoiceKey: key } }];
    db.emissions = [{ id: 'em-1', document_id: 'up-1' }];
    const r = await call(bills(values()));
    expect(r.body.results[0]).toEqual({ line: 2, status: 'duplicate', reason: MESSAGES.sameBill });
    expect(db.documents).toHaveLength(1);
  });
  test('an uploaded copy that produced nothing does not block the row, as on upload', async () => {
    const key = invoiceIdentity({ supplierGstin: '27AAPFU0939F1ZV', vendor: 'Shree Fuels', invoiceNumber: 'INV-118', date: '2026-09-14' });
    db.documents = [{ id: 'up-1', user_id: USER, document_hash: 'filehash', created_at: '2026-09-20', cached_result: { invoiceKey: key } }];
    const r = await call(bills(values()));
    expect(r.body.results[0].status).toBe('saved');
  });
  test('another account\'s records never count as duplicates', async () => {
    const hash = await importDocumentHash(values());
    db.documents = [{ id: 'x', user_id: 'someone-else', document_hash: hash, created_at: '2026-09-20', cached_result: {} }];
    expect((await call(bills(values()))).body.results[0].status).toBe('saved');
  });
  test('repeats inside one batch are saved once', async () => {
    const r = await call(bills(values(), values(), values({ quantity: '1250.0', notes: 'typed again' })));
    expect(r.body.results.map((x: Row) => x.status)).toEqual(['saved', 'duplicate', 'duplicate']);
    expect(db.documents).toHaveLength(1);
  });
});

describe('plan allowance', () => {
  test('each saved row reserves and commits one read; saving stops when the allowance is used', async () => {
    let left = 2;
    rpcHandler = async (name, args) => {
      if (name === 'reserve_invoice_read') return left-- > 0 ? { data: { ok: true, id: `read-${args.p_hash.slice(0, 6)}` }, error: null } : { data: { ok: false, reason: 'limit', units: 1, used: 1000 }, error: null };
      if (name === 'service_enterprise_cover_reads') return { data: { covered: false }, error: null };
      return { data: true, error: null };
    };
    const r = await call(bills(values({ invoice: 'A1' }), values({ invoice: 'A2' }), values({ invoice: 'A3' }), values({ invoice: 'A4' })));
    expect(r.body.results.map((x: Row) => x.status)).toEqual(['saved', 'saved', 'failed', 'failed']);
    expect(r.body.counts).toEqual({ saved: 2, duplicate: 0, invalid: 0, failed: 2 });
    expect(r.body.results[2]).toMatchObject({ code: 'monthly_limit', reason: 'Monthly bill limit reached. Not saved.' });
    expect(r.body.limitReached).toBe(true);
    const reserves = rpcCalls.filter((c) => c.name === 'reserve_invoice_read');
    expect(reserves).toHaveLength(3);
    expect(reserves[0].args).toMatchObject({ p_user: USER, p_org: null, p_pages: 1, p_plan_limit: 1000 });
    const commits = rpcCalls.filter((c) => c.name === 'commit_invoice_read');
    expect(commits.map((c) => c.args.p_document_id)).toEqual(db.documents.map((d) => d.id));
    expect(db.documents).toHaveLength(2);
  });
  test('before the reads ledger exists, stored documents this month are counted, as on upload', async () => {
    db.profiles[0].subscription_tier = 'snapshot';
    db.documents = Array.from({ length: 9 }, (_, i) => ({ id: `old-${i}`, user_id: USER, document_hash: `h${i}`, created_at: '2026-10-05T00:00:00Z', cached_result: {} }));
    const r = await call(bills(values({ invoice: 'B1' }), values({ invoice: 'B2' })));
    expect(r.body.results.map((x: Row) => x.status)).toEqual(['saved', 'failed']);
  });
});

describe('row identity', () => {
  test('the fingerprint ignores spacing, case and number formatting but not the figures', async () => {
    expect(importIdentityJson(values())).toBe(importIdentityJson(values({ supplier: ' shree  fuels ', quantity: '1250', gstin: '27aapfu0939f1zv', date: '14/09/2026' })));
    expect(await importDocumentHash(values())).not.toBe(await importDocumentHash(values({ quantity: '1251' })));
    expect(await importDocumentHash(values())).toBe(await importDocumentHash(values({ notes: 'anything' })));
  });
  test('only bill rows build a record', () => {
    expect(buildImportedRecord(values({ type: 'Steam' }), { gridCountry: 'IN', gridSource: 'bill', line: 2 })).toBeNull();
  });
});

describe('same writer and allowance as an upload (contract)', () => {
  const upload = readFileSync('supabase/functions/extract-document/index.ts', 'utf8');
  const shared = readFileSync('supabase/functions/_shared/uploadRecords.ts', 'utf8');
  const imp = readFileSync('supabase/functions/import-records/handler.ts', 'utf8');
  test('extract-document is untouched by import: it does not use the import module', () => {
    expect(upload).not.toContain('uploadRecords');
  });
  test('emission rows come from the shared buildEmissionRows on both paths, with the same insert', () => {
    for (const src of [upload, shared]) expect(src).toMatch(/import \{ buildEmissionRows \} from '\.\/?\.?\.?\/?(_shared\/)?emissionRows\.ts'/);
    const body = (src: string) => src.slice(src.indexOf('async function createEmissionRows'), src.indexOf('\n}\n', src.indexOf('async function createEmissionRows')));
    const norm = (t: string) => t.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').replace(/export /g, '').replace(/db: [^,]+,/, 'db,').trim();
    expect(norm(body(shared)).replace(/^.*?\) => \{|^.*?\): Promise<string\[\] \| null> \{/, '')).toBe(norm(body(upload)).replace(/^.*?\): Promise<string\[\] \| null> \{/, ''));
    expect(imp).not.toMatch(/from\('emissions'\)\.insert/);
  });
  test('the methodology stamp matches extract-document', async () => {
    const { METHODOLOGY_VERSION } = await import('../supabase/functions/_shared/uploadRecords');
    const block = upload.slice(upload.indexOf('const METHODOLOGY_VERSION = {'), upload.indexOf('};', upload.indexOf('const METHODOLOGY_VERSION = {')));
    expect(block).toContain("country: 'IN'");
    expect(block).toContain("confidenceVersion: 'CONF_v1.0'");
    expect(block).toContain('version: `${METHODOLOGY_VERSION_TAG}.0`');
    expect(METHODOLOGY_VERSION).toMatchObject({ name: 'BIOCOG_MVR_INDIA', version: 'v1.2.0', country: 'IN', factorVersion: 'IND_EF_2026_11', confidenceVersion: 'CONF_v1.0' });
  });
  test('reads use the same RPCs and arguments as extract-document', () => {
    for (const name of ['reserve_invoice_read', 'service_enterprise_cover_reads', 'commit_invoice_read', 'release_invoice_read']) {
      expect(upload).toContain(`'${name}'`);
      expect(shared).toContain(`'${name}'`);
    }
    for (const arg of ['p_user', 'p_org', 'p_hash', 'p_pages', 'p_plan_limit', 'p_period_start', 'p_page_counting_from', 'p_units', 'p_document_id', 'p_id']) {
      expect(upload).toContain(`${arg}:`);
      expect(shared).toContain(`${arg}:`);
    }
    expect(imp).not.toMatch(/rpc\('reserve_invoice_read'/);
  });
  test('import-records is versioned, configured and never calls the reader', () => {
    expect(readFileSync('supabase/config.toml', 'utf8')).toMatch(/\[functions\.import-records\]\s+verify_jwt = false/);
    expect(readFileSync('scripts/function-versions.mjs', 'utf8')).toContain("'import-records'");
    expect(readFileSync('supabase/functions/import-records/index.ts', 'utf8')).toContain('versionProbe(req, "import-records")');
    expect(imp).not.toMatch(/aiFetch|generativelanguage|\bfetch\(|functions\.invoke/);
  });
});
