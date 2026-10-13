/**
 * Renders the link-preview images (1200x630 JPEG) in public/og/.
 * Run by hand after changing a preview: `node scripts/og/render-og.mjs`.
 * Uses the pre-installed Chromium; the images are committed, so the build
 * does not depend on this script.
 *
 * Each preview: one action line, one supporting line, one doodle that shows
 * what the page lets you do. No figures or claims beyond the page's own copy.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { OG_PAGES } from './pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/og');
const require = createRequire(import.meta.url);
const font = fs.readFileSync(path.join(ROOT, 'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2')).toString('base64');

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const INK = '#1F513A';      // --primary
const SUN = '#F59E0B';      // --warning

const html = (p) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: SG; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 300 700; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; font-family: SG, sans-serif; background: #FAFAF7; color: #141414; position: relative; overflow: hidden; }
.dots { position: absolute; inset: 0; background-image: radial-gradient(#1F513A22 1.4px, transparent 1.4px); background-size: 28px 28px; mask-image: linear-gradient(90deg, transparent 45%, #000 80%); }
.copy { position: absolute; left: 72px; top: 64px; width: 640px; height: 502px; display: flex; flex-direction: column; }
.brand { font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
.eyebrow { margin-top: 64px; font-size: 20px; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; color: ${INK}; }
h1 { margin-top: 16px; font-size: ${p.size ?? 64}px; line-height: 1.05; font-weight: 600; letter-spacing: -1.5px; }
.sub { margin-top: 22px; font-size: 26px; line-height: 1.35; color: #5b5b5b; }
.cta { margin-top: auto; display: inline-flex; align-self: flex-start; align-items: center; gap: 12px; background: ${INK}; color: #fff; font-size: 24px; font-weight: 500; padding: 14px 26px; border-radius: 999px; }
.url { position: absolute; right: 64px; bottom: 54px; font-size: 20px; color: #7a7a7a; }
.art { position: absolute; right: 56px; top: 80px; width: 420px; height: 420px; }
.art * { fill: none; stroke: ${INK}; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
.art .sun { stroke: ${SUN}; }
.art .fill { fill: ${INK}; stroke: none; }
.art .sunfill { fill: ${SUN}; stroke: none; }
.art .soft { stroke-opacity: .35; stroke-dasharray: 2 14; }
</style></head><body>
<div class="dots"></div>
<div class="copy">
  <div class="brand">senseible</div>
  <div class="eyebrow">${p.eyebrow}</div>
  <h1>${p.title}</h1>
  <div class="sub">${p.sub}</div>
  <div class="cta">${p.cta} <svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
</div>
<svg class="art" viewBox="0 0 400 400">${p.art}</svg>
<div class="url">senseible.earth</div>
</body></html>`;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const p of OG_PAGES) {
  await page.setContent(html(p), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(OUT, `${p.slug}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  console.log(`${p.slug}.jpg  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}
await browser.close();
