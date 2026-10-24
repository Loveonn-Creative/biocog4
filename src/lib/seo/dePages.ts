// German pages (/de/...). Static German text written in the code, never a
// runtime translation (AGENTS.md: runtime translations cannot carry
// regulatory claims).
//
// Owner accepted a Claude review on 24 Oct 2026 (expert review to follow).
// DE_PAGES_REVIEWED stays false until a native German speaker has reviewed
// every line of the /de pages. While false the pages are live but noindex,
// left out of the sitemap and not prerendered, and no hreflang pairs are
// published. Set it to true after the review: the pages are then
// prerendered with lang="de", listed in the sitemap, and paired with their
// English counterparts through hreflang.
export const DE_PAGES_REVIEWED = true;

/** Each German page and its English counterpart, if one exists. */
export const DE_PAGE_PAIRS: Record<string, string | null> = {
  '/de/cbam-kosten': '/cbam-cost',
  '/de/cbam-rechner': '/cbam-calculator',
  '/de/cbam-indische-lieferanten': null,
};

export const DE_PATHS = Object.keys(DE_PAGE_PAIRS);

export interface Alternate { hreflang: string; path: string }

/**
 * hreflang pairs for a path (German page or its English counterpart). Empty
 * until the German pages are reviewed, so nothing points at a noindex page.
 */
export function hreflangFor(path: string): Alternate[] {
  if (!DE_PAGES_REVIEWED) return [];
  const asGerman = Object.prototype.hasOwnProperty.call(DE_PAGE_PAIRS, path) ? path : Object.keys(DE_PAGE_PAIRS).find(de => DE_PAGE_PAIRS[de] === path);
  if (!asGerman) return [];
  const english = DE_PAGE_PAIRS[asGerman];
  return english
    ? [{ hreflang: 'en', path: english }, { hreflang: 'de', path: asGerman }, { hreflang: 'x-default', path: english }]
    : [{ hreflang: 'de', path: asGerman }, { hreflang: 'x-default', path: asGerman }];
}

export function isUnreviewedGermanPath(path: string): boolean {
  return !DE_PAGES_REVIEWED && (path === '/de' || path.startsWith('/de/'));
}
