import { describe, expect, test } from 'bun:test';
import { checkContact, checkPhone } from '../supabase/functions/_shared/contactCheck';

const ok = { name: 'Priya Sharma', email: 'priya@acmeforge.in', phone: '', message: 'We need a carbon report for our buyer.' };

describe('contact form: genuine people get through', () => {
  test('Indian mobiles in every common format', () => {
    for (const p of ['9876543219', '98765 43219', '+91 98765 43219', '+91-9876543219', '919876543219', '09876543219', '(+91) 98765-43219'])
      expect(checkPhone(p)).toEqual({ ok: true, phone: '+919876543219' });
  });
  test('landlines and foreign numbers with a country code', () => {
    expect(checkPhone('011 2345 6789')).toEqual({ ok: true, phone: '+911123456789' });
    expect(checkPhone('+44 20 7946 0958')).toEqual({ ok: true, phone: '+442079460958' });
    expect(checkPhone('+971 50 123 4567')).toEqual({ ok: true, phone: '+971501234567' });
  });
  test('phone is optional; personal mailboxes and company names are fine', () => {
    expect(checkContact(ok)).toMatchObject({ ok: true, phone: null });
    expect(checkContact({ ...ok, email: 'priya.s@gmail.com' }).ok).toBe(true);
    expect(checkContact({ ...ok, name: 'Shree Ganesh Castings' }).ok).toBe(true);
    expect(checkContact({ ...ok, name: 'राम कुमार' }).ok).toBe(true);
  });
});

describe('contact form: empty, fake and dummy details are refused', () => {
  test('empty request', () => {
    expect(checkContact({})).toMatchObject({ ok: false, field: 'name' });
  });
  test('dummy numbers', () => {
    for (const p of ['9999999999', '1234567890', '9876543210', '0000000000', '12345', 'call me', '+91 1111111111'])
      expect(checkPhone(p).ok).toBe(false);
  });
  test('placeholder, disposable and mistyped emails', () => {
    expect(checkContact({ ...ok, email: 'test@test.com' })).toMatchObject({ ok: false, field: 'email' });
    expect(checkContact({ ...ok, email: 'a@mailinator.com' })).toMatchObject({ ok: false, field: 'email' });
    expect(checkContact({ ...ok, email: 'priya@gmial.com' })).toMatchObject({ ok: false, field: 'email', error: 'Check the spelling: did you mean priya@gmail.com?' });
    expect(checkContact({ ...ok, email: 'not-an-email' })).toMatchObject({ ok: false, field: 'email' });
  });
  test('placeholder names and empty messages', () => {
    expect(checkContact({ ...ok, name: 'test' })).toMatchObject({ ok: false, field: 'name' });
    expect(checkContact({ ...ok, name: '12345' })).toMatchObject({ ok: false, field: 'name' });
    expect(checkContact({ ...ok, message: '   ' })).toMatchObject({ ok: false, field: 'message' });
  });
});
