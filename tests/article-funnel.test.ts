import { expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { cmsArticles } from '../src/data/cmsContent';
import { articleFunnel } from '../src/data/articleFunnel';

test('every article has a funnel stage and a clean, unique anchor', () => {
  const anchors = new Set<string>();
  for (const a of cmsArticles) {
    const f = articleFunnel[a.slug];
    expect(f, a.slug).toBeDefined();
    expect(['awareness', 'consideration', 'decision']).toContain(f.stage);
    const words = f.anchor.split(/\s+/).length;
    expect(words >= 2 && words <= 9, `${a.slug}: ${f.anchor}`).toBe(true);
    expect(/click here|read more|this article/i.test(f.anchor)).toBe(false);
    expect(anchors.has(f.anchor.toLowerCase())).toBe(false);
    anchors.add(f.anchor.toLowerCase());
  }
  expect(Object.keys(articleFunnel).length).toBe(cmsArticles.length);
});

test('slugs are short and plain: lowercase words, no stop-word padding', () => {
  for (const a of cmsArticles) expect(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug), a.slug).toBe(true);
});

test('renamed article URLs redirect permanently to the new ones', () => {
  const v = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const slugs = new Set(cmsArticles.map(a => a.slug));
  const articleRedirects = v.redirects.filter((r: { source: string }) => r.source.startsWith('/climate-intelligence/'));
  for (const r of articleRedirects) {
    expect(r.permanent).toBe(true);
    expect(slugs.has(r.destination.replace('/climate-intelligence/', '')), r.destination).toBe(true);
    expect(slugs.has(r.source.replace('/climate-intelligence/', '')), r.source).toBe(false);
  }
});
