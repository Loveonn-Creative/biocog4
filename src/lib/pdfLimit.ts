import { countPdfPages, isPdf, MAX_PDF_PAGES, pageLimitMessage } from '../../supabase/functions/_shared/pdfPages';
import { exactPageCount } from './pdfSplit';
import { UNKNOWN_PAGE_COUNT_MESSAGE } from '../../supabase/functions/_shared/extractionChecks';

/** Checks a picked file before upload. Images always pass. */
/**
 * Pages per part when a PDF is split in the browser. With page counting each
 * page is one invoice whatever the part size, so parts are 5 pages (read two
 * at a time, so a long PDF finishes sooner). Before an account's switch a
 * part counts as one read, so parts stay at the server's 10-page limit and
 * nobody is charged more for the same PDF.
 */
export const CHUNK_PAGES = 5;
export const chunkPagesFor = (pageCounting: boolean): number => (pageCounting ? CHUNK_PAGES : MAX_PDF_PAGES);

export async function checkUploadPages(file: File, maxPages = MAX_PDF_PAGES): Promise<{ ok: boolean; reason?: 'too_many_pages' | 'unknown_page_count'; message?: string }> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return { ok: true };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return { ok: true };
  // Compressed page trees (object streams) hide pages from the quick count;
  // then count exactly with pdf-lib (loaded only in that case).
  let pages = countPdfPages(bytes);
  if (pages === 0) pages = await exactPageCount(bytes);
  // Without a page count nothing can confirm the whole file was read.
  if (pages < 1) return { ok: false, reason: 'unknown_page_count', message: UNKNOWN_PAGE_COUNT_MESSAGE };
  return pages > maxPages ? { ok: false, reason: 'too_many_pages', message: pageLimitMessage(pages) } : { ok: true };
}

/** Pages in a picked file: a PDF's page count (0 when unknown), 1 for an image. */
export async function pageCountOf(file: File): Promise<number> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return 1;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return 1;
  const quick = countPdfPages(bytes);
  return quick > 0 ? quick : exactPageCount(bytes);
}

/**
 * Reads a batch is expected to use, counted as the server counts them: with
 * page counting, every PDF page and every image is one; before an account's
 * switch, one per file and one per part of up to MAX_PDF_PAGES pages. An
 * estimate: repeat uploads of a stored invoice are free.
 */
export function estimateReads(pageCounts: number[], pageCounting = false): { reads: number; pages: number } {
  // Page counting: every page is one; before the switch, one per 10-page part.
  let reads = 0, pages = 0;
  for (const n of pageCounts) {
    const p = Math.max(1, n);
    pages += p;
    reads += pageCounting ? p : p > MAX_PDF_PAGES ? Math.ceil(p / MAX_PDF_PAGES) : 1;
  }
  return { reads, pages };
}
