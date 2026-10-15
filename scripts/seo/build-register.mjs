#!/usr/bin/env node
// Builds a batch register from research candidates (JSON Lines) and the live
// URL inventory. Checks every candidate before a page is written:
//   - slug is a natural, lowercase, hyphenated query of reasonable length
//   - slug and intent are unique within the batch and against live pages
//     (token overlap on slug and title, so near-duplicates are caught too)
//   - evidence is named; capability claims Senseible does not have are flagged
//   - 2 to 8 pages per topic (owner rule), highest priority first
// Usage: node scripts/seo/build-register.mjs <candidates-dir> <inventory.tsv> <out.tsv> [limit]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, inventoryPath, outPath, limitArg] = process.argv.slice(2);
const LIMIT = Number(limitArg ?? 200);
const MAX_PER_TOPIC = 8;

const STOP = new Set('a an the and or of to for in on with by from how what is are do does can i my your we our it its vs versus should when which who why much many per under into at as be'.split(' '));
const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '');
const tokens = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w && !STOP.has(w)).map(stem));
const jaccard = (a, b) => { const i = [...a].filter((x) => b.has(x)).length; return i / (a.size + b.size - i || 1); };

const HUBS = new Set(['/', '/answers', '/climate-intelligence', '/industries', '/calculators', '/emission-factors', '/cbam-cost', '/solutions', '/vs', '/legal']);
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+){1,9}$/;
const OVERCLAIM = /(certif(y|ied|ication) (your|the)|third[- ]party assur|issue[sd]? (carbon )?credits|public api|real[- ]time sensor|soc ?2 certified|iso 27001 certified)/i;

const inventory = readFileSync(inventoryPath, 'utf8').trim().split('\n').map((l) => {
  const [path, title = ''] = l.split('\t');
  const slug = path.split('/').pop() ?? '';
  return { path, title, tok: tokens(`${slug} ${title}`) };
}).filter((p) => p.tok.size >= 3 && !HUBS.has(p.path)); // hubs list other pages; they are not intents

const candidates = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort().flatMap((f) =>
  readFileSync(join(dir, f), 'utf8').split('\n').filter((l) => l.trim()).map((l, i) => {
    try { return { ...JSON.parse(l), _src: `${f}:${i + 1}` }; } catch { return { _bad: `${f}:${i + 1}` }; }
  }));

const rows = [];
const kept = [];
const seen = []; // every candidate already placed, for in-batch duplicate checks
const perTopic = new Map();
const issues = { bad_json: 0, bad_slug: 0, dup_batch: 0, dup_live: 0, over_topic_cap: 0, overclaim: 0, no_evidence: 0, update_existing: 0 };

const ranked = candidates
  .filter((c) => { if (c._bad) { issues.bad_json++; return false; } return true; })
  .sort((a, b) => (Number(a.priority) || 3) - (Number(b.priority) || 3));

for (const c of ranked) {
  const slug = String(c.slug || '').replace(/^\/?answers\//, '').trim();
  const notes = [];
  let status = 'propose';
  if (!SLUG_RE.test(slug)) { status = 'reject'; notes.push('slug not a natural lowercase query'); issues.bad_slug++; }
  if (!String(c.evidence || '').trim()) { status = 'reject'; notes.push('no named evidence'); issues.no_evidence++; }
  if (OVERCLAIM.test(`${c.question} ${c.senseible}`)) { notes.push('check capability claim'); issues.overclaim++; }
  if (c.decision === 'update-existing') { status = 'update'; issues.update_existing++; }

  const tok = tokens(`${slug} ${c.question}`);
  if (status === 'propose') {
    const twin = seen.find((k) => k.slug === slug || jaccard(k.tok, tok) >= 0.6);
    if (twin) { status = 'merge'; notes.push(`same intent as ${twin.slug}`); issues.dup_batch++; }
  }
  if (status === 'propose') {
    const best = inventory.map((p) => ({ p, j: jaccard(p.tok, tok) })).sort((a, b) => b.j - a.j)[0];
    // 0.5+: probably the same intent as a live page, held for a decision.
    // 0.3 to 0.5: related page; the writer must differentiate and link it.
    if (best && best.j >= 0.5 && !c._cleared) { status = 'review'; notes.push(`likely same intent as live ${best.p.path} (${best.j.toFixed(2)})`); issues.dup_live++; }
    else if (best && best.j >= 0.3) notes.push(`related live page ${best.p.path}: differentiate and link`);
    seen.push({ slug, tok });
  }
  const topic = String(c.topic || 'unknown');
  if (status === 'propose') {
    const n = perTopic.get(topic) ?? 0;
    if (n >= MAX_PER_TOPIC) { status = 'later'; notes.push('topic cap reached for this batch'); issues.over_topic_cap++; }
    else if (kept.length >= LIMIT) { status = 'later'; notes.push('batch full'); }
    else { perTopic.set(topic, n + 1); kept.push({ slug, tok }); }
  }
  if (c.flag) notes.push(`flag: ${c.flag}`);
  rows.push({ status, slug, ...c, notes: notes.join('; ') });
}

const order = { propose: 0, update: 1, review: 2, merge: 3, later: 4, reject: 5 };
rows.sort((a, b) => order[a.status] - order[b.status] || (Number(a.priority) || 3) - (Number(b.priority) || 3) || String(a.topic).localeCompare(String(b.topic)));
const cols = ['status', 'priority', 'slug', 'question', 'topic', 'intent', 'audience', 'overlap', 'evidence', 'senseible', 'estimate', 'notes'];
const clean = (v) => String(v ?? '').replace(/[\t\n\r]+/g, ' ').trim();
writeFileSync(outPath, [cols.join('\t'), ...rows.map((r) => cols.map((k) => clean(r[k])).join('\t'))].join('\n') + '\n');

const count = (s) => rows.filter((r) => r.status === s).length;
const thin = [...new Set(candidates.map((c) => c.topic))].filter((t) => t && (perTopic.get(t) ?? 0) < 2);
console.log(JSON.stringify({
  candidates: candidates.length, propose: count('propose'), update: count('update'), review: count('review'),
  merge: count('merge'), later: count('later'), reject: count('reject'), topics: perTopic.size,
  topicsUnderTwo: thin.length, issues,
}, null, 1));
