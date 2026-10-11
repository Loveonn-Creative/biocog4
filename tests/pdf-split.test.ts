import { describe, expect, test } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import { pageRanges, splitPdf } from '../src/lib/pdfSplit';
import { countPdfPages, MAX_PDF_PAGES } from '../supabase/functions/_shared/pdfPages';

async function makePdf(pages: number): Promise<File> {
  const d = await PDFDocument.create();
  for (let i = 0; i < pages; i++) d.addPage([200, 200]).drawText(`page ${i + 1}`, { x: 20, y: 100, size: 12 });
  return new File([await d.save()], 'statement.pdf', { type: 'application/pdf' });
}

describe('PDF splitting', () => {
  test('page ranges cover every page once, max 10 each', () => {
    expect(pageRanges(23)).toEqual([[1, 10], [11, 20], [21, 23]]);
    expect(pageRanges(10)).toEqual([[1, 10]]);
  });
  test('a 23-page PDF becomes 3 valid parts under the server limit, all pages kept in order', async () => {
    const r = await splitPdf(await makePdf(23));
    expect(r.ok).toBe(true);
    if (!r.ok || !r.parts) return;
    expect(r.parts.map(p => [p.fromPage, p.toPage])).toEqual([[1, 10], [11, 20], [21, 23]]);
    let pages = 0;
    for (const p of r.parts) {
      const bytes = new Uint8Array(await p.file.arrayBuffer());
      const n = countPdfPages(bytes);                 // the same counter the server uses
      expect(n).toBeLessThanOrEqual(MAX_PDF_PAGES);
      pages += (await PDFDocument.load(bytes)).getPageCount();
    }
    expect(pages).toBe(23);
    expect(r.parts[2].file.name).toBe('statement (pages 21-23).pdf');
  });
  test('compressed PDFs (object streams) are counted exactly, not as 0', async () => {
    const { exactPageCount } = await import('../src/lib/pdfSplit');
    const d = await PDFDocument.create();
    for (let i = 0; i < 23; i++) d.addPage([100, 100]);
    const bytes = await d.save({ useObjectStreams: true });
    expect(countPdfPages(bytes)).toBe(0);          // quick count cannot see them
    expect(await exactPageCount(bytes)).toBe(23);  // exact count can
  });
  test('damaged file is refused with guidance, not split', async () => {
    const r = await splitPdf(new File([new TextEncoder().encode('%PDF-1.4 broken')], 'x.pdf', { type: 'application/pdf' }));
    expect(r.ok).toBe(false);
  });
});
