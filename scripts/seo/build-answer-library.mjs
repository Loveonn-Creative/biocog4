#!/usr/bin/env node
// Answer library: validates every page in src/data/answerLibrary/*.json and
// writes the two generated modules the site reads.
//   - src/data/answerLibraryIndex.ts  short index for the hub and the radar
//   - src/data/answerLibraryAll.ts    every page, for the prerender and tests
// A page that fails any check stops the build, so nothing unaudited ships.
//
// Usage:
//   node scripts/seo/build-answer-library.mjs            validate all, write modules
//   node scripts/seo/build-answer-library.mjs --check a.json b.json
//                                                        validate only these, write nothing
//   --planned docs/seo/batch-01.tsv  also accept links to answers proposed in that register
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const DIR = join(ROOT, 'src/data/answerLibrary');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const plannedIdx = args.indexOf('--planned');
const plannedPath = plannedIdx >= 0 ? args[plannedIdx + 1] : null;
const fileArgs = args.filter((a, i) => a.endsWith('.json') && args[i - 1] !== '--planned');

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+){1,9}$/;
const TOPICS = new Set(['accounting', 'regulation', 'markets', 'product']);
const INTENTS = new Set(['how-to', 'decision', 'comparison', 'explain', 'check']);
// Claims Senseible cannot make (docs/seo/brief.md "NOT offered").
const OVERCLAIM = /(senseible|biocog)[^.\n?]{0,80}\b(certif(y|ies|ied)|assur(es|ance)|issues? (carbon )?credits|registr(y|ies) integration|public api|sdk|webhooks?|soc ?2|iso 27001|real[- ]time sensor|guarantee)/i;
const HYPE = /\b(delve|game[- ]changer|seamless(ly)?|cutting[- ]edge|revolutioni[sz]e|unlock(s|ing)?|empower(s|ing)?|supercharge|in today's|ever[- ]evolving|holistic|synerg)/i;

const sources = readFileSync(join(ROOT, 'docs/seo/sources.md'), 'utf8');
const ALLOWED_URLS = new Set([...sources.matchAll(/^- (https:\/\/\S+)/gm)].map((m) => m[1]));

const inventory = readFileSync(join(ROOT, 'docs/seo/url-inventory.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t'));
const LIVE = new Set(inventory.map(([p]) => p));
const liveTitles = new Map(inventory.map(([p, t]) => [p, (t || '').toLowerCase()]));

const allFiles = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.json')).sort() : [];
const librarySlugs = new Set(allFiles.map((f) => basename(f, '.json')));
const planned = new Set();
if (plannedPath) {
  for (const line of readFileSync(plannedPath, 'utf8').split('\n').slice(1)) {
    const [status, , slug] = line.split('\t');
    if (status === 'propose' && slug) planned.add(slug);
  }
}

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const allText = (a) => [a.q, a.title, a.short, a.senseible, a.reviewNote ?? '',
  ...a.sections.flatMap((s) => [s.h, ...(s.p ?? []), ...(s.ul ?? []), ...(s.ol ?? [])]),
  ...(a.example ? [a.example.title, ...a.example.lines, a.example.note ?? ''] : []),
  ...a.links.map((l) => l.label), ...a.sources.map((s) => s.label)].join('\n');

function validate(file, a) {
  const e = [];
  const slug = basename(file, '.json');
  const need = ['slug', 'q', 'title', 'short', 'topic', 'intent', 'audience', 'sections', 'senseible', 'links', 'sources', 'reviewed'];
  for (const k of need) if (a[k] === undefined || a[k] === '' ) e.push(`missing ${k}`);
  if (e.length) return e;
  if (a.slug !== slug) e.push(`slug "${a.slug}" does not match file name`);
  if (!SLUG_RE.test(a.slug)) e.push('slug is not a natural lowercase query (2 to 10 words)');
  if (LIVE.has(`/answers/${a.slug}`) || LIVE.has(`/climate-intelligence/${a.slug}`)) e.push('slug already used by a live page');
  if (a.title.length > 46) e.push(`title ${a.title.length} chars (max 46)`);
  const sw = wordCount(a.short);
  if (sw < 25 || sw > 60) e.push(`short answer ${sw} words (25 to 60)`);
  if (!a.q.endsWith('?')) e.push('question must end with ?');
  if (!TOPICS.has(a.topic)) e.push(`topic "${a.topic}" unknown`);
  if (!INTENTS.has(a.intent)) e.push(`intent "${a.intent}" unknown`);
  if (!Array.isArray(a.sections) || a.sections.length < 2 || a.sections.length > 7) e.push('need 2 to 7 sections');
  else a.sections.forEach((s, i) => {
    if (!s.h) e.push(`section ${i + 1} has no heading`);
    if (!(s.p?.length || s.ul?.length || s.ol?.length)) e.push(`section ${i + 1} is empty`);
    for (const k of ['p', 'ul', 'ol']) if (s[k] && (!Array.isArray(s[k]) || s[k].some((x) => typeof x !== 'string' || !x.trim()))) e.push(`section ${i + 1}.${k} must be non-empty strings`);
  });
  if (a.example && (!a.example.title || !Array.isArray(a.example.lines) || !a.example.lines.length)) e.push('example needs a title and lines');
  if (!Array.isArray(a.links) || a.links.length < 1 || a.links.length > 5) e.push('need 1 to 5 internal links');
  else for (const l of a.links) {
    const to = String(l.to || '');
    const lib = to.startsWith('/answers/') ? to.slice(9) : null;
    const ok = LIVE.has(to) || (lib && (librarySlugs.has(lib) || planned.has(lib)));
    if (!ok) e.push(`link does not resolve: ${to}`);
    if (lib === a.slug) e.push('page links to itself');
    if (!l.label) e.push(`link ${to} has no label`);
  }
  if (!Array.isArray(a.sources) || a.sources.length < 1 || a.sources.length > 5) e.push('need 1 to 5 sources');
  else for (const s of a.sources) {
    if (!s.label) e.push('source without label');
    if (!ALLOWED_URLS.has(s.url)) e.push(`source URL not on docs/seo/sources.md allowlist: ${s.url}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.reviewed)) e.push('reviewed must be YYYY-MM-DD');
  const text = allText(a);
  if (/[—–]/.test(text)) e.push('contains an em or en dash');
  if (/\s-\s/.test(text)) e.push('contains a spaced hyphen used as a dash');
  const over = text.match(OVERCLAIM);
  if (over) e.push(`capability claim to check: "${over[0]}"`);
  const hype = text.replace(/empowering consumers for the green transition/gi, '').match(HYPE);
  if (hype) e.push(`hype word: "${hype[0]}"`);
  if (/\bCO2e?\b/.test(a.senseible) && /0\.71\b(?!0)/.test(text)) e.push('write the grid factor as 0.710');
  return e;
}

const targets = checkOnly ? fileArgs.map((f) => (f.includes('/') ? f : join(DIR, f))) : allFiles.map((f) => join(DIR, f));
const pages = [];
let failed = 0;
const titles = new Map();
for (const path of targets) {
  let a;
  try { a = JSON.parse(readFileSync(path, 'utf8')); } catch (err) { console.error(`✗ ${basename(path)}: invalid JSON (${err.message})`); failed++; continue; }
  const errs = validate(path, a);
  const t = String(a.title || '').toLowerCase();
  if (titles.has(t)) errs.push(`title duplicates ${titles.get(t)}`);
  titles.set(t, a.slug);
  for (const [p, lt] of liveTitles) if (lt && lt.replace(/ \| senseible$/, '') === t) errs.push(`title duplicates live page ${p}`);
  if (errs.length) { failed++; console.error(`✗ ${basename(path)}\n  - ${errs.join('\n  - ')}`); }
  else pages.push(a);
}

if (failed) { console.error(`\n${failed} of ${targets.length} page(s) failed.`); process.exit(1); }
if (checkOnly) { console.log(`✓ ${pages.length} page(s) pass.`); process.exit(0); }

const header = '// Generated by scripts/seo/build-answer-library.mjs from src/data/answerLibrary/*.json. Do not edit.\n';
const index = pages.map(({ slug, q, title, short, topic, reviewed }) => ({ slug, q, title, short, topic, reviewed }));
writeFileSync(join(ROOT, 'src/data/answerLibraryIndex.ts'),
  `${header}import type { LibraryIndexEntry } from './answerLibraryTypes';\n\nexport const answerLibraryIndex: LibraryIndexEntry[] = ${JSON.stringify(index, null, 1)};\n`);
const ids = pages.map((p, i) => `p${i}`);
writeFileSync(join(ROOT, 'src/data/answerLibraryAll.ts'),
  `${header}// Build and tests only: imports every page. The browser loads pages one at a time.\nimport type { LibraryAnswer } from './answerLibraryTypes';\n${pages.map((p, i) => `import ${ids[i]} from './answerLibrary/${p.slug}.json';`).join('\n')}\n\nexport const answerLibraryAll = [${ids.join(', ')}] as unknown as LibraryAnswer[];\n`);
console.log(`✓ ${pages.length} pages; wrote answerLibraryIndex.ts and answerLibraryAll.ts`);
