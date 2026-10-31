/**
 * Build-time prerender for SEO. Runs after `vite build`.
 *
 * Reads every indexable route from src/lib/seo/routeRegistry.ts (which derives
 * them from the data files) and writes, into dist/:
 *   - {route}/index.html  per-route title, description, canonical, Open Graph,
 *                         JSON-LD and indexable body copy (inside #root, replaced by the app)
 *   - sitemap.xml         every indexable route, real lastmod dates only
 *   - llms.txt            an index of the site for AI assistants
 *   - md/{route}.md       a Markdown mirror of every route
 *
 * New pages need no manual SEO work: add the record to its data file.
 * `node scripts/generate-static-html.js --sync-public` also refreshes the
 * committed copies of sitemap.xml, llms.txt and md/ in public/.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { loadRegistry } from './seo/load-registry.mjs';
import { routeChunkMap, chunksForPath, chunksFor, compactChunkMap } from './seo/route-chunks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const PUBLIC_DIR = path.join(ROOT, 'public');

const HEAD_START = '<!--seo:head-->';
const HEAD_END = '<!--/seo:head-->';

const mdPathFor = routePath => (routePath === '/' ? '/md/index.md' : `/md${routePath}.md`);

function headTags(route, R) {
  const url = R.canonicalUrl(route.path);
  const e = R.escapeHtml;
  const og = R.ogImageFor(route.path);
  const tags = [
    `<title>${e(route.title)}</title>`,
    `<meta name="description" content="${e(route.description)}" data-rh="true" />`,
    `<link rel="canonical" href="${url}" data-rh="true" />`,
    ...(R.hreflangFor(route.path).length
      ? R.hreflangFor(route.path).map(a => `<link rel="alternate" hreflang="${a.hreflang}" href="${R.canonicalUrl(a.path)}" data-rh="true" />`)
      : [`<link rel="alternate" hreflang="x-default" href="${url}" data-rh="true" />`]),
    `<link rel="alternate" type="text/markdown" href="${R.SITE_URL}${mdPathFor(route.path)}" />`,
    `<meta property="og:type" content="${route.ogType ?? (route.section === 'guide' ? 'article' : 'website')}"data-rh="true" />`,
    `<meta property="og:site_name" content="Senseible" data-rh="true" />`,
    `<meta property="og:url" content="${url}" data-rh="true" />`,
    `<meta property="og:title" content="${e(route.title)}" data-rh="true" />`,
    `<meta property="og:description" content="${e(route.description)}" data-rh="true" />`,
    `<meta property="og:image" content="${og.url}" data-rh="true" />`,
    `<meta property="og:image:type" content="image/jpeg" data-rh="true" />`,
    `<meta property="og:image:width" content="${R.OG_IMAGE_WIDTH}" data-rh="true" />`,
    `<meta property="og:image:height" content="${R.OG_IMAGE_HEIGHT}" data-rh="true" />`,
    `<meta property="og:image:alt" content="${e(og.alt)}" data-rh="true" />`,
    `<meta property="og:locale" content="${route.lang === 'de' ? 'de_DE' : route.lang === 'hi' ? 'hi_IN' : 'en_IN'}" data-rh="true" />`,
    `<meta name="twitter:card" content="summary_large_image" data-rh="true" />`,
    `<meta name="twitter:site" content="@senseible_earth" data-rh="true" />`,
    `<meta name="twitter:title" content="${e(route.title)}" data-rh="true" />`,
    `<meta name="twitter:description" content="${e(route.description)}" data-rh="true" />`,
    `<meta name="twitter:image" content="${og.url}" data-rh="true" />`,
    `<meta name="twitter:image:alt" content="${e(og.alt)}" data-rh="true" />`,
  ];
  // JSON-LD is marked as Helmet-managed so client-side schema replaces it
  // after hydration instead of duplicating it. "<" is escaped so content can
  // never close the script element.
  for (const ld of route.jsonLd) {
    tags.push(`<script type="application/ld+json" data-rh="true">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('\n    ');
}

// Pillar hubs linked from every prerendered page, so crawlers that do not run
// JavaScript reach each topic hub in one hop.
const PILLARS = [
  ['/', 'Senseible'], ['/carbon-accounting', 'Carbon accounting'], ['/esg-reporting', 'ESG reporting'], ['/cbam-calculator', 'CBAM'],
  ['/enterprise', 'Supplier emissions and Scope 3'], ['/climate-finance', 'Climate finance'], ['/carbon-credits', 'Carbon credits'],
  ['/emission-factors', 'Emission factors'], ['/industries', 'Industries'], ['/calculators', 'Calculators'], ['/climate-intelligence', 'Guides'],
  ['/answers', 'Answers'], ['/pricing', 'Pricing'], ['/contact', 'Contact'],
];

function bodyHtml(route, R) {
  const crumbs = route.breadcrumbs
    .map(c => `<a href="${R.canonicalUrl(c.path)}">${R.escapeHtml(c.name)}</a>`)
    .join(' › ');
  // Rendered inside #root: crawlers and visitors without JavaScript read it,
  // visitors on slow networks see it after 1.2 s (index.html .ssr-shell), and
  // the app replaces it as soon as it starts.
  return `<main class="ssr-shell">
<a class="ssr-brand" href="${R.SITE_URL}/">Senseible</a>
<nav aria-label="Breadcrumb">${crumbs}</nav>
<h1>${R.escapeHtml(route.h1)}</h1>
${R.blocksToHtml(route.blocks)}
<hr/><nav aria-label="Topics"><p>${PILLARS.map(([p, n]) => `<a href="${R.SITE_URL}${p}">${n}</a>`).join(' · ')}</p></nav>
</main>`;
}

// The page's own code chunks, fetched in parallel with the main bundle.
const preloadTags = chunks => chunks.map(f => `<link rel="modulepreload" crossorigin href="${f}">`).join('\n    ');

function withPreloads(html, chunks) {
  if (!chunks.length) return html;
  if (!html.includes('</head>')) throw new Error('index.html is missing </head>');
  return html.replace('</head>', `  ${preloadTags(chunks)}\n  </head>`);
}

// An answer library page carries its own data (written to dist/answer-data by
// scripts/seo/build-answer-library.mjs), so the app shows it at once without
// fetching anything. "<" is escaped so the JSON can never close the script tag.
function answerDataTag(route) {
  const m = route.path.match(/^\/answers\/([a-z0-9-]+)$/);
  if (!m) return '';
  const file = path.join(DIST_DIR, 'answer-data', `${m[1]}.json`);
  if (!fs.existsSync(file)) return '';
  const json = fs.readFileSync(file, 'utf-8').replace(/</g, '\\u003c');
  return `<script type="application/json" id="answer-data">${json}</script>`;
}

function renderPage(template, route, R, chunks = []) {
  const start = template.indexOf(HEAD_START);
  const end = template.indexOf(HEAD_END);
  if (start === -1 || end === -1) throw new Error('index.html is missing the <!--seo:head--> markers');
  let html = template.slice(0, start + HEAD_START.length) + '\n    ' + headTags(route, R) + '\n    ' + template.slice(end);
  if (!html.includes('<div id="root"></div>')) throw new Error('index.html is missing <div id="root"></div>');
  if (route.lang) html = html.replace('<html lang="en">', `<html lang="${route.lang}">`);
  html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml(route, R)}</div>${answerDataTag(route)}`);
  return withPreloads(html, chunks);
}

// Signed-in and transactional routes are not prerendered for search, but a
// direct visit should still fetch the page's code at once, and should not be
// served the home page's head by the SPA fallback.
function renderAppShell(template, chunks) {
  const start = template.indexOf(HEAD_START);
  const end = template.indexOf(HEAD_END);
  const head = '<title>Senseible</title>\n    <meta name="robots" content="noindex, nofollow" data-rh="true" />';
  return withPreloads(template.slice(0, start + HEAD_START.length) + '\n    ' + head + '\n    ' + template.slice(end), chunks);
}

// Real dates only: a route without its own date takes the last commit date of
// the data file it is built from. Without git history (e.g. a shallow clone
// that lacks the file's commit) the route keeps no lastmod, as before.
const LASTMOD_SOURCES = [
  ['/answers/', 'src/data/answers.ts'],
  ['/vs/', 'src/data/competitorData.ts'],
  ['/help', 'supabase/functions/_shared/helpArticles.ts'],
  ['/solutions/', 'src/data/solutionsData.ts'],
  ['/industries', 'src/data/industriesData.ts'],
  ['/emission-factors', 'src/data/factorLibrary.ts'],
  ['/templates', 'src/data/templates.ts'],
  ['/cbam-cost', 'src/data/cbamSectorCosts.ts'],
];
const gitDates = new Map();
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
// In a shallow clone the oldest fetched commit shows every file as changed,
// so a date from that commit is not the file's real date and is skipped.
let shallowRoots = null;
function shallowCommits() {
  if (shallowRoots) return shallowRoots;
  try { shallowRoots = new Set(fs.readFileSync(path.resolve(ROOT, git(['rev-parse', '--git-path', 'shallow'])), 'utf8').split('\n').filter(Boolean)); }
  catch { shallowRoots = new Set(); }
  return shallowRoots;
}
function gitDate(file) {
  if (!gitDates.has(file)) {
    let date = null;
    try {
      const [hash, d] = git(['log', '-1', '--format=%H %cs', '--', file]).split(' ');
      if (/^\d{4}-\d{2}-\d{2}$/.test(d ?? '') && !shallowCommits().has(hash)) date = d;
    } catch { /* no git history */ }
    gitDates.set(file, date);
  }
  return gitDates.get(file);
}
function withSourceDates(routes) {
  for (const r of routes) {
    if (r.lastmod) continue;
    const src = LASTMOD_SOURCES.find(([prefix]) => r.path === prefix.replace(/\/$/, '') || r.path.startsWith(prefix));
    const d = src && gitDate(src[1]);
    if (d) r.lastmod = d;
  }
  return routes;
}

