// Long PDFs are split in the browser and each part is read on its own.
// These rules keep the parts of one PDF together:
// - a part is identified by the original file's fingerprint and its pages,
//   so a re-upload of the same PDF is still caught as a duplicate;
// - a continuation page with no header of its own takes the supplier,
//   invoice number and date read from the first part (never the lines);
// - a line already read from an earlier part of the same PDF is counted
//   once, so a printed duplicate or triplicate copy is not counted again,
//   while new lines on continuation pages are kept;
// - page numbers are stored as pages of the original PDF.

export interface SplitHeader {
  vendor?: string;
  invoiceNumber?: string;
  date?: string;
  supplierGstin?: string;
}

export interface SplitPart {
  sourceHash: string;
  fromPage: number;
  toPage: number;
  totalPages: number;
  header?: SplitHeader;
}

const MAX_PAGES = 5000;
const text = (v: unknown, max = 120) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const page = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_PAGES ? (v as number) : null);

/** The split details sent with a part, checked; null when absent or invalid. */
export function parseSplitPart(raw: unknown): SplitPart | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const sourceHash = typeof r.sourceHash === 'string' && /^[0-9a-f]{64}$/.test(r.sourceHash) ? r.sourceHash : null;
  const fromPage = page(r.fromPage), toPage = page(r.toPage), totalPages = page(r.totalPages);
  if (!sourceHash || fromPage === null || toPage === null || totalPages === null) return null;
  if (fromPage > toPage || toPage > totalPages) return null;
  const h = r.header && typeof r.header === 'object' ? (r.header as Record<string, unknown>) : null;
  const header: SplitHeader | undefined = h
    ? { vendor: text(h.vendor), invoiceNumber: text(h.invoiceNumber, 60), date: text(h.date, 40), supplierGstin: text(h.supplierGstin, 20) }
    : undefined;
  const hasHeader = header && Object.values(header).some(Boolean);
  return { sourceHash, fromPage, toPage, totalPages, ...(hasHeader ? { header } : {}) };
}

/**
 * Fills the header of a continuation page from the first part, only when the
 * page prints none of supplier, invoice number and date (a separate invoice
 * inside the same PDF prints its own and is left alone). Returns the fields set.
 */
export function fillMissingHeader(ocr: Record<string, unknown>, header?: SplitHeader): string[] {
  if (!header) return [];
  if (text(ocr.vendor) || text(ocr.invoiceNumber) || text(ocr.date)) return [];
  const filled: string[] = [];
  for (const k of ['vendor', 'invoiceNumber', 'date', 'supplierGstin'] as const) {
    if (header[k] && !text(ocr[k])) { ocr[k] = header[k]; filled.push(k); }
  }
  return filled;
}

const num = (v: unknown): string => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v.replace(/[^0-9.-]/g, '')) : NaN;
  return Number.isFinite(n) ? n.toFixed(2) : '';
};

/** Identity of a line for "already read from this PDF": description, quantity and line total. */
export function lineSignature(l: { description?: unknown; quantity?: unknown; total?: unknown }): string {
  const d = typeof l.description === 'string' ? l.description.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';
  return `${d}|${num(l.quantity)}|${num(l.total)}`;
}

/** Removes lines already read from earlier parts of the same PDF. */
export function dropRepeatedLines<T extends { description?: unknown; quantity?: unknown; total?: unknown }>(
  lines: T[], seen: Set<string>,
): { kept: T[]; dropped: number } {
  const kept = lines.filter((l) => !seen.has(lineSignature(l)));
  return { kept, dropped: lines.length - kept.length };
}

/** Page numbers of a part, as pages of the original PDF. */
export function shiftPages<T extends { sourcePage?: number }>(lines: T[], fromPage: number): T[] {
  if (fromPage <= 1) return lines;
  return lines.map((l) => (l.sourcePage ? { ...l, sourcePage: l.sourcePage + fromPage - 1 } : l));
}
