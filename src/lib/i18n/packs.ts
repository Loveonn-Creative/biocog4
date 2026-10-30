// Static translation packs for public, non-sensitive pages.
//
// scripts/i18n/build-packs.mjs writes public/i18n/packs/<locale>/<route-key>.json
// ({source: translated}) plus a _common.json per locale for strings shared by
// three or more pages, and lists what exists in packManifest.json. When a
// non-English locale is active, the route's pack (and _common) is fetched from
// the CDN and seeded into the autoTranslate memory cache, so the DOM translator
// finds every string on its first walk. Anything missing still goes through the
// runtime translate-batch path. Sensitive routes never load a pack.

import manifestJson from "./packManifest.json";
import { seedTranslations, setPackGate } from "./autoTranslate";
import { isSensitiveRoute } from "./sensitiveRoutes";
import { isPackRoute, routeKey } from "./packRoutes";

export { routeKey };

export interface PackManifest {
  locales: Record<string, { v: string; common: boolean; routes: string[] }>;
}

let manifest: PackManifest = manifestJson as PackManifest;

export function packUrl(locale: string, key: string): string {
  const v = manifest.locales[locale]?.v ?? "0";
  return `/i18n/packs/${locale}/${key}.json?v=${v}`;
}

type Fetcher = (url: string) => Promise<Record<string, string> | null>;

const defaultFetcher: Fetcher = async (url) => {
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) return null;
  // A host's SPA fallback may answer a missing file with index.html.
  const type = res.headers.get("content-type") || "";
  if (type && !type.includes("json")) return null;
  const data = await res.json();
  return data && typeof data === "object" && !Array.isArray(data) ? data : null;
};

let fetcher: Fetcher = defaultFetcher;
const files = new Map<string, Promise<void>>();

/** Test hooks: swap the manifest and fetcher, and forget loaded files. */
export function __setPackTestHooks(opts: { manifest?: PackManifest; fetcher?: Fetcher }) {
  if (opts.manifest) manifest = opts.manifest;
  if (opts.fetcher) fetcher = opts.fetcher;
  files.clear();
}

function loadFile(locale: string, key: string): Promise<void> {
  const id = `${locale}/${key}`;
  let p = files.get(id);
  if (!p) {
    p = fetcher(packUrl(locale, key))
      .then((entries) => { if (entries) seedTranslations(locale, entries); })
      .catch(() => { files.delete(id); }); // retry on the next visit
    files.set(id, p);
  }
  return p;
}

/** The pack files that exist for this locale and page (none on sensitive pages). */
export function packFilesFor(locale: string, pathname: string): string[] {
  if (!locale || locale === "en" || isSensitiveRoute(pathname)) return [];
  const entry = manifest.locales[locale];
  if (!entry) return [];
  const out: string[] = [];
  // Nav, footer and buttons: useful on every public page.
  if (entry.common) out.push("_common");
  const key = routeKey(pathname);
  if (isPackRoute(pathname) && entry.routes.includes(key)) out.push(key);
  return out;
}

/**
 * Load and seed the packs for a page. Resolves when they are in memory or
 * after `timeoutMs`, whichever is first. With `gate`, runtime misses wait for
 * it so strings the pack covers are never sent to the translation service.
 */
export function loadRoutePack(
  locale: string,
  pathname: string,
  { gate = true, timeoutMs = 1500 }: { gate?: boolean; timeoutMs?: number } = {},
): Promise<void> {
  const keys = packFilesFor(locale, pathname);
  if (keys.length === 0) return Promise.resolve();
  const all = Promise.all(keys.map((k) => loadFile(locale, k))).then(() => undefined);
  const bounded = Promise.race([
    all,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  if (gate) setPackGate(bounded);
  return bounded;
}

/** Warm the packs for a page the visitor is about to open. */
export function prefetchRoutePack(locale: string, pathname: string): void {
  for (const k of packFilesFor(locale, pathname)) void loadFile(locale, k);
}

/**
 * Prefetch on hover, touch or focus: a same-site link warms that page's pack
 * in the active locale; a language option ([data-prefetch-locale]) warms the
 * current page's pack in that language. Returns an uninstall function.
 */
export function installPackPrefetch(getLocale: () => string): () => void {
  const onIntent = (e: Event) => {
    const target = e.target as Element | null;
    if (!target || typeof target.closest !== "function") return;
    const option = target.closest("[data-prefetch-locale]");
    if (option) {
      prefetchRoutePack(option.getAttribute("data-prefetch-locale") || "", window.location.pathname);
      return;
    }
    const locale = getLocale();
    if (locale === "en") return;
    const a = target.closest("a[href]") as HTMLAnchorElement | null;
    if (!a) return;
    try {
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      prefetchRoutePack(locale, url.pathname);
    } catch { /* not a navigable link */ }
  };
  const opts: AddEventListenerOptions = { passive: true, capture: true };
  const events = ["pointerover", "touchstart", "focusin"];
  events.forEach((ev) => document.addEventListener(ev, onIntent, opts));
  return () => events.forEach((ev) => document.removeEventListener(ev, onIntent, opts));
}
