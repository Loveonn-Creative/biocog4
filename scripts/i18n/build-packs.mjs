#!/usr/bin/env node
// Builds static translation packs for public, non-sensitive pages.
//
//   npm run build                       # once, so dist/ exists
//   node scripts/i18n/build-packs.mjs   # collect + translate (resume-safe)
//
// Options:
//   --base <url>        render this site instead of serving dist/ locally
//                       (e.g. https://senseible.earth)
//   --locales hi,bn     only these locales (default: all, India first)
//   --routes /a,/b      only these routes (default: every pack route in the sitemap)
//   --recollect         render the pages again even if strings are cached
//   --collect-only      stop after collecting strings
//   --concurrency 4     parallel translate-batch calls (max 4)
//
// 1. Renders each route (desktop and 390px, reduced motion, English) with
//    Playwright and collects the strings the DOM translator would look up,
//    using the same code (src/lib/i18n/collect.ts, bundled with esbuild).
// 2. Sends strings not yet in a pack to the live translate-batch function,
//    100 per call, at most 4 calls in parallel. Results land in the durable
//    translation_cache table as well, so every call also warms the runtime path.
// 3. Writes public/i18n/packs/<locale>/<route-key>.json and _common.json
//    (strings on 3+ routes), and src/lib/i18n/packManifest.json.
// Stops cleanly when the daily translation limit is reached: what is done is
// written, and the next run carries on from there.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PACK_DIR = path.join(ROOT, "public/i18n/packs");
const MANIFEST = path.join(ROOT, "src/lib/i18n/packManifest.json");
const CACHE_DIR = path.join(ROOT, "node_modules/.cache/i18n-packs");
const STRINGS_CACHE = path.join(CACHE_DIR, "strings.json");

const LOCALE_ORDER = ["hi", "bn", "ta", "mr", "te", "gu", "pa", "ml", "kn", "ur", "id", "tl", "vi", "th", "zh", "ar", "es", "pt"];
// Locales with a reviewed static bundle (LanguageProvider loaders). The others
// use en.json as their bundle, so the DOM translator skips en.json values there.
const BUNDLED = new Set(["hi", "bn", "ta", "mr", "id", "ur", "tl", "vi", "th", "es"]);
const BATCH = 100;
const COMMON_MIN_ROUTES = 3;
const MAX_STRING_CHARS = 600; // translate-batch drops longer strings
const PERSONAL = /[^\s@]+@[^\s@]+\.[a-z]{2,}|\d[\d\s-]{8,}\d/i; // translate-batch drops these
const VIEWPORTS = [{ width: 1366, height: 900 }, { width: 390, height: 844 }];

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const onlyLocales = opt("locales", "") ? opt("locales").split(",") : LOCALE_ORDER;
const onlyRoutes = opt("routes", "") ? opt("routes").split(",") : null;
const concurrency = Math.min(4, Math.max(1, Number(opt("concurrency", "4")) || 4));

