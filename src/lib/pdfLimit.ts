import { countPdfPages, isPdf, MAX_PDF_PAGES, pageLimitMessage } from '../../supabase/functions/_shared/pdfPages';

/** Checks a picked file before upload. Images always pass. */
export async function checkUploadPages(file: File): Promise<{ ok: boolean; message?: string }> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return { ok: true };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return { ok: true };
  const pages = countPdfPages(bytes);
  return pages > MAX_PDF_PAGES ? { ok: false, message: pageLimitMessage(pages) } : { ok: true };
}
