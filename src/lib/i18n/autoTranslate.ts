// Runtime auto-translation queue with layered caching.
// - Memory cache: instant lookup across components
// - localStorage cache: survives reload, LRU-capped
// - Edge function `translate-batch`: fills gaps, upserts durable cache
//
// Callers use useT() (see useT.ts). This module is a plain singleton with no
// React concerns so it can be shared by toast helpers, form validators, etc.

import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { LONG_TEXT_CHARS, isTranslatable, splitLongText, splitSpacing } from "./textRules";

type Locale = string;

const SUPPORTED_LOCALES = new Set([
  "en", "hi", "bn", "ta", "mr", "id", "ur", "tl", "vi", "th", "es",
  // Extended emerging-market coverage (auto-translated, no static JSON needed)
  "te", "gu", "pa", "ml", "kn", "zh", "ar", "pt",
]);

const memory: Record<Locale, Map<string, string>> = {};
const inflight: Record<Locale, Map<string, Promise<string>>> = {};
const listeners = new Set<() => void>();

function getMem(locale: Locale) {
  if (!memory[locale]) memory[locale] = new Map();
  return memory[locale];
}
function getInflight(locale: Locale) {
  if (!inflight[locale]) inflight[locale] = new Map();
  return inflight[locale];
}

// ---------- localStorage LRU (per-locale) ----------
const LS_PREFIX = "senseible_i18n_";
const LS_MAX_ENTRIES = 4000; // approx 2 MB across locales

function lsLoad(locale: Locale): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_PREFIX + locale);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function lsSave(locale: Locale, map: Record<string, string>) {
  try {
    const keys = Object.keys(map);
    let toSave = map;
    if (keys.length > LS_MAX_ENTRIES) {
      // Keep the most recently added half
      const trimmed = keys.slice(keys.length - Math.floor(LS_MAX_ENTRIES * 0.75));
      toSave = {};
      for (const k of trimmed) toSave[k] = map[k];
    }
    localStorage.setItem(LS_PREFIX + locale, JSON.stringify(toSave));
  } catch {
    // Storage full — drop this locale's cache and retry once
    try { localStorage.removeItem(LS_PREFIX + locale); } catch {}
  }
}
// Once per locale. Tracked separately from the memory size because a
// language pack may seed memory before the first lookup.
const hydrated = new Set<Locale>();
function hydrateFromStorage(locale: Locale) {
  if (hydrated.has(locale)) return;
  hydrated.add(locale);
  const mem = getMem(locale);
  const stored = lsLoad(locale);
  // Pack entries already in memory win over older stored ones.
  for (const [k, v] of Object.entries(stored)) if (!mem.has(k)) mem.set(k, v);
}

// ---------- Batching queue ----------
const pending: Record<Locale, Set<string>> = {};
let flushTimer: number | null = null;

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(flushAll, 120);
}

// While a language pack is loading, cache misses wait for it instead of
// going to the network: most of them are in the pack. Capped so a slow or
// missing pack never blocks the runtime path for long.
const PACK_WAIT_MS = 4000;
let packGate: Promise<unknown> | null = null;

/** Hold runtime translation requests until `loading` settles (or 4 s). */
export function holdRuntimeFor(loading: Promise<unknown>) {
  const capped = Promise.race([
    loading.catch(() => undefined),
    new Promise(resolve => setTimeout(resolve, PACK_WAIT_MS)),
  ]);
  const gate = packGate ? Promise.all([packGate, capped]) : capped;
  packGate = gate;
  void gate.then(() => {
    if (packGate === gate) packGate = null;
    if (Object.values(pending).some(set => set.size > 0)) scheduleFlush();
  });
}

/**
 * Put known translations (a language pack) into the memory cache. Strings
 * already waiting on the network are answered from here instead.
 */
export function seedTranslations(locale: Locale, entries: Record<string, string>) {
  const mem = getMem(locale);
  let added = 0;
  for (const [src, dst] of Object.entries(entries)) {
    if (typeof dst !== "string" || !dst || mem.get(src) === dst) continue;
    mem.set(src, dst);
    getInflight(locale).delete(src);
    pending[locale]?.delete(src);
    added++;
  }
  if (added > 0) notify();
  return added;
}

