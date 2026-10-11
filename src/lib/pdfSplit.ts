import { MAX_PDF_PAGES } from '../../supabase/functions/_shared/pdfPages';

export interface PdfPart { file: File; fromPage: number; toPage: number; totalPages: number }

/** ok with parts, or not ok with a message for the visitor. */
export interface SplitResult { ok: boolean; parts?: PdfPart[]; message?: string }

/** Page ranges of at most `size` pages: [1-10], [11-20], ... */
export function pageRanges(totalPages: number, size = MAX_PDF_PAGES): [number, number][] {
  const out: [number, number][] = [];
  for (let start = 1; start <= totalPages; start += size) out.push([start, Math.min(totalPages, start + size - 1)]);
  return out;
}

/**
 * Splits a long PDF into parts of at most MAX_PDF_PAGES pages, in the
 * browser, so each part is read in full by extraction. pdf-lib is loaded
 * only here (a long PDF was dropped), never on first page load.
 * Encrypted or damaged files are not split; the caller shows the message.
 */
export async function splitPdf(file: File, size = MAX_PDF_PAGES): Promise<SplitResult> {
  let PDFDocument: typeof import('pdf-lib').PDFDocument;
  try {
    ({ PDFDocument } = await import('pdf-lib'));
  } catch {
    return { ok: false, message: 'Could not load the PDF tools. Check your connection and try again.' };
  }
  let src: import('pdf-lib').PDFDocument;
  try {
    src = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch (e) {
    const encrypted = e instanceof Error && /encrypt/i.test(e.message);
    return {
      ok: false,
      message: encrypted
        ? 'This PDF is password-protected, so it cannot be split here. Remove the password or upload each bill on its own.'
        : 'This PDF could not be opened for splitting. Upload each bill on its own.',
    };
  }
  const base = file.name.replace(/\.pdf$/i, '');
  const parts: PdfPart[] = [];
  try {
    const total = src.getPageCount();
    if (total < 1) throw new Error('no pages');
    for (const [from, to] of pageRanges(total, size)) {
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i));
      pages.forEach(p => out.addPage(p));
      // Plain object layout so the server's page counter can read each part.
      const bytes = await out.save({ useObjectStreams: false });
      parts.push({
        file: new File([bytes], `${base} (pages ${from}-${to}).pdf`, { type: 'application/pdf' }),
        fromPage: from, toPage: to, totalPages: total,
      });
    }
  } catch {
    return { ok: false, message: 'This PDF could not be split. Upload each bill on its own.' };
  }
  return { ok: true, parts };
}

/** Exact page count via pdf-lib, for PDFs whose page tree is compressed. 0 if unreadable. */
export async function exactPageCount(bytes: Uint8Array): Promise<number> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    return (await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true })).getPageCount();
  } catch {
    return 0;
  }
}
