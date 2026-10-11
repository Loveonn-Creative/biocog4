// Counts pages in a PDF without a PDF library, so the upload screen and the
// extraction function apply the same limit. Pure; runs in Deno and the browser.
//
// Why a limit: extraction sends the whole file to the model in one request
// with a 4,096-token answer cap. Long documents can be cut off silently,
// which would produce incomplete records. Until long files are validated
// end to end, files above MAX_PDF_PAGES are refused with clear guidance.

export const MAX_PDF_PAGES = 10;

/** Best-effort page count. Returns 0 when the count cannot be read. */
export function countPdfPages(bytes: Uint8Array): number {
  // Latin-1 view of the bytes keeps PDF syntax searchable.
  let text = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    text += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  // Page objects: "/Type /Page" but not "/Type /Pages".
  const pageObjects = (text.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  // Page tree root(s): "/Count N". The largest is the document's page count
  // (this also works when page objects sit inside compressed object streams).
  let maxCount = 0;
  for (const m of text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)) {
    const n = Number(m[1] ?? m[2]);
    if (Number.isFinite(n) && n > maxCount) maxCount = n;
  }
  return Math.max(pageObjects, maxCount);
}

export function isPdf(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
}

export function pageLimitMessage(pages: number): string {
  return `This PDF has ${pages} pages. Upload up to ${MAX_PDF_PAGES} pages at a time: split the file, or upload each bill on its own.`;
}
