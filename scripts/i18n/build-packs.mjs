#!/usr/bin/env node
// Builds the language packs the site loads on public pages
// (src/lib/i18n/packs.ts), so switching language does not wait on the
// translate-batch function.
//
//   node scripts/i18n/build-packs.mjs collect            render the live site, save its strings
//   node scripts/i18n/build-packs.mjs translate [--commit] [--locales hi,bn]
//   node scripts/i18n/build-packs.mjs write              rebuild pack files from what exists
//   node scripts/i18n/build-packs.mjs report             coverage per locale
//   node scripts/i18n/build-packs.mjs all [--commit]     collect, then translate
//
// Behind an HTTPS proxy, run with NODE_USE_ENV_PROXY=1 so Node's fetch uses it.
//
// collect: every sitemap route on https://senseible.earth that is not
// sensitive (src/lib/i18n/sensitiveRoutes.ts), not under /answers/ (the /answers
// hub stays), /hi/ or /de/. Each page is rendered with Playwright, scrolled and
// given ~3.5 s, then its strings are read exactly as domTranslator.ts sees them:
// text nodes plus placeholder, title, aria-label and alt, after the same skip
// rules and the long-text sentence split (src/lib/i18n/textRules.ts).
//
// translate: sends missing strings to the live translate-batch function with
// the publishable key from .env, 100 strings a call, 4 calls at a time. Cache
// hits are free; new strings count toward the function's daily limit. When a
// call comes back with nothing translated (the limit, or the AI unavailable),
// the run stops, writes what it has and reports coverage. Resume-safe: strings
// already in a pack are never asked again, and collected routes are kept in
// scripts/i18n/data/sources.json.
//
// Output: public/i18n/packs/<locale>/<route-key>.json and _common.json (strings
// seen on 3 or more routes). Only public page text is involved; no visitor
// data is read or sent.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { cacheKeysFor, routeKey } from '../../src/lib/i18n/textRules.ts';
import { isSensitiveRoute } from '../../src/lib/i18n/sensitiveRoutes.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const SITE = 'https://senseible.earth';
const SOURCES = join(ROOT, 'scripts/i18n/data/sources.json');
const PACKS = join(ROOT, 'public/i18n/packs');
const COMMON_MIN_ROUTES = 3;
const BATCH = 100;
const PARALLEL = 4;
const PAGE_WAIT_MS = 3500;
export const LOCALE_ORDER = [
  'hi', 'bn', 'ta', 'mr', 'te', 'gu', 'pa', 'ml', 'kn', 'ur',
  'id', 'tl', 'vi', 'th', 'zh', 'ar', 'es', 'pt',
];

const args = process.argv.slice(2);
const cmd = args[0] ?? 'report';
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

const readJson = (p, fallback) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } };
const writeJson = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(data, null, 0) + '\n'); };
const sortObj = (o) => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));

// ---------- routes ----------

export function packRoutes(paths) {
  const keep = new Set();
  for (const raw of paths) {
    const p = (raw.replace(/\/+$/, '') || '/');
    if (isSensitiveRoute(p)) continue;
    if (p.startsWith('/answers/') || p.startsWith('/hi/') || p === '/hi' || p.startsWith('/de/') || p === '/de') continue;
    keep.add(p);
  }
  return [...keep].sort();
}

async function sitemapPaths() {
  const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1].trim()).pathname);
}

// ---------- collect ----------

// Runs in the page. Mirrors shouldSkip/processTextNode/processAttr in
// src/lib/i18n/domTranslator.ts; string-level rules are applied in Node.
function readPage() {
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SVG', 'PATH', 'NOSCRIPT']);
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  const skip = (el) => {
    for (let n = el; n; n = n.parentElement) {
      if (SKIP_TAGS.has(n.tagName)) return true;
      if (n.getAttribute('data-no-translate') !== null) return true;
      if (n.getAttribute('contenteditable') === 'true') return true;
      const cls = n.getAttribute('class') || '';
      if (/\bfont-mono\b/.test(cls)) return true;
      if (/\b(hash|sha|gstin|hsn|code|identifier)\b/i.test(cls)) return true;
      if (['TIME', 'KBD', 'SAMP', 'VAR'].includes(n.tagName)) return true;
    }
    return false;
  };
  const texts = [];
  const attrs = [];
  const all = document.body.querySelectorAll('*');
  for (const el of all) {
    if (skip(el)) continue;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && /\p{L}/u.test(v)) attrs.push(v);
    }
    for (const c of el.childNodes) {
      if (c.nodeType !== 3) continue;
      const t = (c.nodeValue || '').trim();
      if (t && /\p{L}/u.test(t)) texts.push(t);
    }
  }
  return { texts, attrs };
}

