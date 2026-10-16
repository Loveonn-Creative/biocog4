/* eslint-disable @typescript-eslint/no-explicit-any -- a minimal in-memory stand-in for the Supabase client */
import { describe, expect, test } from 'bun:test';
import { createHandler, type Deps } from '../supabase/functions/esg-report-access/handler';
import { MAX_DOWNLOADS_PER_LINK } from '../supabase/functions/_shared/resourceLead';

// The real PDF lives only in private storage (the repository is public); a stand-in is enough here.
const PDF = new Uint8Array([...new TextEncoder().encode('%PDF-1.4\n'), ...new Uint8Array(4096).fill(32)]);
const REPORT_PDF_BYTES = PDF.length;

// Minimal in-memory stand-in for the PostgREST calls the handler makes.
type Row = Record<string, any>;
function fakeDb(opts: { missing?: boolean; users?: Record<string, any> } = {}) {
  const rows: Row[] = [];
  const missingErr = { code: 'PGRST205', message: 'missing' };
  const from = (table: string) => {
    if (table !== 'resource_leads') throw new Error(`unexpected table ${table}`);
    const filters: ((r: Row) => boolean)[] = [];
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Row | null = null;
    let countHead = false;
    const run = () => {
      if (opts.missing) return { data: null, error: missingErr, count: null };
      const hit = rows.filter((r) => filters.every((f) => f(r)));
      if (mode === 'insert') {
        if (rows.some((r) => r.resource === payload!.resource && r.email === payload!.email)) return { data: null, error: { code: '23505' } };
        const row = { id: `lead-${rows.length + 1}`, downloads: 0, send_count: 0, sends_on_day: 0, ...payload };
        rows.push(row);
        return { data: row, error: null };
      }
      if (mode === 'update') { hit.forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
      if (mode === 'delete') { hit.forEach((r) => rows.splice(rows.indexOf(r), 1)); return { data: null, error: null }; }
      return countHead ? { data: null, error: null, count: hit.length } : { data: hit, error: null };
    };
    const q: any = {
      select: (_c?: string, o?: { count?: string; head?: boolean }) => { if (o?.head) countHead = true; return q; },
      insert: (p: Row) => { mode = 'insert'; payload = p; return q; },
      update: (p: Row) => { mode = 'update'; payload = p; return q; },
      delete: () => { mode = 'delete'; return q; },
      eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return q; },
      gte: (k: string, v: string) => { filters.push((r) => r[k] >= v); return q; },
      lt: (k: string, v: string) => { filters.push((r) => r[k] < v); return q; },
      maybeSingle: async () => { const r = run(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      single: async () => { const r = run(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
    };
    return q;
  };
  const auth = { getUser: async (jwt: string) => (opts.users?.[jwt] ? { data: { user: opts.users[jwt] }, error: null } : { data: { user: null }, error: { message: 'bad jwt' } }) };
  return { rows, db: { from, auth } };
}

const MX_OK = { Status: 0, Answer: [{ type: 15, data: '10 mx.acmeforge.in.' }] };
function setup(over: Partial<Deps> & { missing?: boolean; users?: Record<string, any>; mx?: any; noFile?: boolean } = {}) {
  const { rows, db } = fakeDb({ missing: over.missing, users: over.users });
  const sent: { name: string; to: string; data: Record<string, any> }[] = [];
  let clock = Date.parse('2026-10-16T10:00:00Z');
  const handler = createHandler({
    db,
    sendTemplate: async (name, to, o) => { sent.push({ name, to, data: o.templateData }); return { sent: true }; },
    dnsJson: async () => over.mx === undefined ? MX_OK : over.mx,
    linkSecret: 'test-secret',
    ipSalt: 'salt',
    siteUrl: 'https://senseible.earth',
    loadPdf: async () => (over.noFile ? null : PDF),
    now: () => clock,
    ...over,
  });
  const call = (body: unknown, headers: Record<string, string> = {}) =>
    handler(new Request('https://fn/esg-report-access', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9', ...headers }, body: JSON.stringify(body) }));
  return { rows, sent, call, tick: (ms: number) => { clock += ms; } };
}
const form = { action: 'request', name: 'Asha Rao', email: 'asha@acmeforge.in', company: 'Acme Forgings', industry: 'metals', role: 'founder', need: 'buyer_request', elapsedMs: 8000 };
const tokenFrom = (link: string) => new URL(link).searchParams.get('access')!;

describe('report file not uploaded yet', () => {
  test('the visitor is told honestly, no dead link is emailed, the team is asked to follow up', async () => {
    const s = setup({ noFile: true });
    const res = await s.call(form);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('within one working day');
    expect(s.sent.map((m) => m.name)).toEqual(['resource-lead']);
    expect(s.sent[0].data.mailbox).toContain('REPORT FILE NOT UPLOADED');
    expect(s.rows[0]).toMatchObject({ email: 'asha@acmeforge.in', notify_status: 'sent' });
  });
  test('downloads wait for the file without counting a download', async () => {
    const s = setup();
    await s.call(form);
    const link = s.sent[0].data.link;
    const t = setup({ noFile: true });
    t.rows.push({ ...s.rows[0] });
    expect((await t.call({ action: 'download', token: tokenFrom(link) })).status).toBe(503);
    expect(t.rows[0].downloads).toBe(0);
  });
});

describe('form request', () => {
  test('stores the lead, emails a private link to the visitor and notifies the team once', async () => {
    const s = setup();
    const res = await s.call({ ...form, marketing: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, sent: true, email: 'a***@acmeforge.in' });
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0]).toMatchObject({ email: 'asha@acmeforge.in', company: 'Acme Forgings', source: 'form', marketing_consent: true, mx_status: 'ok', delivery_status: 'sent', notify_status: 'sent', notice_version: 'resource-lead-2026-10-16b' });
    expect(s.rows[0].request_ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(s.rows[0])).not.toContain('203.0.113.9');
    const [delivery, notice] = s.sent;
    expect(delivery).toMatchObject({ name: 'resource-delivery', to: 'asha@acmeforge.in' });
    expect(delivery.data.link).toStartWith('https://senseible.earth/esg-report-sample?access=');
    expect(notice.name).toBe('resource-lead');
    expect(notice.data).toMatchObject({ name: 'Asha Rao', email: 'asha@acmeforge.in', company: 'Acme Forgings', industry: 'Steel, aluminium and metals', role: 'Founder, owner or CXO', need: 'A buyer asked for ESG or carbon data', marketing: true, stored: true });
  });

  test('the page never receives the report or the link, only a masked confirmation', async () => {
    const s = setup();
    const body = await (await s.call(form)).text();
    expect(body).not.toContain('access=');
    expect(body).not.toContain('%PDF');
  });

  test('a disposable address or a domain with no mail server never gets a link', async () => {
    const a = setup();
    const r1 = await a.call({ ...form, email: 'asha@mailinator.com' });
    expect(r1.status).toBe(400);
    expect((await r1.json()).fields.email).toContain('Temporary inboxes');
    const b = setup({ mx: { Status: 3 } });
    const r2 = await b.call({ ...form, email: 'asha@acme-forgings-nowhere.in' });
    expect(r2.status).toBe(400);
    expect((await r2.json()).fields.email).toContain('cannot receive mail');
    const c = setup({ mx: { Status: 0, Answer: [{ type: 15, data: '10 mx.yopmail.com.' }] } });
    expect((await c.call({ ...form, email: 'asha@newdomain.in' })).status).toBe(400);
    expect([...a.sent, ...b.sent, ...c.sent]).toHaveLength(0);
    expect([...a.rows, ...b.rows, ...c.rows]).toHaveLength(0);
  });

  test('a repeat within a minute sends nothing new; three sends a day is the limit', async () => {
    const s = setup();
    await s.call(form);
    expect((await (await s.call(form)).json()).repeat).toBe(true);
    expect(s.sent.filter((m) => m.name === 'resource-delivery')).toHaveLength(1);
    s.tick(61_000); expect((await s.call(form)).status).toBe(200);
    s.tick(61_000); expect((await s.call(form)).status).toBe(200);
    s.tick(61_000); expect((await s.call(form)).status).toBe(429);
    expect(s.sent.filter((m) => m.name === 'resource-delivery')).toHaveLength(3);
    expect(s.sent.filter((m) => m.name === 'resource-lead')).toHaveLength(1);
  });

  test('one network is limited to five requests an hour', async () => {
    const s = setup();
    for (let i = 0; i < 5; i++) expect((await s.call({ ...form, email: `p${i}@acmeforge.in` })).status).toBe(200);
    expect((await s.call({ ...form, email: 'p6@acmeforge.in' })).status).toBe(429);
  });

  test('an email that cannot be sent is reported, never faked as sent', async () => {
    const s = setup({ sendTemplate: async (name) => { if (name === 'resource-delivery') throw new Error('down'); return { sent: true }; } });
    const res = await s.call(form);
    expect(res.status).toBe(502);
    expect(s.rows[0].delivery_status).toBe('failed');
  });

  test('visitor leads expire within the Privacy Policy period and expired leads are purged', async () => {
    const s = setup();
    await s.call(form);
    const days = (Date.parse(s.rows[0].expires_at) - Date.parse('2026-10-16T10:00:00Z')) / 86_400_000;
    expect(days).toBe(90);
    s.tick(91 * 86_400_000);
    await s.call({ ...form, email: 'other@acmeforge.in' });
    expect(s.rows.map((r) => r.email)).toEqual(['other@acmeforge.in']);
  });

  test('before the table migration is applied, the link is still emailed and the team still notified', async () => {
    const s = setup({ missing: true });
    const res = await s.call(form);
    expect(res.status).toBe(200);
    expect(s.sent.map((m) => m.name)).toEqual(['resource-delivery', 'resource-lead']);
    expect(s.sent[1].data.stored).toBe(false);
  });
});

describe('download with the emailed link', () => {
  test('returns the PDF, counts the download and marks the mailbox verified', async () => {
    const s = setup();
    await s.call(form);
    const res = await s.call({ action: 'download', token: tokenFrom(s.sent[0].data.link) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.get('content-disposition')).toContain('Senseible-Sample-ESG-Report-2026.pdf');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.length).toBe(REPORT_PDF_BYTES);
    expect(s.rows[0].downloads).toBe(1);
    expect(s.rows[0].verified_at).toBeTruthy();
  });

  test('no link, a forged link or an expired link gets nothing', async () => {
    const s = setup();
    await s.call(form);
    const token = tokenFrom(s.sent[0].data.link);
    expect((await s.call({ action: 'download' })).status).toBe(410);
    expect((await s.call({ action: 'download', token: token.slice(0, -2) + 'xx' })).status).toBe(410);
    s.tick(8 * 86_400_000);
    const expired = await s.call({ action: 'download', token });
    expect(expired.status).toBe(410);
    expect(await expired.json()).toEqual({ error: 'expired' });
  });

  test('a link passed around widely stops after its download limit', async () => {
    const s = setup();
    await s.call(form);
    const token = tokenFrom(s.sent[0].data.link);
    for (let i = 0; i < MAX_DOWNLOADS_PER_LINK; i++) expect((await s.call({ action: 'download', token })).status).toBe(200);
    expect((await s.call({ action: 'download', token })).status).toBe(429);
  });
});

describe('signed-in download', () => {
  const user = { id: 'u1', email: 'Member@AcmeForge.in', email_confirmed_at: '2026-09-01T00:00:00Z', user_metadata: { business_name: 'Acme Forgings' } };
  test('a confirmed account downloads directly and is recorded once', async () => {
    const s = setup({ users: { jwt1: user } });
    const res = await s.call({ action: 'account' }, { authorization: 'Bearer jwt1' });
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer()).length).toBe(REPORT_PDF_BYTES);
    expect(s.rows[0]).toMatchObject({ email: 'member@acmeforge.in', source: 'account', user_id: 'u1', downloads: 1, delivery_status: 'direct' });
    await s.call({ action: 'account' }, { authorization: 'Bearer jwt1' });
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].downloads).toBe(2);
    expect(s.sent.filter((m) => m.name === 'resource-lead')).toHaveLength(1);
  });
  test('no session, a bad session or an unconfirmed email gets nothing', async () => {
    const s = setup({ users: { jwt2: { ...user, email_confirmed_at: null } } });
    expect((await s.call({ action: 'account' })).status).toBe(401);
    expect((await s.call({ action: 'account' }, { authorization: 'Bearer anon-key' })).status).toBe(401);
    expect((await s.call({ action: 'account' }, { authorization: 'Bearer jwt2' })).status).toBe(403);
    expect(s.rows).toHaveLength(0);
  });
});

test('only POST is served', async () => {
  const s = setup();
  const h = createHandler({ db: {}, sendTemplate: async () => ({ sent: true }), dnsJson: async () => null, linkSecret: 'x', ipSalt: 'y', siteUrl: '', loadPdf: async () => null });
  expect((await h(new Request('https://fn', { method: 'GET' }))).status).toBe(405);
  expect((await s.call({ action: 'nope' })).status).toBe(400);
});
