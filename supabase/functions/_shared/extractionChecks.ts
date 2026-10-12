// Completeness checks for document extraction. Pure: no Deno imports, so the
// website tests run them too.

/** Shown when a PDF's pages cannot be counted, so nothing can confirm a full read. */
export const UNKNOWN_PAGE_COUNT_MESSAGE =
  'The pages in this PDF could not be counted, so it cannot be read completely. Save it again as a PDF, or upload each page as an image.';

/** Shown when the reading model stopped before finishing its answer. */
export const INCOMPLETE_EXTRACTION_MESSAGE =
  'This document has more lines than one read can hold, so nothing was saved. Split it into smaller files, or upload each bill on its own.';

/** True when the model's answer was cut off by its length limit. */
export function isTruncatedFinish(finishReason: unknown): boolean {
  return typeof finishReason === 'string' && /^(length|max_tokens|max_output_tokens)$/i.test(finishReason);
}

/**
 * A line's page reference, checked against the document: an integer from 1
 * to the page count (an image has one page). Anything else is null: the line
 * is kept, but its page is reported as unknown rather than set to page 1.
 */
export function checkedSourcePage(raw: unknown, pageCount: number | null): number | null {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  const max = pageCount && pageCount > 0 ? pageCount : 1;
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}

/** Page numbers of a part of a split PDF, mapped back to the original file. */
export function offsetSourcePages<T extends object>(items: T[], fromPage: number): T[] {
  const offset = Number.isInteger(fromPage) && fromPage > 1 ? fromPage - 1 : 0;
  return items.map((i) => {
    const page = (i as { sourcePage?: unknown }).sourcePage;
    return typeof page === 'number' ? { ...i, sourcePage: page + offset } : i;
  });
}
