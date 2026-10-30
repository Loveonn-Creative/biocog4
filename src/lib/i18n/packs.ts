// Prebuilt language packs for public pages (scripts/i18n/build-packs.mjs).
// On a non-English locale and a non-sensitive route, the page's pack and the
// shared _common pack are fetched and seeded into the memory cache, so the DOM
// translator swaps text without waiting on the translate-batch function.
// Strings missing from a pack still go through the runtime path.
// Sensitive routes never load a pack: they keep reviewed static bundles only.

import { holdRuntimeFor, seedTranslations } from "./autoTranslate";
import { isSensitiveRoute } from "./sensitiveRoutes";
import { routeKey } from "./textRules";

const PACK_LOCALES = new Set([
  "hi", "bn", "ta", "mr", "te", "gu", "pa", "ml", "kn", "ur",
  "id", "tl", "vi", "th", "zh", "ar", "es", "pt",
]);

type Pack = Record<string, string>;

const fetched = new Map<string, Promise<Pack>>();
let activeLocale = "en";

export function packUrl(locale: string, key: string): string {
  return `/i18n/packs/${locale}/${key}.json`;
}

function fetchPack(locale: string, key: string): Promise<Pack> {
  const url = packUrl(locale, key);
  let p = fetched.get(url);
  if (!p) {
    p = fetch(url, { credentials: "same-origin" })
      .then(r => (r.ok ? r.json() : {}))
      .then(j => (j && typeof j === "object" && !Array.isArray(j) ? (j as Pack) : {}))
      .catch(() => ({}));
    fetched.set(url, p);
  }
  return p;
}

/** Whether a pack applies to this locale and path. */
export function packsApply(locale: string, pathname: string): boolean {
  return PACK_LOCALES.has(locale) && !isSensitiveRoute(pathname);
}

/**
 * Fetch and seed the _common and route packs. Runtime requests wait for them
 * (up to 4 s) so only strings the packs lack reach the network.
 */
export function loadPacks(locale: string, pathname: string): Promise<number> {
  activeLocale = locale;
  if (typeof fetch !== "function" || !packsApply(locale, pathname)) return Promise.resolve(0);
  const loading = Promise.all([fetchPack(locale, "_common"), fetchPack(locale, routeKey(pathname))])
    .then(([common, route]) => seedTranslations(locale, { ...common, ...route }));
  holdRuntimeFor(loading);
  return loading;
}

/** Warm a route's pack when the visitor shows intent (hover, touch, focus). */
export function prefetchPack(pathname: string): void {
  if (typeof fetch !== "function" || !packsApply(activeLocale, pathname)) return;
  void fetchPack(activeLocale, "_common");
  void fetchPack(activeLocale, routeKey(pathname));
}

/** Test hook: forget fetched packs. */
export function resetPacksForTest() {
  fetched.clear();
  activeLocale = "en";
}
