/* eslint-disable @typescript-eslint/no-explicit-any -- a minimal in-memory stand-in for the Supabase client */
import { describe, expect, test } from 'bun:test';
import {
  consentRecord, generateStory, optionsFor, PAINS, storyJson, storySlug, storyStrength, validateStory, type StoryAnswers,
} from '../supabase/functions/_shared/caseStudy';
import { sha256Hex } from '../supabase/functions/_shared/resourceLink';
import { createHandler as submitHandler } from '../supabase/functions/story-submit/handler';
import { createHandler as reviewHandler, editForPublication } from '../supabase/functions/story-review/handler';

const base = {
  buyer: 'msme', industry: 'textiles', region: 'Tiruppur', pains: ['buyer_asked', 'scattered'],
  moment: 'Our buyer in Germany gave us two weeks.', frictions: ['upload_bills', 'auto_read'], visibility: ['scope_split'],
  evidence: ['document_trail', 'buyer_pack'], opportunities: ['buyer_reply'], metrics: [{ id: 'days_to_reply', value: 4, basis: 'reported' }],
  quote: 'We replied in four days.', attribution: 'anonymous', name: '', role: '', company: '',
};

describe('answers and story', () => {
  test('unknown or off-audience choices are dropped, free text loses links and contact details', () => {
    const r = validateStory({ ...base, pains: ['buyer_asked', 'unverifiable', 'made_up'], quote: 'Call 98765 43210 or mail me@x.in, see www.x.com' });
    expect(r.ok).toBe(true);
    expect(r.value!.pains).toEqual(['buyer_asked']); // 'unverifiable' is a lender pain
    expect(r.value!.quote).not.toMatch(/98765|@|www/);
  });
  test('a customer cannot mark their own number as calculated, and a verified claim needs a verifier', () => {
    const r = validateStory({ ...base, metrics: [{ id: 'tco2e', value: 300, basis: 'calculated' }] });
    expect(r.value!.metrics).toEqual([]);
    expect(validateStory({ ...base, metrics: [{ id: 'tco2e', value: 300, basis: 'independent' }] }).ok).toBe(false);
  });
  test('naming needs a name and company; anonymous needs neither', () => {
    expect(validateStory({ ...base, attribution: 'named', company: 'Acme' }).errors?.name).toBeTruthy();
    expect(validateStory({ ...base, attribution: 'company' }).errors?.company).toBeTruthy();
    expect(validateStory(base).ok).toBe(true);
  });
  test('the same answers always give the same story, built only from them', () => {
    const a = validateStory(base).value as StoryAnswers;
    const s1 = generateStory(a);
    expect(storyJson(generateStory(a))).toBe(storyJson(s1));
    expect(s1.byline).toBe('A textiles and apparel manufacturer in Tiruppur');
    expect(s1.chapters[0].text).toBe('Before Senseible, a buyer asked for carbon data and there was nothing to send. Bills and invoices sat scattered across files and inboxes.');
    expect(s1.numbers).toEqual([{ label: 'Days to answer a buyer or bank', value: '4', unit: 'days', basis: 'reported', basisLabel: 'Reported by the customer' }]);
    expect(s1.disclaimer).toContain('does not promise similar results, a loan');
  });
  test('account figures are labelled as calculated by Senseible, with the rule-check caveat', () => {
    const s = generateStory(validateStory(base).value!, { documents: 46, verifiedKg: 81234, scope1Kg: 0, scope2Kg: 81234, scope3Kg: 0 });
    expect(s.numbers.find((n) => n.unit === 't CO₂')).toMatchObject({ value: '81.2', basis: 'calculated' });
    expect(s.numbers.find((n) => n.unit === 't CO₂')!.basisLabel).toContain('not third-party assurance');
  });
  test('questions adapt to who is answering', () => {
    expect(optionsFor(PAINS, 'lender').map((p) => p.id)).toContain('unverifiable');
    expect(optionsFor(PAINS, 'lender').map((p) => p.id)).not.toContain('consultant_cost');
  });
  test('slug and strength', () => {
    const s = generateStory(validateStory(base).value!);
    expect(storySlug(s, 'A1B2C3D4-0000')).toMatch(/^[a-z0-9]+(-[a-z0-9]+)+-a1b2c3$/);
    expect(storyStrength({})).toBe(0);
    expect(storyStrength(validateStory(base).value!)).toBe(100);
  });
  test('the consent record names the attribution and the company', () => {
    const c = consentRecord({ publish: true, attribution: 'company', company: 'Acme Forgings', account: true });
    expect(c).toContain('as company only');
    expect(c).toContain('for Acme Forgings');
    expect(c).toContain('account:');
  });
});

