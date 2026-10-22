import { isSourceFilePath } from './sourceFiles.ts';

/**
 * The stored original file for a document, only when its path is the one
 * extract-document writes for that document: <uploader id>/<document hash>.<ext>.
 * documents.file_url can be edited from the browser by the row's owner, so a
 * path pointing into another user's folder, or at another file, is refused.
 */
export function ownedSourcePath(doc: { user_id?: string | null; document_hash?: string | null; file_url?: unknown }): string | null {
  const path = doc.file_url;
  if (!isSourceFilePath(path) || !doc.user_id) return null;
  const [folder, file] = path.split('/');
  if (folder.toLowerCase() !== doc.user_id.toLowerCase()) return null;
  if (doc.document_hash && file.split('.')[0].toLowerCase() !== doc.document_hash.toLowerCase()) return null;
  return path;
}
