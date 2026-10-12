import { describe, expect, test } from 'bun:test';
import { checkedSourcePage, isTruncatedFinish, offsetSourcePages, UNKNOWN_PAGE_COUNT_MESSAGE } from '../supabase/functions/_shared/extractionChecks';
import { checkUploadPages } from '../src/lib/pdfLimit';

describe('OCR completeness checks', () => {
  test('a cut-off answer is detected', () => {
    expect(isTruncatedFinish('length')).toBe(true);
    expect(isTruncatedFinish('MAX_TOKENS')).toBe(true);
    expect(isTruncatedFinish('stop')).toBe(false);
    expect(isTruncatedFinish(undefined)).toBe(false);
  });

  test('page references must fall inside the document', () => {
    expect(checkedSourcePage(3, 5)).toBe(3);
    expect(checkedSourcePage('2', 5)).toBe(2);
    expect(checkedSourcePage(6, 5)).toBeNull(); // beyond the last page
    expect(checkedSourcePage(0, 5)).toBeNull();
    expect(checkedSourcePage(1.5, 5)).toBeNull();
    expect(checkedSourcePage(undefined, 5)).toBeNull(); // not silently page 1
    expect(checkedSourcePage(1, null)).toBe(1); // an image has one page
    expect(checkedSourcePage(2, null)).toBeNull();
  });

  test('split parts map back to the original page numbers', () => {
    const items = [{ description: 'a', sourcePage: 1 }, { description: 'b', sourcePage: 4 }, { description: 'c' }];
    expect(offsetSourcePages(items, 11).map((i) => (i as { sourcePage?: number }).sourcePage)).toEqual([11, 14, undefined]);
    expect(offsetSourcePages(items, 1)).toEqual(items);
  });

  test('a PDF whose pages cannot be counted is refused before upload', async () => {
    const file = new File([new TextEncoder().encode('%PDF-1.4\n%%EOF\n')], 'odd.pdf', { type: 'application/pdf' });
    const r = await checkUploadPages(file);
    expect(r).toEqual({ ok: false, reason: 'unknown_page_count', message: UNKNOWN_PAGE_COUNT_MESSAGE });
  });

  test('images are not page-checked', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'bill.jpg', { type: 'image/jpeg' });
    expect((await checkUploadPages(file)).ok).toBe(true);
  });
});
