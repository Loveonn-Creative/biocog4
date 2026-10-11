/**
 * Build-time prerender for SEO. Runs after `vite build`.
 *
 * Reads every indexable route from src/lib/seo/routeRegistry.ts (which derives
 * them from the data files) and writes, into dist/:
 *   - {route}/index.html  per-route title, description, canonical, Open Graph,
 *                         JSON-LD and indexable body copy (inside <noscript>)
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
import { loadRegistry } from './seo/load-registry.mjs';

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
  const tags = [
    `<title>${e(route.title)}</title>`,
    `<meta name="description" content="${e(route.description)}" data-rh="true" />`,
    `<link rel="canonical" href="${url}" data-rh="true" />`,
    `<link rel="alternate" hreflang="x-default" href="${url}" data-rh="true" />`,
    `<link rel="alternate" type="text/markdown" href="${R.SITE_URL}${mdPathFor(route.path)}" />`,
    `<meta property="og:type" content="${route.section === 'guide' ? 'article' : 'website'}" data-rh="true" />`,
    `<meta property="og:site_name" content="Senseible" data-rh="true" />`,
    `<meta property="og:url" content="${url}" data-rh="true" />`,
    `<meta property="og:title" content="${e(route.title)}" data-rh="true" />`,
    `<meta property="og:description" content="${e(route.description)}" data-rh="true" />`,
    `<meta property="og:image" content="${R.DEFAULT_OG_IMAGE}" data-rh="true" />`,
    `<meta name="twitter:card" content="summary_large_image" data-rh="true" />`,
    `<meta name="twitter:site" content="@senseible_earth" data-rh="true" />`,
    `<meta name="twitter:title" content="${e(route.title)}" data-rh="true" />`,
    `<meta name="twitter:description" content="${e(route.description)}" data-rh="true" />`,
    `<meta name="twitter:image" content="${R.DEFAULT_OG_IMAGE}" data-rh="true" />`,
  ];
  // JSON-LD is marked as Helmet-managed so client-side schema replaces it
  // after hydration instead of duplicating it. "<" is escaped so content can
  // never close the script element.
  for (const ld of route.jsonLd) {
    tags.push(`<script type="application/ld+json" data-rh="true">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('\n    ');
}

function bodyHtml(route, R) {
  const crumbs = route.breadcrumbs
    .map(c => `<a href="${R.canonicalUrl(c.path)}">${R.escapeHtml(c.name)}</a>`)
    .join(' › ');
  return `<noscript><main style="padding:1.5rem;max-width:860px;margin:0 auto;font-family:system-ui,sans-serif;line-height:1.6">
<nav aria-label="Breadcrumb">${crumbs}</nav>
<h1>${R.escapeHtml(route.h1)}</h1>
${R.blocksToHtml(route.blocks)}
<hr/><p><a href="${R.SITE_URL}/">Senseible</a> · <a href="${R.SITE_URL}/climate-intelligence">Guides</a> · <a href="${R.SITE_URL}/calculators">Calculators</a> · <a href="${R.SITE_URL}/pricing">Pricing</a> · <a href="${R.SITE_URL}/contact">Contact</a></p>
</main></noscript>`;
}

function renderPage(template, route, R) {
  const start = template.indexOf(HEAD_START);
  const end = template.indexOf(HEAD_END);
  if (start === -1 || end === -1) throw new Error('index.html is missing the <!--seo:head--> markers');
  let html = template.slice(0, start + HEAD_START.length) + '\n    ' + headTags(route, R) + '\n    ' + template.slice(end);
  if (!html.includes('<div id="root"></div>')) throw new Error('index.html is missing <div id="root"></div>');
  html = html.replace('<div id="root"></div>', `<div id="root"></div>\n${bodyHtml(route, R)}`);
  return html;
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
  const routes = R.getSeoRoutes();

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
  for (const r of routes) {
    const html = renderPage(template, r, R);
    if (r.path === '/') { writeFile(indexPath, html); continue; }
    writeFile(path.join(DIST_DIR, `${r.path}.html`), html);
    writeFile(path.join(DIST_DIR, r.path, 'index.html'), html);
  }
  writeSupportFiles(DIST_DIR, routes, R);

  const bySection = routes.reduce((acc, r) => ({ ...acc, [r.section]: (acc[r.section] || 0) + 1 }), {});
  console.log(`✅ Prerendered ${routes.length} routes, sitemap.xml, llms.txt and Markdown mirrors`);
  console.log(`📊 ${Object.entries(bySection).map(([k, v]) => `${v} ${k}`).join(', ')}`);
}

main().catch(err => {
  console.error('❌ SEO prerender failed:', err.message);
  process.exit(1);
});
