// Public library lookup for Biocog Intelligence: the answers, guides and
// product facts a general question may cite. The database copy
// (public_library_entries, synced from the website's /answer-data/_library.json)
// is searched first; the bundled copy is the fallback until that table exists
// and holds a synced library. Public content only, no user data.
import { retrieveResources, tokens, type LibraryEntry } from './intelligenceEvidence.ts';

export const LIBRARY_ORIGIN = 'https://senseible.earth';
export const LIBRARY_PATH = '/answer-data/_library.json';
export const LIBRARY_VERSION_PATH = '/answer-data/_library-version.json';
const KINDS = new Set(['answer', 'article', 'fact']);
const URL_OK = /^https:\/\/senseible\.earth\/[a-z0-9/-]{1,200}$/;

// deno-lint-ignore no-explicit-any
type Db = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };

/** The closest entries for a question, from the database when it is ready. */
export async function findResources(db: Db, question: string, bundled: LibraryEntry[], k = 4): Promise<{ entries: LibraryEntry[]; source: 'db' | 'bundle' }> {
  const terms = [...new Set(tokens(question))].filter((t) => /^[a-z0-9]{1,40}$/.test(t)).slice(0, 12);
  if (!terms.length) return { entries: [], source: 'db' };
  try {
    const { data, error } = await db.rpc('search_public_library', { p_terms: terms, p_limit: 24 });
    if (!error && data?.ready === true && Array.isArray(data.rows)) {
      const rows = validEntries(data.rows) ?? [];
      // Same scoring and threshold as the bundled copy, over the database's candidates.
      return { entries: retrieveResources(question, rows, k), source: 'db' };
    }
  } catch { /* table missing or unreachable: use the bundled copy */ }
  return { entries: retrieveResources(question, bundled, k), source: 'bundle' };
}

/** Entries in the published shape, or null if any entry is malformed. */
export function validEntries(raw: unknown): LibraryEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const out: LibraryEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') return null;
    const { kind, title, text, url } = e as Record<string, unknown>;
    if (typeof kind !== 'string' || !KINDS.has(kind)) return null;
    if (typeof title !== 'string' || !title || title.length > 300) return null;
    if (typeof text !== 'string' || !text || text.length > 1000) return null;
    if (!(url === null || (typeof url === 'string' && URL_OK.test(url)))) return null;
    out.push({ kind: kind as LibraryEntry['kind'], title, text, url: url as string | null });
  }
  return out;
}

async function sha16(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Brings the database copy up to the website's published library. At most one
 * caller checks per six hours (claimed in the database); the download must hash
 * to the published version and every entry must pass validEntries, or nothing
 * changes.
 */
export async function syncLibrary(db: Db, fetchFn: typeof fetch = fetch): Promise<'skipped' | 'current' | 'updated' | 'failed'> {
  try {
    const { data: claim, error } = await db.rpc('claim_public_library_check', {});
    const row = Array.isArray(claim) ? claim[0] : claim;
    if (error || !row?.claimed) return 'skipped';
    const vr = await fetchFn(`${LIBRARY_ORIGIN}${LIBRARY_VERSION_PATH}`, { cache: 'no-store', redirect: 'error' });
    const published = vr.ok ? await vr.json().catch(() => null) : null;
    const version = typeof published?.version === 'string' && /^[0-9a-f]{16}$/.test(published.version) ? published.version : null;
    if (!version) return 'failed';
    if (version === row.version) return 'current';
    const lr = await fetchFn(`${LIBRARY_ORIGIN}${LIBRARY_PATH}`, { cache: 'no-store', redirect: 'error' });
    if (!lr.ok) return 'failed';
    const text = await lr.text();
    if (await sha16(text) !== version) return 'failed';
    const entries = validEntries(JSON.parse(text));
    if (!entries?.length || entries.length > 20000) return 'failed';
    const { error: applyError } = await db.rpc('apply_public_library', { p_version: version, p_entries: entries });
    return applyError ? 'failed' : 'updated';
  } catch {
    return 'failed';
  }
}
