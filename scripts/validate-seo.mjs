/**
 * SEO and claims build gate. Runs after the prerender; exits non-zero on any
 * error so a broken page or an unverified claim can never ship.
 *
 * Checks every route in src/lib/seo/routeRegistry.ts against dist/:
 *   - page exists, one <title> of 60 characters or fewer, unique across the site
 *   - meta description present, 70-160 characters
 *   - exactly one canonical, pointing at the page's own URL
 *   - exactly one <h1> in the prerendered body
 *   - every internal link resolves to a registered route or app route
 *   - sitemap.xml lists exactly the registry routes; md mirror and llms.txt exist
 *   - no banned claim (BANNED_CLAIMS in src/lib/seo/seoMeta.ts) anywhere in the
 *     built HTML, Markdown, llms.txt or JavaScript bundles
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadRegistry } from './seo/load-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const APP = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');

const errors = [];
const warnings = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// Static (non-parameterised) app routes, so links to app pages like /auth pass.
const appRoutes = new Set([...APP.matchAll(/<Route path="([^"*:]+)"/g)].map(m => m[1]));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('❌ dist/ not found. Run the build first.');
    process.exit(1);
  }
  const R = await loadRegistry();
  const routes = R.getSeoRoutes();
  const known = new Set([...routes.map(r => r.path), ...appRoutes]);
  const titles = new Map();
  const descriptions = new Map();

  for (const route of routes) {
    const where = route.path;
    const file = route.path === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route.path, 'index.html');
    if (!fs.existsSync(file)) { fail(where, 'prerendered page missing'); continue; }
    const html = fs.readFileSync(file, 'utf8');

    const titleTags = [...html.matchAll(/<title>([^<]*)<\/title>/g)];
    if (titleTags.length !== 1) fail(where, `expected 1 <title>, found ${titleTags.length}`);
    const title = decode(titleTags[0]?.[1] ?? '');
    if (!title) fail(where, 'empty title');
    if (title.length > R.TITLE_MAX) fail(where, `title is ${title.length} chars (max ${R.TITLE_MAX}): "${title}"`);
    if (titles.has(title)) fail(where, `duplicate title also used by ${titles.get(title)}: "${title}"`);
    titles.set(title, where);

    const descTags = [...html.matchAll(/<meta name="description" content="([^"]*)"/g)];
    if (descTags.length !== 1) fail(where, `expected 1 meta description, found ${descTags.length}`);
    const desc = decode(descTags[0]?.[1] ?? '');
    if (desc.length < R.DESCRIPTION_MIN || desc.length > R.DESCRIPTION_MAX) {
      fail(where, `description is ${desc.length} chars (want ${R.DESCRIPTION_MIN}-${R.DESCRIPTION_MAX})`);
    }
    if (descriptions.has(desc)) warn(where, `duplicate description also used by ${descriptions.get(desc)}`);
    descriptions.set(desc, where);

    const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)];
    if (canonicals.length !== 1) fail(where, `expected 1 canonical, found ${canonicals.length}`);
    else if (canonicals[0][1] !== R.canonicalUrl(route.path)) fail(where, `canonical ${canonicals[0][1]} does not match ${R.canonicalUrl(route.path)}`);

    if (/name="robots" content="[^"]*noindex/.test(html)) fail(where, 'indexable route is marked noindex');

    const body = html.slice(html.indexOf('<noscript>'));
    const h1s = (body.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) fail(where, `expected 1 <h1> in body, found ${h1s}`);

    for (const m of body.matchAll(/href="([^"]+)"/g)) {
      const href = decode(m[1]);
      if (!href.startsWith(R.SITE_URL)) continue;
      const target = R.canonicalPath(href.slice(R.SITE_URL.length) || '/');
      if (target.startsWith('/md/') || /\.(txt|xml|png|ico)$/.test(target)) continue;
      if (!known.has(target)) fail(where, `broken internal link to ${target}`);
    }

    const mdFile = path.join(DIST, route.path === '/' ? 'md/index.md' : `md${route.path}.md`);
    if (!fs.existsSync(mdFile)) fail(where, 'Markdown mirror missing');
  }

  // Redirects: source retired (not a live route), target live, page present.
  for (const rd of R.getRedirects()) {
    if (routes.some(r => r.path === rd.from)) fail(rd.from, 'redirect source is still a live route');
    const targetPath = R.canonicalPath(rd.to.split('#')[0]);
    if (!known.has(targetPath)) fail(rd.from, `redirect target ${rd.to} is not a live route`);
    const file = path.join(DIST, rd.from, 'index.html');
    if (!fs.existsSync(file) || !fs.readFileSync(file, 'utf8').includes('http-equiv="refresh"')) fail(rd.from, 'redirect page missing');
    if (rd.to.includes('#') && targetPath === '/trust') {
      const anchor = rd.to.split('#')[1];
      const trustSrc = fs.readFileSync(path.join(ROOT, 'src/data/trustSafeguards.ts'), 'utf8');
      if (!trustSrc.includes(`id: '${anchor}'`)) fail(rd.from, `anchor #${anchor} does not exist on /trust`);
    }
  }

  // Sitemap must list exactly the registry routes.
  const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const expected = new Set(routes.map(r => R.canonicalUrl(r.path)));
  for (const loc of locs) if (!expected.has(loc)) fail('sitemap.xml', `lists unknown URL ${loc}`);
  for (const url of expected) if (!locs.includes(url)) fail('sitemap.xml', `missing ${url}`);
  if (new Set(locs).size !== locs.length) fail('sitemap.xml', 'contains duplicate URLs');

  const llms = fs.readFileSync(path.join(DIST, 'llms.txt'), 'utf8');
  for (const m of llms.matchAll(/\]\((https:\/\/senseible\.earth[^)]*)\)/g)) {
    if (!expected.has(m[1])) fail('llms.txt', `links to unknown URL ${m[1]}`);
  }

  // robots.txt must keep search and AI crawlers allowed.
  const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
  for (const bot of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'GPTBot', 'PerplexityBot', 'ClaudeBot']) {
    if (!new RegExp(`User-agent: ${bot}\\s*\\n(?:[^\\n]*\\n)*?Allow: /\\s*\\n`, 'i').test(robots)) {
      fail('robots.txt', `${bot} must be named explicitly with "Allow: /"`);
    }
  }
  if (!robots.includes(`Sitemap: ${R.SITE_URL}/sitemap.xml`)) fail('robots.txt', 'missing Sitemap line');

  // Claims gate across everything a visitor or crawler can receive. CSS is
  // skipped because durations like ".47s" are not claims.
  const scanned = walk(DIST).filter(f => /\.(html|md|txt|js|json|xml)$/.test(f));
  for (const file of scanned) {
    const text = fs.readFileSync(file, 'utf8');
    for (const { pattern, reason } of R.BANNED_CLAIMS) {
      const m = text.match(pattern);
      if (m) {
        const i = m.index ?? 0;
        fail(path.relative(ROOT, file), `banned claim (${reason}): "${text.slice(Math.max(0, i - 40), i + 50).replace(/\s+/g, ' ')}"`);
      }
    }
  }

  for (const w of warnings) console.warn(`⚠️  ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`❌ ${e}`);
    console.error(`\nSEO gate failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
    process.exit(1);
  }
  console.log(`✅ SEO gate passed: ${routes.length} routes, ${scanned.length} files scanned for claims, ${warnings.length} warning(s).`);
}

main().catch(err => {
  console.error('❌ SEO gate crashed:', err.message);
  process.exit(1);
});
