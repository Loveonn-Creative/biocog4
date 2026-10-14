import { describe, expect, test } from 'bun:test';
import { cleanProfileFields, normaliseSize, saveProfileFields } from '../src/lib/profileSave';

describe('profile save', () => {
  test('size: only values the database holds; anything else is "not set"', () => {
    expect(normaliseSize('Small')).toBe('small');
    expect(normaliseSize('')).toBeNull();
    expect(normaliseSize('10-50 employees')).toBeNull();
    expect(normaliseSize(undefined)).toBeNull();
  });
  test('empty text becomes null; GSTIN upper-cased without spaces', () => {
    expect(cleanProfileFields({ business_name: '  ', gstin: ' 27aapfu0939f1zv ', size: '', phone: '98765' }))
      .toEqual({ business_name: null, gstin: '27AAPFU0939F1ZV', size: null, phone: '98765' });
  });
  test('the old failure: an empty size no longer reaches the database as ""', async () => {
    const sent: Record<string, unknown>[] = [];
    const r = await saveProfileFields(async (f) => { sent.push(f); return { error: f.size === '' ? { code: '23514', message: 'violates check constraint "profiles_size_check"' } : null }; }, { business_name: 'Rao Textiles', gstin: '27AAPFU0939F1ZV', size: '' });
    expect(r).toEqual({ ok: true, sizeSkipped: false });
    expect(sent[0].size).toBeNull();
  });
  test('"large" before the migration: everything else still saves, and says so', async () => {
    const sent: Record<string, unknown>[] = [];
    const r = await saveProfileFields(async (f) => { sent.push(f); return { error: f.size === 'large' ? { code: '23514', message: 'new row for relation "profiles" violates check constraint "profiles_size_check"' } : null }; }, { business_name: 'Big Co', size: 'large' });
    expect(r).toEqual({ ok: true, sizeSkipped: true });
    expect(sent[1]).toEqual({ business_name: 'Big Co' });
  });
  test('any other error is reported, not retried', async () => {
    let calls = 0;
    const r = await saveProfileFields(async () => { calls++; return { error: { code: '42501', message: 'permission denied' } }; }, { gstin: 'X' });
    expect(r.ok).toBe(false);
    expect(calls).toBe(1);
  });
});