// ---------- helpers ----------
function readEnv() {
  const env = { ...process.env };
  for (const file of [".env", ".env.local"]) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 0)}\n`);
  fs.renameSync(tmp, file);
}

function readJson(file, dflt) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return dflt; }
}

function sortObject(obj) {
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

async function bundle(contents, format) {
  const out = await esbuild.build({
    stdin: { contents, resolveDir: ROOT, loader: "ts" },
    bundle: true, format, platform: format === "iife" ? "browser" : "node",
    write: false, logLevel: "silent", target: "es2020",
  });
  return out.outputFiles[0].text;
}

async function loadRouteHelpers() {
  const code = await bundle(
    `export { isPackRoute, routeKey } from "./src/lib/i18n/packRoutes.ts";`, "esm");
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, "packRoutes.mjs");
  fs.writeFileSync(file, code);
  return import(`${file}?t=${Date.now()}`);
}

async function loadPlaywright() {
  try { return (await import("playwright")).chromium; } catch {}
  return (await import("/opt/node22/lib/node_modules/playwright/index.mjs")).chromium;
}

function sitemapRoutes(isPackRoute) {
  const file = [path.join(ROOT, "dist/sitemap.xml"), path.join(ROOT, "public/sitemap.xml")].find(fs.existsSync);
  const xml = fs.readFileSync(file, "utf8");
  const routes = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname.replace(/\/+$/, "") || "/");
  return [...new Set(routes)].filter(isPackRoute);
}

async function startPreview() {
  const port = 4319;
  const base = `http://127.0.0.1:${port}`;
  if (!fs.existsSync(path.join(ROOT, "dist/index.html"))) throw new Error("dist/ is missing: run npm run build first");
  const proc = spawn(path.join(ROOT, "node_modules/.bin/vite"), ["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: ROOT, stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) return { base, stop: () => proc.kill() }; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill();
  throw new Error("vite preview did not start");
}

// ---------- 1. collect ----------
async function collect(routes, base) {
  const collector = await bundle(
    `import { collectStrings } from "./src/lib/i18n/collect.ts"; window.__i18nCollect = collectStrings;`, "iife");
  const chromium = await loadPlaywright();
  // Honour an outbound proxy when one is set; the local preview stays direct.
  process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK ??= "1";
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } : undefined;
  const browser = await chromium.launch({ proxy });
  const out = {};
  try {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: vp, reducedMotion: "reduce" });
      await ctx.addInitScript(() => {
        try { localStorage.setItem("senseible_locale", "en"); } catch {}
      });
      const page = await ctx.newPage();
      for (const route of routes) {
        try {
          await page.goto(base + route, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
          // Scroll through the page so lazy sections mount.
          await page.evaluate(async () => {
            for (let i = 0; i < 80; i++) {
              const before = window.scrollY;
              window.scrollBy(0, window.innerHeight * 0.9);
              await new Promise((r) => setTimeout(r, 120));
              if (window.scrollY === before) break;
            }
            window.scrollTo(0, 0);
          });
          await page.waitForTimeout(600);
          await page.addScriptTag({ content: collector });
          const strings = await page.evaluate(() => window.__i18nCollect(document.body));
          out[route] = [...new Set([...(out[route] ?? []), ...strings])];
          process.stdout.write(`  collected ${route} @${vp.width}: ${strings.length}\n`);
        } catch (err) {
          console.warn(`  skipped ${route} @${vp.width}: ${err.message}`);
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

// ---------- 2. translate ----------
class LimitReached extends Error {}

async function callTranslate(env, locale, strings) {
  const url = `${env.VITE_SUPABASE_URL}/functions/v1/translate-batch`;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ locale, strings }),
        signal: AbortSignal.timeout(90000),
      });
      if (res.status === 429) throw new LimitReached("translate-batch returned 429");
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.translations) return body.translations;
      if (res.status >= 400 && res.status < 500) throw new Error(`translate-batch ${res.status}: ${body.error ?? ""}`);
    } catch (err) {
      if (err instanceof LimitReached || attempt === 2) throw err;
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error("translate-batch failed");
}

function loadLocalePacks(locale) {
  const dir = path.join(PACK_DIR, locale);
  const have = new Map();
  if (!fs.existsSync(dir)) return have;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    for (const [k, v] of Object.entries(readJson(path.join(dir, f), {}))) have.set(k, v);
  }
  return have;
}

function writeLocalePacks(locale, have, byRoute, common, routeKey) {
  const dir = path.join(PACK_DIR, locale);
  const commonPack = {};
  for (const s of common) if (have.has(s)) commonPack[s] = have.get(s);
  if (Object.keys(commonPack).length) writeJsonAtomic(path.join(dir, "_common.json"), sortObject(commonPack));
  for (const [route, strings] of Object.entries(byRoute)) {
    const pack = {};
    for (const s of strings) if (!common.has(s) && have.has(s)) pack[s] = have.get(s);
    if (Object.keys(pack).length) writeJsonAtomic(path.join(dir, `${routeKey(route)}.json`), sortObject(pack));
  }
}

function writeManifest() {
  const locales = {};
  if (fs.existsSync(PACK_DIR)) {
    for (const locale of LOCALE_ORDER) {
      const dir = path.join(PACK_DIR, locale);
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
      if (!files.length) continue;
      const hash = crypto.createHash("sha1");
      for (const f of files) hash.update(f).update(fs.readFileSync(path.join(dir, f)));
      locales[locale] = {
        v: hash.digest("hex").slice(0, 10),
        common: files.includes("_common.json"),
        routes: files.filter((f) => f !== "_common.json").map((f) => f.replace(/\.json$/, "")),
      };
    }
  }
  writeJsonAtomic(MANIFEST, { locales });
}

