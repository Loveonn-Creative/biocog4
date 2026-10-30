// Fetches a page's code before the visitor opens it, so in-app navigation
// does not wait on the network. The build writes /route-chunks.json (route
// pattern → chunk files, scripts/seo/route-chunks.mjs). Chunks are fetched as
// <link rel="modulepreload">: a failed fetch is silent, unlike import(),
// whose failure would trigger the stale-build reload in chunkRecovery.ts.

import { prefetchPack } from '@/lib/i18n/packs';

interface ChunkMap { files: string[]; routes: Record<string, number[]> }

let mapPromise: Promise<ChunkMap | null> | null = null;
const requested = new Set<string>();

/** Skips prefetching for visitors who asked to save data or are on 2G. */
export function prefetchAllowed(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !(c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? ''));
}

function loadMap(): Promise<ChunkMap | null> {
  if (!mapPromise) {
    mapPromise = fetch('/route-chunks.json', { credentials: 'same-origin' })
      .then(r => (r.ok ? (r.json() as Promise<ChunkMap>) : null))
      .catch(() => null);
  }
  return mapPromise;
}

/** Chunk files for a path: an exact route first, then one with :params. */
export function chunksForPath(map: ChunkMap, pathname: string): string[] {
  const pick = (ids: number[]) => ids.map(i => map.files[i]).filter(Boolean);
  if (map.routes[pathname]) return pick(map.routes[pathname]);
  const parts = pathname.split('/');
  for (const [pattern, ids] of Object.entries(map.routes)) {
    const pp = pattern.split('/');
    if (pp.length === parts.length && pp.every((p, i) => p.startsWith(':') || p === parts[i])) return pick(ids);
  }
  return [];
}

function preload(href: string) {
  if (requested.has(href)) return;
  requested.add(href);
  if (document.querySelector(`link[rel="modulepreload"][href="${href}"], script[src="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.crossOrigin = '';
  link.href = href;
  document.head.appendChild(link);
}

/** Starts fetching the code for an in-app path. Safe to call often. */
export async function prefetchPath(pathname: string): Promise<void> {
  if (typeof document === 'undefined' || !prefetchAllowed()) return;
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const map = await loadMap();
  if (map) chunksForPath(map, path).forEach(preload);
}

const internalPath = (el: EventTarget | null): string | null => {
  const a = (el as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return null;
  const url = new URL(a.href, location.href);
  return url.origin === location.origin && url.pathname !== location.pathname ? url.pathname : null;
};

/**
 * Prefetches a page when the visitor shows intent (hover, touch or keyboard
 * focus on a link), and the signed-in pages they are likely to open once the
 * current page is idle. Returns a cleanup function.
 */
export function installRoutePrefetch(likelyPaths: () => string[]): () => void {
  const onIntent = (e: Event) => {
    const p = internalPath(e.target);
    if (!p) return;
    void prefetchPath(p);
    // The language pack too, so a translated page opens already translated.
    if (prefetchAllowed()) prefetchPack(p);
  };
  document.addEventListener('pointerover', onIntent, { passive: true });
  document.addEventListener('touchstart', onIntent, { passive: true });
  document.addEventListener('focusin', onIntent);
  const idle = (cb: () => void) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(cb, { timeout: 4000 });
    else setTimeout(cb, 500);
  };
  const timer = window.setTimeout(() => idle(() => likelyPaths().forEach(p => void prefetchPath(p))), 2000);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('pointerover', onIntent);
    document.removeEventListener('touchstart', onIntent);
    document.removeEventListener('focusin', onIntent);
  };
}
