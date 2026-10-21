import type { LibraryAnswer, LibraryTopic } from '@/data/answerLibraryTypes';

// Answer library data in the browser. Each answer page loads only its own
// JSON (public/answer-data/<slug>.json, written at build); the first page a
// visitor opens has it embedded in the prerendered HTML, so it shows without a
// request. The hub and the radar fetch the light index. Nothing here is private:
// the same content is on the public pages.

export interface AnswerPageData { page: LibraryAnswer; related: Array<{ slug: string; q: string }> }
export interface AnswerIndexRow { slug: string; q: string; title: string; topic: LibraryTopic }

const SLUG = /^[a-z0-9]+(-[a-z0-9]+){1,12}$/;
const cache = new Map<string, Promise<AnswerPageData | null>>();
let embeddedRead = false;

/** The page data the prerender embedded for the address first opened, if it matches. */
function embedded(slug: string): AnswerPageData | null {
  if (embeddedRead || typeof document === 'undefined') return null;
  const el = document.getElementById('answer-data');
  if (!el?.textContent) return null;
  try {
    const data = JSON.parse(el.textContent) as AnswerPageData;
    if (data?.page?.slug !== slug) return null;
    embeddedRead = true;
    return data;
  } catch { return null; }
}

/** Synchronous read for the first render, so the prerendered page does not flash. */
export function answerFromPage(slug: string): AnswerPageData | null {
  const hit = embedded(slug);
  if (hit) cache.set(slug, Promise.resolve(hit));
  return hit;
}

/** One answer page, or null when there is no library page with that slug. */
export function loadAnswer(slug: string): Promise<AnswerPageData | null> {
  if (!SLUG.test(slug)) return Promise.resolve(null);
  const hit = cache.get(slug) ?? (() => {
    const p = fetch(`/answer-data/${slug}.json`)
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() as Promise<AnswerPageData> : null))
      .catch(() => null);
    cache.set(slug, p);
    // A network failure should not stick: forget it so a later visit retries.
    void p.then((v) => { if (!v) cache.delete(slug); });
    return p;
  })();
  return hit;
}

let indexPromise: Promise<AnswerIndexRow[]> | null = null;
/** The light index (slug, question, title, topic) for the hub and the radar. */
export function loadAnswerIndex(): Promise<AnswerIndexRow[]> {
  if (!indexPromise) {
    indexPromise = fetch('/answer-data/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ s: string; q: string; t: string; o: LibraryTopic }>) => rows.map((r) => ({ slug: r.s, q: r.q, title: r.t, topic: r.o })))
      .catch(() => { indexPromise = null; return []; });
  }
  return indexPromise;
}