async function translateLocale(env, locale, byRoute, common, routeKey, enValues) {
  const have = loadLocalePacks(locale);
  const sameFile = path.join(CACHE_DIR, `same-${locale}.json`);
  const same = new Set(readJson(sameFile, []));
  const skip = (s) => s.length > MAX_STRING_CHARS || PERSONAL.test(s) || (!BUNDLED.has(locale) && enValues.has(s));

  const ordered = [];
  const seen = new Set();
  const push = (s) => { if (!seen.has(s)) { seen.add(s); ordered.push(s); } };
  [...common].forEach(push);
  Object.values(byRoute).forEach((list) => list.forEach(push));
  const todo = ordered.filter((s) => !have.has(s) && !same.has(s) && !skip(s));

  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  console.log(`[${locale}] ${ordered.length} strings, ${have.size} in packs, ${todo.length} to translate in ${batches.length} calls`);

  let next = 0;
  let done = 0;
  let suspect = 0;
  let limit = null;
  const worker = async () => {
    while (!limit && next < batches.length) {
      const batch = batches[next++];
      let res;
      try {
        res = await callTranslate(env, locale, batch);
      } catch (err) {
        limit = err.message;
        break;
      }
      const identical = [];
      for (const s of batch) {
        const t = res[s];
        if (typeof t === "string" && t.trim() && t !== s) have.set(s, t);
        else identical.push(s);
      }
      // translate-batch answers misses with the English source once the daily
      // limit is reached. Two such batches in a row: stop for today.
      if (batch.length >= 10 && identical.length / batch.length >= 0.5) {
        if (++suspect >= 2) limit = "daily translation limit reached (misses came back in English)";
      } else {
        suspect = 0;
        identical.forEach((s) => same.add(s)); // genuinely the same in this language (names, codes)
      }
      done++;
      if (done % 8 === 0) {
        writeLocalePacks(locale, have, byRoute, common, routeKey);
        writeJsonAtomic(sameFile, [...same]);
        console.log(`[${locale}] ${done}/${batches.length} calls`);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  writeLocalePacks(locale, have, byRoute, common, routeKey);
  writeJsonAtomic(sameFile, [...same]);

  const isDone = (s) => have.has(s) || same.has(s) || skip(s);
  const completeRoutes = Object.entries(byRoute).filter(([, list]) => list.every(isDone)).map(([r]) => r);
  return { limit, completeRoutes, missing: ordered.filter((s) => !isDone(s)).length };
}

// ---------- main ----------
async function main() {
  const env = readEnv();
  const { isPackRoute, routeKey } = await loadRouteHelpers();
  let routes = onlyRoutes ?? sitemapRoutes(isPackRoute);
  routes = routes.filter(isPackRoute);
  console.log(`${routes.length} pack routes`);

  let byRoute = readJson(STRINGS_CACHE, null);
  const needCollect = flag("recollect") || !byRoute || routes.some((r) => !byRoute[r]);
  if (needCollect) {
    const preview = opt("base", "") ? null : await startPreview();
    const base = opt("base", "") || preview.base;
    try {
      const fresh = await collect(flag("recollect") || !byRoute ? routes : routes.filter((r) => !byRoute[r]), base);
      byRoute = { ...(flag("recollect") ? {} : byRoute ?? {}), ...fresh };
      writeJsonAtomic(STRINGS_CACHE, byRoute);
    } finally {
      preview?.stop();
    }
  }
  byRoute = Object.fromEntries(routes.filter((r) => byRoute[r]).map((r) => [r, byRoute[r]]));

  const counts = new Map();
  for (const list of Object.values(byRoute)) for (const s of new Set(list)) counts.set(s, (counts.get(s) ?? 0) + 1);
  const common = new Set([...counts].filter(([, n]) => n >= COMMON_MIN_ROUTES).sort((a, b) => b[1] - a[1]).map(([s]) => s));
  console.log(`${counts.size} unique strings, ${common.size} common`);
  if (flag("collect-only")) return;

  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing");
  const enValues = new Set(Object.values(readJson(path.join(ROOT, "src/lib/i18n/translations/en.json"), {})).map((v) => String(v)));

  const report = [];
  let stopReason = null;
  for (const locale of LOCALE_ORDER.filter((l) => onlyLocales.includes(l))) {
    const r = await translateLocale(env, locale, byRoute, common, routeKey, enValues);
    report.push({ locale, complete: r.completeRoutes.length, missing: r.missing });
    writeManifest();
    if (r.limit) { stopReason = r.limit; break; }
  }
  writeManifest();

  const total = Object.keys(byRoute).length;
  console.log("\nPack coverage (complete routes / total):");
  for (const r of report) console.log(`  ${r.locale}: ${r.complete}/${total}${r.missing ? `, ${r.missing} strings left` : ""}`);
  const fullLocales = report.filter((r) => r.complete === total).length;
  console.log(`${fullLocales} locale(s) complete across all ${total} routes.`);
  if (stopReason) console.log(`Stopped: ${stopReason}. Run again tomorrow to continue.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