function sitemapXml(routes, R) {
  const urls = routes
    .map(r => {
      const lastmod = r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : '';
      return `  <url><loc>${R.canonicalUrl(r.path)}</loc>${lastmod}<changefreq>${r.changefreq}</changefreq><priority>${r.priority.toFixed(1)}</priority></url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const SECTION_TITLES = {
  core: 'Core pages',
  tool: 'Free tools',
  guide: 'Guides',
  solution: 'Solutions by sector and country',
  compare: 'Comparisons',
  industry: 'Industries',
  legal: 'Legal',
};

function llmsTxt(routes, R) {
  const lines = [
    '# Senseible',
    '',
    '> Senseible (senseible.earth) turns business documents such as invoices, energy bills, fuel slips and freight records into Scope 1, 2 and 3 emission records that show the emission factor and source for every line. It serves MSMEs and exporters, enterprise buyers and EU importers that need supplier emissions data, and lenders. Operated from Gurugram, India. Contact: impact@senseible.earth. Senseible is not related to Sensibull, an options-trading platform.',
    '',
    `Every page below has a Markdown mirror: replace the path with /md/{path}.md (the homepage is /md/index.md).`,
  ];
  for (const [section, title] of Object.entries(SECTION_TITLES)) {
    const items = routes.filter(r => r.section === section);
    if (!items.length) continue;
    lines.push('', `## ${title}`, '');
    for (const r of items) lines.push(`- [${r.h1}](${R.canonicalUrl(r.path)}): ${r.description}`);
  }
  return lines.join('\n') + '\n';
}

function markdownMirror(route, R) {
  return [
    `# ${route.h1}`,
    '',
    `Canonical: ${R.canonicalUrl(route.path)}`,
    '',
    R.blocksToMarkdown(route.blocks),
    '',
  ].join('\n');
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeSupportFiles(baseDir, routes, R) {
  writeFile(path.join(baseDir, 'sitemap.xml'), sitemapXml(routes, R));
  writeFile(path.join(baseDir, 'llms.txt'), llmsTxt(routes, R));
  fs.rmSync(path.join(baseDir, 'md'), { recursive: true, force: true });
  for (const r of routes) writeFile(path.join(baseDir, mdPathFor(r.path)), markdownMirror(r, R));
}

async function main() {
  const R = await loadRegistry();
  const routes = withSourceDates(R.getSeoRoutes());

  const seen = new Set();
  for (const r of routes) {
    if (seen.has(r.path)) throw new Error(`Duplicate route in registry: ${r.path}`);
    seen.add(r.path);
  }

  if (process.argv.includes('--sync-public')) {
    writeSupportFiles(PUBLIC_DIR, routes, R);
    console.log(`✅ Synced public/ sitemap.xml, llms.txt and ${routes.length} Markdown mirrors`);
    return;
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error('dist/index.html not found. Run `vite build` first.');
  const template = fs.readFileSync(indexPath, 'utf-8');

  // Each route is written as both {route}.html and {route}/index.html, so hosts
  // that resolve clean URLs either way serve the prerendered page for /route
  // without a trailing-slash redirect away from the canonical URL.
  const manifestPath = path.join(DIST_DIR, '.vite', 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('dist/.vite/manifest.json not found. Enable build.manifest in vite.config.ts.');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const appSource = fs.readFileSync(path.join(ROOT, 'src', 'App.tsx'), 'utf-8');
  const serviceSlugs = [...fs.readFileSync(path.join(ROOT, 'src', 'data', 'services', 'nav.ts'), 'utf-8').matchAll(/slug: "([^"]+)"/g)].map(m => m[1]);
  const chunkMap = routeChunkMap(appSource, manifest, serviceSlugs);
  const articleChunks = p => {
    const m = p.match(/^\/climate-intelligence\/([^/]+)$/);
    return m ? chunksFor(manifest, `src/data/articleBodies/${m[1]}`) : [];
  };
  const routeChunks = p => [...new Set([...chunksForPath(chunkMap, p), ...articleChunks(p)])];

  for (const r of routes) {
    const html = renderPage(template, r, R, routeChunks(r.path));
    if (r.path === '/') { writeFile(indexPath, html); continue; }
    writeFile(path.join(DIST_DIR, `${r.path}.html`), html);
    writeFile(path.join(DIST_DIR, r.path, 'index.html'), html);
  }
  writeSupportFiles(DIST_DIR, routes, R);
  // Path and title of every page, for the 404 page's "you meant" match.
  writeFile(path.join(DIST_DIR, 'route-index.json'), JSON.stringify(routes.map(r => ({ p: r.path, t: r.title.replace(/ \| Senseible$/, '') }))));

  // App routes without params that are not prerendered for search.
  const seo = new Set(routes.map(r => r.path));
  let shells = 0;
  for (const [pattern, chunks] of Object.entries(chunkMap)) {
    if (seo.has(pattern) || pattern.includes(':') || pattern === '*') continue;
    const html = renderAppShell(template, chunks);
    writeFile(path.join(DIST_DIR, `${pattern}.html`), html);
    writeFile(path.join(DIST_DIR, pattern, 'index.html'), html);
    shells++;
  }
  // Unknown addresses: the host serves 404.html with a real 404 status (no
  // catch-all rewrite), so search engines drop them, while the app still boots
  // and shows its own not-found page. Only token routes are rewritten in vercel.json.
  writeFile(path.join(DIST_DIR, '404.html'), renderAppShell(template, chunkMap['*'] || []).replace('<title>Senseible</title>', '<title>Page not found | Senseible</title>'));
  // In-app prefetching reads the same map (src/lib/routePrefetch.ts).
  writeFile(path.join(DIST_DIR, 'route-chunks.json'), JSON.stringify(compactChunkMap(chunkMap)));
  fs.rmSync(path.join(DIST_DIR, '.vite'), { recursive: true, force: true });
  console.log(`⚡ Page chunks preloaded on ${routes.length} prerendered routes and ${shells} app routes`);

  // Retired URLs: instant meta refresh plus a canonical to the new URL, which
  // search engines treat as a permanent redirect on hosts without 301 support.
  const redirects = R.getRedirects();
  for (const rd of redirects) {
    const target = `${R.SITE_URL}${rd.to}`;
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Moved | Senseible</title>
<meta name="robots" content="noindex, follow" />
<link rel="canonical" href="${R.canonicalUrl(rd.to.split('#')[0])}" />
<meta http-equiv="refresh" content="0; url=${target}" />
<script src="/moved.js" data-to="${rd.to.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></script>
</head><body><p>This page has moved to <a href="${target}">${target}</a>.</p></body></html>
`;
    writeFile(path.join(DIST_DIR, `${rd.from}.html`), html);
    writeFile(path.join(DIST_DIR, rd.from, 'index.html'), html);
  }
  console.log(`↪️  ${redirects.length} retired URLs redirect to their new pages`);

  const bySection = routes.reduce((acc, r) => ({ ...acc, [r.section]: (acc[r.section] || 0) + 1 }), {});
  console.log(`✅ Prerendered ${routes.length} routes, sitemap.xml, llms.txt and Markdown mirrors`);
  console.log(`📊 ${Object.entries(bySection).map(([k, v]) => `${v} ${k}`).join(', ')}`);
}

main().catch(err => {
  console.error('❌ SEO prerender failed:', err.message);
  process.exit(1);
});
