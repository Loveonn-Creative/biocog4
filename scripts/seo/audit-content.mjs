// Content audit: thin pages, near-duplicate titles/H1s, keyword cannibalisation,
// orphans (no internal links in). Read-only; prints a report.
import { loadRegistry } from './load-registry.mjs';
const R = await loadRegistry();
const routes = R.getSeoRoutes();
const md = new Map(routes.map(r => [r.path, R.blocksToMarkdown(r.blocks)]));
const words = (t) => (t.match(/[A-Za-z0-9₹€%.-]+/g) || []).length;
const stop = new Set('the a an and or of for to in on with by your is are what how from vs at as it its this that be can do does senseible india indian msme msmes guide 2026'.split(' '));
const terms = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => (w.length > 2 || /^\d+$/.test(w)) && !stop.has(w));
const jacc = (a, b) => { const A = new Set(a), B = new Set(b); const i = [...A].filter(x => B.has(x)).length; return i / (A.size + B.size - i || 1); };
// inbound links
const inbound = new Map(routes.map(r => [r.path, 0]));
for (const [p, text] of md) for (const m of text.matchAll(/\]\((\/[^)#?\s]*)/g)) if (inbound.has(m[1]) && m[1] !== p) inbound.set(m[1], inbound.get(m[1]) + 1);
const rows = routes.map(r => ({ path: r.path, section: r.section, title: r.title, h1: r.h1, words: words(md.get(r.path)), in: inbound.get(r.path) }));
const thin = rows.filter(r => r.words < 250 && r.section !== 'legal').sort((a, b) => a.words - b.words);
const pairs = [];
for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
  const s = jacc(terms(rows[i].title + ' ' + rows[i].h1), terms(rows[j].title + ' ' + rows[j].h1));
  if (s >= 0.5) pairs.push({ s: +s.toFixed(2), a: rows[i].path, b: rows[j].path, ta: rows[i].title, tb: rows[j].title });
}
pairs.sort((x, y) => y.s - x.s);
const bySection = {}; for (const r of rows) (bySection[r.section] ||= []).push(r.words);
console.log('ROUTES', rows.length);
for (const [s, w] of Object.entries(bySection)) console.log(`  ${s}: ${w.length} pages, median ${w.sort((a, b) => a - b)[Math.floor(w.length / 2)]} words`);
console.log('\nTHIN (<250 words, non-legal):', thin.length); for (const t of thin.slice(0, 40)) console.log(`  ${t.words}\t${t.in}in\t${t.path}`);
console.log('\nNEAR-DUPLICATE TITLE/H1 PAIRS (jaccard>=0.5):', pairs.length); for (const p of pairs.slice(0, 40)) console.log(`  ${p.s}\t${p.a}  <>  ${p.b}\n\t\t"${p.ta}" | "${p.tb}"`);
const orphans = rows.filter(r => r.in === 0 && r.path !== '/'); console.log('\nORPHANS (no inbound links in prerendered content):', orphans.length); for (const o of orphans.slice(0, 60)) console.log(`  ${o.section}\t${o.path}`);
// keyword clusters for key terms
for (const k of ['cbam', 'scope 3', 'brsr', 'carbon credit', 'green loan', 'carbon footprint', 'emission factor', 'carbon audit', 'csrd']) {
  const hits = rows.filter(r => (r.title + ' ' + r.h1).toLowerCase().includes(k));
  console.log(`\nKEYWORD "${k}" in title/H1: ${hits.length}`); for (const h of hits.slice(0, 15)) console.log(`  ${h.path}\t${h.title}`);
}
