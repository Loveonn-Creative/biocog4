import { describe, expect, test } from 'bun:test';
import { countPdfPages, isPdf, MAX_PDF_PAGES } from '../supabase/functions/_shared/pdfPages';

const enc = (s: string) => new TextEncoder().encode(s);
const pdf = (pages: number, withCount = true) => enc(
  '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n' +
  `2 0 obj << /Type /Pages ${withCount ? `/Count ${pages}` : ''} /Kids [] >> endobj\n` +
  Array.from({ length: pages }, (_, i) => `${i + 3} 0 obj << /Type /Page /Parent 2 0 R >> endobj\n`).join('') + '%%EOF');

describe('countPdfPages', () => {
  test('counts page objects and ignores the /Pages tree node', () => {
    expect(countPdfPages(pdf(3))).toBe(3);
    expect(countPdfPages(pdf(12, false))).toBe(12);
  });
  test('uses /Count when page objects are compressed away', () => {
    expect(countPdfPages(enc('%PDF-1.7\n<< /Type /Pages /Count 40 /Kids [] >>\n%%EOF'))).toBe(40);
  });
  test('detects PDFs by signature', () => {
    expect(isPdf(pdf(1))).toBe(true);
    expect(isPdf(enc('\x89PNG....'))).toBe(false);
  });
  test('a header after a few leading bytes is still a PDF, so it is page-counted', () => {
    const junk = new Uint8Array([10, 10, 32, 32, ...pdf(12)]);
    expect(isPdf(junk)).toBe(true);
    expect(countPdfPages(junk)).toBe(12);
    expect(isPdf(enc(' '.repeat(1100) + '%PDF-1.4'))).toBe(false);
  });
  test('limit is 10 pages', () => { expect(MAX_PDF_PAGES).toBe(10); });
});
