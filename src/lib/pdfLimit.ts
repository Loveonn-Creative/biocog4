import { countPdfPages, isPdf, MAX_PDF_PAGES, pageLimitMessage } from '../../supabase/functions/_shared/pdfPages';
import { exactPageCount } from './pdfSplit';
import { UNKNOWN_PAGE_COUNT_MESSAGE } from '../../supabase/functions/_shared/extractionChecks';

/** Checks a picked file before upload. Images always pass. */
export async function checkUploadPages(file: File): Promise<{ ok: boolean; reason?: 'too_many_pages' | 'unknown_page_count'; message?: string }> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return { ok: true };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return { ok: true };
  // Compressed page trees (object streams) hide pages from the quick count;
  // then count exactly with pdf-lib (loaded only in that case).
  let pages = countPdfPages(bytes);
  if (pages === 0) pages = await exactPageCount(bytes);
  // Without a page count nothing can confirm the whole file was read.
  if (pages < 1) return { ok: false, reason: 'unknown_page_count', message: UNKNOWN_PAGE_COUNT_MESSAGE };
  return pages > MAX_PDF_PAGES ? { ok: false, reason: 'too_many_pages', message: pageLimitMessage(pages) } : { ok: true };
}