export function stringsFrom({ texts, attrs }) {
  const out = new Set();
  for (const s of [...texts, ...attrs]) for (const k of cacheKeysFor(s)) out.add(k);
  return [...out];
}

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  return import('/opt/node22/lib/node_modules/playwright/index.mjs');
}

async function collect() {
  const routes = packRoutes(await sitemapPaths());
  const data = readJson(SOURCES, { site: SITE, routes: {} });
  const todo = flag('recollect') ? routes : routes.filter(p => !data.routes[routeKey(p)]);
  console.log(`routes: ${routes.length}, to collect: ${todo.length}`);
  if (todo.length === 0) return data;
  const { chromium } = await loadPlaywright();
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  await ctx.addInitScript(() => { try { localStorage.setItem('senseible_locale', 'en'); } catch {} });
  let i = 0;
  const worker = async () => {
    const page = await ctx.newPage();
    while (i < todo.length) {
      const path = todo[i++];
      try {
        const res = await page.goto(SITE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        // Scroll through the page during the wait so on-view sections render.
        const steps = 7;
        for (let s = 1; s <= steps; s++) {
          await page.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), s / steps);
          await page.waitForTimeout(PAGE_WAIT_MS / steps);
        }
        const finalPath = new URL(page.url()).pathname.replace(/\/+$/, '') || '/';
        const strings = stringsFrom(await page.evaluate(readPage));
        data.routes[routeKey(path)] = { path, status: res?.status() ?? 0, finalPath, strings };
        console.log(`  ${path} ${strings.length}`);
        writeJson(SOURCES, data);
      } catch (e) {
        console.log(`  ${path} failed: ${e.message.split('\n')[0]}`);
      }
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  await browser.close();
  writeJson(SOURCES, data);
  return data;
}

// ---------- packs on disk ----------

function existingTranslations(locale) {
  const dir = join(PACKS, locale);
  const map = {};
  if (!existsSync(dir)) return map;
  for (const f of readdirSync(dir)) if (f.endsWith('.json')) Object.assign(map, readJson(join(dir, f), {}));
  return map;
}

export function splitCommon(routes) {
  const seen = new Map();
  for (const r of Object.values(routes)) for (const s of new Set(r.strings)) seen.set(s, (seen.get(s) ?? 0) + 1);
  return new Set([...seen].filter(([, n]) => n >= COMMON_MIN_ROUTES).map(([s]) => s));
}

export function buildPacks(routes, translations) {
  const common = splitCommon(routes);
  const files = { _common: {} };
  for (const s of common) if (translations[s]) files._common[s] = translations[s];
  for (const [key, r] of Object.entries(routes)) {
    const pack = {};
    for (const s of r.strings) if (!common.has(s) && translations[s]) pack[s] = translations[s];
    files[key] = pack;
  }
  return files;
}

function writePacks(locale, data, translations) {
  const dir = join(PACKS, locale);
  rmSync(dir, { recursive: true, force: true });
  const files = buildPacks(data.routes, translations);
  for (const [key, pack] of Object.entries(files)) {
    if (Object.keys(pack).length === 0) continue;
    writeJson(join(dir, `${key}.json`), sortObj(pack));
  }
}

function allStrings(data) {
  const set = new Set();
  for (const r of Object.values(data.routes)) for (const s of r.strings) set.add(s);
  return [...set];
}

function coverage(data, locale) {
  const all = allStrings(data);
  const have = existingTranslations(locale);
  const done = all.filter(s => have[s]).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 1000) / 10 : 0 };
}

// ---------- translate ----------

function env() {
  const vars = {};
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) vars[m[1]] = m[2];
  }
  const url = vars.VITE_SUPABASE_URL || vars.SUPABASE_URL;
  const key = vars.VITE_SUPABASE_PUBLISHABLE_KEY || vars.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('.env needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  return { endpoint: `${url.replace(/\/+$/, '')}/functions/v1/translate-batch`, key };
}