async function flushAll() {
  flushTimer = null;
  if (packGate) return; // re-armed when the pack settles
  const locales = Object.keys(pending);
  for (const locale of locales) {
    const set = pending[locale];
    if (!set || set.size === 0) continue;
    const mem = getMem(locale);
    for (const s of Array.from(set)) {
      if (mem.has(s)) { set.delete(s); getInflight(locale).delete(s); }
    }
    if (set.size === 0) continue;
    const batch = Array.from(set).slice(0, 50);
    for (const s of batch) set.delete(s);
    if (set.size > 0) scheduleFlush(); // re-arm for leftovers
    void translateBatch(locale, batch);
  }
}

async function translateBatch(locale: Locale, strings: string[]) {
  try {
    const { data, error } = await (await loadSupabase()).functions.invoke("translate-batch", {
      body: { locale, strings },
    });
    const map: Record<string, string> =
      (data as any)?.translations && !error ? (data as any).translations : {};
    const mem = getMem(locale);
    const stored = lsLoad(locale);
    for (const s of strings) {
      const v = map[s] ?? s;
      mem.set(s, v);
      stored[s] = v;
      const inf = getInflight(locale).get(s);
      if (inf) getInflight(locale).delete(s);
    }
    lsSave(locale, stored);
    notify();
  } catch (err) {
    // On failure, resolve to source so callers unblock
    const mem = getMem(locale);
    for (const s of strings) {
      if (!mem.has(s)) mem.set(s, s);
      getInflight(locale).delete(s);
    }
    notify();
  }
}

// Bumped on every cache update so React's useSyncExternalStore sees a new
// snapshot and re-renders components showing freshly translated text.
let storeVersion = 0;

export function getStoreVersion(): number {
  return storeVersion;
}

function notify() {
  storeVersion += 1;
  listeners.forEach((l) => {
    try { l(); } catch {}
  });
}

// ---------- Public API ----------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Return the translation for `text` in `locale`.
 * - If locale === 'en' or text is falsy/short-numeric, returns text unchanged.
 * - If cached (memory or localStorage), returns it synchronously.
 * - Otherwise queues a batch translation and returns the source; components
 *   subscribed via useT() will re-render when the translation arrives.
 */
// Runtime machine translation is switched off on sensitive product pages
// (see sensitiveRoutes.ts): they show reviewed static bundles or English,
// never generated text that could restate a regulatory or verified claim.
let runtimeAllowed = true;

export function setRuntimeTranslationAllowed(allowed: boolean) {
  if (runtimeAllowed === allowed) return;
  runtimeAllowed = allowed;
  notify();
}

export function isRuntimeTranslationAllowed() {
  return runtimeAllowed;
}

export function translateSync(locale: Locale, text: string): string {
  if (!text || typeof text !== "string") return text;
  if (locale === "en" || !SUPPORTED_LOCALES.has(locale)) return text;
  if (!runtimeAllowed) return text;
  // Skip rules (numbers, symbols, identifiers, emails, URLs) live in textRules.ts.
  if (!isTranslatable(text)) return text;

  // Long text: the server drops strings over 600 characters, so translate
  // each sentence through the cache and rejoin with the original spacing.
  const pieces = text.length > LONG_TEXT_CHARS ? splitLongText(text) : null;
  if (pieces && pieces.length > 1) {
    return pieces
      .map(piece => {
        const [lead, core, tail] = splitSpacing(piece);
        return `${lead}${translateSync(locale, core)}${tail}`;
      })
      .join("");
  }

  hydrateFromStorage(locale);
  const mem = getMem(locale);
  const hit = mem.get(text);
  if (hit !== undefined) return hit;

  const infl = getInflight(locale);
  if (!infl.has(text)) {
    infl.set(text, Promise.resolve(text));
    if (!pending[locale]) pending[locale] = new Set();
    pending[locale].add(text);
    scheduleFlush();
  }
  return text; // will re-render on notify()
}

/** Force preload of a set of strings (e.g. on route enter). */
export function preload(locale: Locale, strings: string[]) {
  if (locale === "en") return;
  for (const s of strings) translateSync(locale, s);
}