// In-memory stand-in for the PostgREST calls the handlers make.
function fakeDb(o: { users?: Record<string, any>; admins?: string[] } = {}) {
  const tables: Record<string, any[]> = { story_submissions: [], emissions: [], documents: [], profiles: [], user_roles: (o.admins ?? []).map((u) => ({ user_id: u, role: 'admin' })) };
  const from = (t: string) => {
    const f: ((r: any) => boolean)[] = [];
    let mode = 'select'; let payload: any; let head = false;
    const run = () => {
      const rows = tables[t]; const hit = rows.filter((r) => f.every((x) => x(r)));
      if (mode === 'insert') { const row = { id: `00000000-0000-4000-8000-${String(rows.length + 1).padStart(12, '0')}`, created_at: new Date().toISOString(), ...payload }; rows.push(row); return { data: row, error: null }; }
      if (mode === 'update') { hit.forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
      return head ? { data: null, error: null, count: hit.length } : { data: hit, error: null };
    };
    const q: any = {
      select: (_c?: string, opt?: any) => { if (opt?.head) head = true; return q; },
      insert: (p: any) => { mode = 'insert'; payload = p; return q; },
      update: (p: any) => { mode = 'update'; payload = p; return q; },
      eq: (k: string, v: any) => { f.push((r) => r[k] === v); return q; },
      gte: (k: string, v: any) => { f.push((r) => r[k] >= v); return q; },
      lt: (k: string, v: any) => { f.push((r) => r[k] != null && r[k] < v); return q; },
      not: (k: string, _op: string, _v: any) => { f.push((r) => r[k] != null); return q; },
      order: () => q, limit: () => q,
      maybeSingle: async () => { const r = run(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      single: async () => { const r = run(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      then: (a: any, b: any) => Promise.resolve(run()).then(a, b),
    };
    return q;
  };
  const auth = { getUser: async (jwt: string) => (o.users?.[jwt] ? { data: { user: o.users[jwt] }, error: null } : { data: { user: null }, error: { message: 'no' } }) };
  return { tables, db: { from, auth } };
}

function setup(o: { users?: Record<string, any>; admins?: string[] } = {}) {
  const { tables, db } = fakeDb(o);
  const sent: any[] = [];
  const sendTemplate = async (name: string, to: string, opts: any) => { sent.push({ name, to, data: opts.templateData }); return { sent: true }; };
  const submit = submitHandler({ db, sendTemplate, linkSecret: 's', ipSalt: 'salt', siteUrl: 'https://senseible.earth' });
  const review = reviewHandler({ db, sendTemplate, linkSecret: 's', siteUrl: 'https://senseible.earth' });
  const post = (h: any, body: any, auth?: string) => h(new Request('https://fn', { method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body) }));
  return { tables, sent, submit: (b: any, a?: string) => post(submit, b, a), review: (b: any, a?: string) => post(review, b, a) };
}
const hashFor = async (answers: any, figures?: any) => sha256Hex(storyJson(generateStory(validateStory(answers).value!, figures)));

describe('story-submit', () => {
  test('stores the exact story previewed, with consent, and notifies the team and the person', async () => {
    const s = setup();
    const res = await s.submit({ action: 'submit', answers: base, publish: true, email: 'owner@acmeforge.in', storyHash: await hashFor(base) });
    expect(res.status).toBe(200);
    const row = s.tables.story_submissions[0];
    expect(row).toMatchObject({ status: 'submitted', publish_consent: true, consent_version: 'story-2026-10', contact_email: 'owner@acmeforge.in', attribution: 'anonymous' });
    expect(row.story_hash).toBe(await hashFor(base));
    expect(row.consent_text_hash).toBe(await sha256Hex(consentRecord({ publish: true, attribution: 'anonymous', company: '', account: false })));
    expect(s.sent.map((m) => m.name)).toEqual(['story-received', 'story-confirmation']);
    expect(s.sent[1].data.withdrawUrl).toContain('/case-studies/withdraw?t=');
  });
  test('a story that differs from the preview is refused', async () => {
    const s = setup();
    const res = await s.submit({ action: 'submit', answers: base, publish: true, email: 'owner@acmeforge.in', storyHash: 'x' });
    expect(res.status).toBe(409);
    expect(s.tables.story_submissions).toHaveLength(0);
  });
  test('publishing needs a real email; private feedback does not', async () => {
    const s = setup();
    expect((await s.submit({ action: 'submit', answers: base, publish: true, email: 'a@mailinator.com', storyHash: await hashFor(base) })).status).toBe(400);
    const ok = await s.submit({ action: 'submit', answers: base, privateOnly: true, storyHash: await hashFor(base) });
    expect(ok.status).toBe(200);
    expect(s.tables.story_submissions[0]).toMatchObject({ status: 'private', publish_consent: false });
    expect(s.sent.map((m) => m.name)).toEqual(['story-received']);
  });
  test('signed-in prefill and account figures come from the server, never the browser', async () => {
    const user = { id: 'u1', email: 'Owner@AcmeForge.in', user_metadata: { full_name: 'Asha Rao' } };
    const s = setup({ users: { jwt: user } });
    s.tables.profiles.push({ id: 'u1', business_name: 'Acme Forgings', sector: 'textiles', location: 'Tiruppur' });
    s.tables.emissions.push({ user_id: 'u1', scope: 2, co2_kg: 1000, verified: true }, { user_id: 'u1', scope: 1, co2_kg: 500, verified: false }, { user_id: 'u2', scope: 1, co2_kg: 9, verified: true });
    s.tables.documents.push({ id: 'd1', user_id: 'u1' }, { id: 'd2', user_id: 'u1' });
    const pre = await (await s.submit({ action: 'prefill' }, 'jwt')).json();
    expect(pre).toMatchObject({ name: 'Asha Rao', company: 'Acme Forgings', figures: { documents: 2, verifiedKg: 1000, scope2Kg: 1000 } });
    const res = await s.submit({ action: 'submit', answers: base, publish: true, includeAccount: true, storyHash: await hashFor(base, pre.figures) }, 'jwt');
    expect(res.status).toBe(200);
    expect(s.tables.story_submissions[0]).toMatchObject({ user_id: 'u1', contact_email: 'owner@acmeforge.in', account_figures: { verifiedKg: 1000 } });
    expect((await s.submit({ action: 'prefill' })).status).toBe(401);
  });
  test('the emailed link withdraws the story, once', async () => {
    const s = setup();
    await s.submit({ action: 'submit', answers: base, publish: true, email: 'owner@acmeforge.in', storyHash: await hashFor(base) });
    const t = new URL(s.sent[1].data.withdrawUrl).searchParams.get('t');
    expect((await s.submit({ action: 'withdraw', token: t })).status).toBe(200);
    expect(s.tables.story_submissions[0]).toMatchObject({ status: 'withdrawn' });
    expect(s.tables.story_submissions[0].erase_after).toBeTruthy();
    expect(await (await s.submit({ action: 'withdraw', token: t })).json()).toEqual({ success: true, already: true });
    expect((await s.submit({ action: 'withdraw', token: 'bad.token' })).status).toBe(410);
  });
});

describe('story-review', () => {
  test('only admins, checked on the server', async () => {
    const s = setup({ users: { u: { id: 'u' }, a: { id: 'a' } }, admins: ['a'] });
    expect((await s.review({ action: 'list' })).status).toBe(403);
    expect((await s.review({ action: 'list' }, 'u')).status).toBe(403);
    expect((await s.review({ action: 'list' }, 'a')).status).toBe(200);
  });
  test('approving publishes with a slug, applies only removals, and emails the customer', async () => {
    const s = setup({ users: { a: { id: 'a' } }, admins: ['a'] });
    const answers = { ...base, metrics: [{ id: 'days_to_reply', value: 4, basis: 'reported' }, { id: 'tco2e', value: 312, basis: 'independent', verifier: 'Bureau Veritas' }] };
    await s.submit({ action: 'submit', answers, publish: true, email: 'owner@acmeforge.in', storyHash: await hashFor(answers) });
    const id = s.tables.story_submissions[0].id;
    const res = await s.review({ action: 'approve', id, removals: ['quote'] }, 'a');
    expect(res.status).toBe(200);
    const row = s.tables.story_submissions[0];
    expect(row.status).toBe('published');
    expect(row.slug).toMatch(/-[a-z0-9]{6}$/);
    expect(row.story.quote).toBe('');
    expect(row.story.numbers[1].basis).toBe('reported'); // third-party claim not confirmed by the reviewer
    expect(row.review_removals).toEqual(['quote', 'unconfirmed:1']);
    expect(s.sent.at(-1)).toMatchObject({ name: 'story-published', to: 'owner@acmeforge.in' });
  });
  test('private feedback can never be published', async () => {
    const s = setup({ users: { a: { id: 'a' } }, admins: ['a'] });
    await s.submit({ action: 'submit', answers: base, privateOnly: true, storyHash: await hashFor(base) });
    expect((await s.review({ action: 'approve', id: s.tables.story_submissions[0].id }, 'a')).status).toBe(409);
  });
  test('editing for publication can remove but never add', () => {
    const story = generateStory(validateStory(base).value!);
    const { story: out } = editForPublication(story, ['moment', 'number:0', 'rewrite-everything'], []);
    expect(out.moment).toBe('');
    expect(out.numbers).toEqual([]);
    expect(out.chapters).toEqual(story.chapters);
    expect(out.hook).toBe(story.hook);
  });
});