async function callBatch(api, locale, strings) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(api.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: api.key, Authorization: `Bearer ${api.key}` },
        body: JSON.stringify({ locale, strings }),
        signal: AbortSignal.timeout(180000),
      });
      if (res.ok) return (await res.json())?.translations ?? {};
      if (res.status < 500 && res.status !== 429) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (attempt === 2) throw e;
    }
    await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
  }
  return {};
}

const hasWords = (s) => /[A-Za-z]{3,}/.test(s);

async function translateLocale(api, data, locale) {
  const have = existingTranslations(locale);
  const missing = allStrings(data).filter(s => !have[s]);
  const batches = [];
  for (let i = 0; i < missing.length; i += BATCH) batches.push(missing.slice(i, i + BATCH));
  console.log(`${locale}: ${missing.length} missing in ${batches.length} calls`);
  let next = 0;
  let stopped = null;
  let lowYield = 0;
  let calls = 0;
  let errors = 0;
  const worker = async () => {
    while (!stopped && next < batches.length) {
      const batch = batches[next++];
      let map;
      try { map = await callBatch(api, locale, batch); errors = 0; } catch (e) {
        // A slow call is skipped (asked again on the next run); repeated failures stop the run.
        if (++errors >= 3) stopped = `error: ${e.message}`;
        continue;
      }
      calls++;
      let changed = 0;
      for (const s of batch) {
        const t = map[s];
        if (typeof t === 'string' && t.trim() && t !== s) { have[s] = t; changed++; }
      }
      const wordy = batch.filter(hasWords).length;
      // Nothing came back translated: the daily limit (or the AI is down).
      if (wordy >= 10 && changed === 0) stopped = 'daily limit (a call returned no translations)';
      // Mostly untranslated three times running: misses are being refused.
      lowYield = wordy >= 10 && changed < wordy * 0.2 ? lowYield + 1 : 0;
      if (lowYield >= 3) stopped = 'daily limit (calls returning mostly English)';
      if (calls % 10 === 0) { writePacks(locale, data, have); process.stdout.write(`  ${locale} ${calls}/${batches.length}\n`); }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  writePacks(locale, data, have);
  return stopped;
}

function commitLocale(locale, cov) {
  try {
    execFileSync('git', ['add', join(PACKS, locale), SOURCES], { cwd: ROOT, stdio: 'ignore' });
    execFileSync('git', ['commit', '-q', '-m', `i18n packs: ${locale} (${cov.done}/${cov.total} strings)`], { cwd: ROOT, stdio: 'ignore' });
    console.log(`  committed ${locale}`);
  } catch {
    console.log(`  nothing to commit for ${locale}`);
  }
}

async function translate(data) {
  const api = env();
  const only = opt('locales')?.split(',').filter(Boolean);
  const locales = only ?? LOCALE_ORDER;
  let stopped = null;
  for (const locale of locales) {
    stopped = await translateLocale(api, data, locale);
    const cov = coverage(data, locale);
    console.log(`${locale}: ${cov.done}/${cov.total} (${cov.pct}%)`);
    if (flag('commit')) commitLocale(locale, cov);
    if (stopped) { console.log(`stopped: ${stopped}`); break; }
  }
  report(data);
  if (stopped) process.exitCode = 2;
}

function report(data) {
  console.log(`routes: ${Object.keys(data.routes).length}, strings: ${allStrings(data).length}, common: ${splitCommon(data.routes).size}`);
  for (const locale of LOCALE_ORDER) {
    const c = coverage(data, locale);
    if (c.done) console.log(`  ${locale}: ${c.done}/${c.total} (${c.pct}%)`);
  }
}

// ---------- main ----------

if (import.meta.url === `file://${process.argv[1]}`) {
  const run = async () => {
    if (cmd === 'collect') return void report(await collect());
    if (cmd === 'all') return translate(await collect());
    const data = readJson(SOURCES, null);
    if (!data) throw new Error('No collected strings yet. Run: node scripts/i18n/build-packs.mjs collect');
    if (cmd === 'translate') return translate(data);
    if (cmd === 'write') { for (const l of LOCALE_ORDER) writePacks(l, data, existingTranslations(l)); return report(data); }
    return report(data);
  };
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
