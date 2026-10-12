import { describe, expect, test } from 'bun:test';
import { isSourceFilePath, sourceFilePath, SOURCE_LINK_SECONDS } from '../supabase/functions/_shared/sourceFiles';
import { entriesToPrune } from '../src/lib/guestSourceCache';

const U = '00000000-0000-4000-8000-0000000000a1';
const H = 'ab'.repeat(32);

describe('original invoice files', () => {
  test('filed under the user id, named by the document fingerprint', () => {
    expect(sourceFilePath(U, H, 'application/pdf')).toBe(`${U}/${H}.pdf`);
    expect(sourceFilePath(U, H, 'image/jpeg')).toBe(`${U}/${H}.jpg`);
    expect(sourceFilePath(U, H, 'text/html')).toBe(`${U}/${H}.bin`);
  });
  test('unsafe inputs never become a path', () => {
    expect(sourceFilePath('../etc', H, 'application/pdf')).toBeNull();
    expect(sourceFilePath(U, '../../x', 'application/pdf')).toBeNull();
  });
  test('links are only issued for paths this feature writes', () => {
    expect(isSourceFilePath(`${U}/${H}.pdf`)).toBe(true);
    expect(isSourceFilePath(`invoices/${U}/INV-1.html`)).toBe(false); // billing invoices in the same bucket
    expect(isSourceFilePath(`guest/${H}.pdf`)).toBe(false);
    expect(isSourceFilePath(null)).toBe(false);
  });
  test('links are short-lived', () => {
    expect(SOURCE_LINK_SECONDS).toBeLessThanOrEqual(600);
  });
  test('guest browser copies keep the newest within limits', () => {
    const e = (hash: string, size: number, savedAt: number) => ({ hash, size, savedAt });
    expect(entriesToPrune([e('a', 10, 1), e('b', 10, 2), e('c', 10, 3)], { maxFiles: 2, maxBytes: 100 })).toEqual(['a']);
    expect(entriesToPrune([e('a', 60, 1), e('b', 60, 2)], { maxFiles: 5, maxBytes: 100 })).toEqual(['a']);
  });
});
