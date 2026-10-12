// Original invoice files kept as evidence (pending migration
// 20261016100000_invoice_source_files). Pure: shared by the edge functions and
// the website tests.

export const SOURCE_BUCKET = 'documents';
/** How long a "View source" link stays valid. */
export const SOURCE_LINK_SECONDS = 300;

const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * Where a signed-in user's file is kept: <user id>/<document hash>.<ext>.
 * The hash is the document fingerprint, so one file maps to one path and a
 * stored file is never replaced. null when an input is not safe for a path.
 */
export function sourceFilePath(userId: string, documentHash: string, mimeType: string | null | undefined): string | null {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f]{16,128}$/i.test(documentHash)) return null;
  const ext = EXT[(mimeType || '').toLowerCase()] ?? 'bin';
  return `${userId}/${documentHash}.${ext}`;
}

/** True only for paths this feature writes, so a link is never issued for anything else in the bucket. */
export function isSourceFilePath(path: unknown): path is string {
  return typeof path === 'string' && /^[0-9a-f-]{36}\/[0-9a-f]{16,128}\.(pdf|jpg|png|webp|heic|heif|bin)$/i.test(path);
}
