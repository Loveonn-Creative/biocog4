// Long PDFs are split in the browser and read part by part. These helpers
// send the server what it needs to keep the parts of one PDF together
// (supabase/functions/_shared/splitPart.ts): the original file's
// fingerprint, the part's pages, and the header read from the first part.

import type { SplitHeader } from '../../supabase/functions/_shared/splitPart';

export type { SplitHeader };

/** SHA-256 of the original file, as lowercase hex. */
export async function fileFingerprint(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Supplier, number and date read from a part, to pass to later parts. */
export function headerOf(data: { vendor?: unknown; invoiceNumber?: unknown; date?: unknown; supplierGstin?: unknown } | null | undefined): SplitHeader | undefined {
  if (!data) return undefined;
  const t = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const h: SplitHeader = { vendor: t(data.vendor), invoiceNumber: t(data.invoiceNumber), date: t(data.date), supplierGstin: t(data.supplierGstin) };
  return h.vendor || h.invoiceNumber || h.date ? h : undefined;
}

/** A part worth one more try: the connection dropped or the server was briefly unavailable. */
export function retryablePartError(status: number | null): boolean {
  return status === null || status === 502 || status === 503 || status === 504;
}
