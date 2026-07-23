// Runtime auto-translation queue with layered caching.
// - Memory cache: instant lookup across components
// - localStorage cache: survives reload, LRU-capped
// - Edge function `translate-batch`: fills gaps, upserts durable cache
//
// Callers use useT() (see useT.ts). This module is a plain singleton with no
// React concerns so it can be shared by toast helpers, form validators, etc.

import { supabase } from "@/integrations/supabase/client";

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
function hydrateFromStorage(locale: Locale) {
  const mem = getMem(locale);
  if (mem.size > 0) return;
  const stored = lsLoad(locale);
  for (const [k, v] of Object.entries(stored)) mem.set(k, v);
}

// ---------- Batching queue ----------
const pending: Record<Locale, Set<string>> = {};
let flushTimer: number | null = null;

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(flushAll, 120);
}

async function flushAll() {
  flushTimer = null;
  const locales = Object.keys(pending);
  for (const locale of locales) {
    const set = pending[locale];
    if (!set || set.size === 0) continue;
    const batch = Array.from(set).slice(0, 50);
    for (const s of batch) set.delete(s);
    if (set.size > 0) scheduleFlush(); // re-arm for leftovers
    void translateBatch(locale, batch);
  }
}

async function translateBatch(locale: Locale, strings: string[]) {
  try {
    const { data, error } = await supabase.functions.invoke("translate-batch", {
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

function notify() {
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
export function translateSync(locale: Locale, text: string): string {
  if (!text || typeof text !== "string") return text;
  if (locale === "en" || !SUPPORTED_LOCALES.has(locale)) return text;
  const trimmed = text.trim();
  if (trimmed.length === 0) return text;
  // Skip pure numeric/symbolic tokens
  if (/^[\d\s.,%:/+\-]+$/.test(trimmed)) return text;
  // Skip strings with no letters at all (emoji, punctuation, code-ish)
  if (!/\p{L}/u.test(trimmed)) return text;
  // Skip pure identifiers / code tokens (GSTIN, HSN, SHA hashes, ISO codes)
  if (/^[A-Z0-9_\-]{4,}$/.test(trimmed)) return text;
  // Skip emails and URLs
  if (/^\S+@\S+\.\S+$/.test(trimmed)) return text;
  if (/^https?:\/\//i.test(trimmed)) return text;

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
