import { describe, expect, test } from 'bun:test';
import { checkEmail, maskEmail, mxVerdict, validateLead, isDisposableDomain } from '../supabase/functions/_shared/resourceLead';
import { sha256Hex, signLink, verifyLink } from '../supabase/functions/_shared/resourceLink';

const good = { name: 'Asha Rao', email: 'asha@acmeforge.in', company: 'Acme Forgings', industry: 'metals', role: 'founder', need: 'buyer_request', elapsedMs: 9000 };

describe('email checks', () => {
  test('accepts work and personal mailboxes, flags personal ones', () => {
    expect(checkEmail('Asha@AcmeForge.in')).toEqual({ ok: true, email: 'asha@acmeforge.in', domain: 'acmeforge.in', freeMailbox: false });
    expect(checkEmail('owner.tiruppur@gmail.com')).toMatchObject({ ok: true, freeMailbox: true });
  });
  test('rejects temporary inboxes, by list, subdomain and name pattern', () => {
    for (const e of ['a@mailinator.com', 'a@yopmail.com', 'a@10minutemail.com', 'a@guerrillamail.com', 'a@x.mailinator.com', 'a@my-tempmail-box.net', 'a@sharklasers.com'])
      expect(checkEmail(e)).toMatchObject({ ok: false, reason: 'disposable' });
  });
  test('rejects placeholders and malformed addresses', () => {
    for (const e of ['test@acme.in', 'asdf@acme.in', 'a@example.com', 'a@acme.test', 'noreply@acme.in']) expect(checkEmail(e)).toMatchObject({ ok: false, reason: 'placeholder' });
    for (const e of ['asha', 'asha@', '@acme.in', 'asha@acme', 'as..ha@acme.in', 'asha@acme..in', `${'a'.repeat(65)}@acme.in`]) expect(checkEmail(e)).toMatchObject({ ok: false, reason: 'syntax' });
  });
  test('suggests the fix for common provider typos', () => {
    expect(checkEmail('asha@gmial.com')).toEqual({ ok: false, reason: 'typo', suggestion: 'asha@gmail.com' });
  });
  test('does not flag ordinary company domains as disposable', () => {
    for (const d of ['tatasteel.com', 'senseible.earth', 'mail.acme.in', 'temple-trust.org']) expect(isDisposableDomain(d)).toBe(false);
  });
});

describe('mail server check', () => {
  test('a domain that does not exist or takes no mail is refused', () => {
    expect(mxVerdict({ Status: 3 }, null)).toBe('no_domain');
    expect(mxVerdict({ Status: 0, Answer: [{ type: 15, data: '0 .' }] }, null)).toBe('no_mail');
    expect(mxVerdict({ Status: 0, Answer: [] }, { Status: 0, Answer: [] })).toBe('no_mail');
  });
  test('MX, or an address record when there is no MX, is accepted', () => {
    expect(mxVerdict({ Status: 0, Answer: [{ type: 15, data: '10 aspmx.l.google.com.' }] }, null)).toBe('ok');
    expect(mxVerdict({ Status: 0, Answer: [] }, { Status: 0, Answer: [{ type: 1, data: '203.0.113.7' }] })).toBe('ok');
  });
  test('mail handled by a temporary-inbox service is refused', () => {
    expect(mxVerdict({ Status: 0, Answer: [{ type: 15, data: '10 mail.mailinator.com.' }] }, null)).toBe('disposable');
  });
  test('a failed lookup lets the request through (the emailed link still proves the mailbox)', () => {
    expect(mxVerdict(null, null)).toBe('unknown');
    expect(mxVerdict({ Status: 2 }, null)).toBe('unknown');
  });
});

describe('form validation', () => {
  test('a complete form passes with cleaned values', () => {
    const r = validateLead({ ...good, name: '  Asha   Rao ', marketing: true });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ name: 'Asha Rao', email: 'asha@acmeforge.in', company: 'Acme Forgings', industry: 'metals', role: 'founder', need: 'buyer_request', marketing: true });
  });
  test('marketing consent is never assumed', () => {
    expect(validateLead(good).value?.marketing).toBe(false);
    expect(validateLead({ ...good, marketing: 'yes' }).value?.marketing).toBe(false);
  });
  test('each missing or unknown answer gets its own message', () => {
    const r = validateLead({ email: 'x', industry: 'space', role: '', need: 'everything', elapsedMs: 9000 });
    expect(Object.keys(r.errors ?? {}).sort()).toEqual(['company', 'email', 'industry', 'name', 'need', 'role']);
  });
  test('bots are refused without a reason: honeypot or instant submit', () => {
    expect(validateLead({ ...good, website: 'http://spam' }).errors).toEqual({ form: 'Something went wrong. Please try again.' });
    expect(validateLead({ ...good, elapsedMs: 400 }).errors).toEqual({ form: 'Something went wrong. Please try again.' });
  });
  test('masked address for the confirmation screen', () => {
    expect(maskEmail('asha@acmeforge.in')).toBe('a***@acmeforge.in');
  });
});

describe('private download links', () => {
  test('a signed link verifies until it expires and cannot be altered', async () => {
    const h = await sha256Hex('asha@acmeforge.in');
    const token = await signLink({ r: 'esg-report-sample-2026', h, x: 2_000_000_000 }, 'secret');
    expect(await verifyLink(token, 'secret', 1_900_000_000_000)).toEqual({ ok: true, claims: { r: 'esg-report-sample-2026', h, x: 2_000_000_000 } });
    expect(await verifyLink(token, 'secret', 2_000_000_001_000)).toEqual({ ok: false, reason: 'expired' });
    expect(await verifyLink(token, 'other-secret', 1_900_000_000_000)).toEqual({ ok: false, reason: 'invalid' });
    const [body, sig] = token.split('.');
    const forged = btoa(JSON.stringify({ r: 'esg-report-sample-2026', h, x: 9_999_999_999 })).replace(/=+$/, '');
    expect((await verifyLink(`${forged}.${sig}`, 'secret', 1_900_000_000_000)).ok).toBe(false);
    expect((await verifyLink(`${body}.x${sig.slice(1)}`, 'secret', 1_900_000_000_000)).ok).toBe(false);
  });
  test('the link carries a hash, never the email address', async () => {
    const token = await signLink({ r: 'r1', h: await sha256Hex('asha@acmeforge.in'), x: 2_000_000_000 }, 'secret');
    expect(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).not.toContain('asha');
  });
});
