import { expect, test } from 'bun:test';
import { articleIndex } from '../src/data/articleIndex';
import { relatedSlugs, RELATED_MAX } from '../src/data/articleRelated';
import { hasArticleBody } from '../src/data/articleBody';

test('every article links to related articles and is linked from at least one', () => {
  const inbound = new Map(articleIndex.map(a => [a.slug, 0]));
  for (const a of articleIndex) {
    const r = relatedSlugs(a.slug);
    expect(r.length, a.slug).toBeGreaterThanOrEqual(1);
    expect(r.length).toBeLessThanOrEqual(RELATED_MAX);
    expect(r).not.toContain(a.slug);
    expect(new Set(r).size).toBe(r.length);
    for (const s of r) inbound.set(s, (inbound.get(s) ?? 0) + 1);
  }
  const orphans = [...inbound].filter(([, n]) => n === 0).map(([s]) => s);
  expect(orphans).toEqual([]);
});

test('related links are deterministic', () => {
  const a = articleIndex[10].slug;
  expect(relatedSlugs(a)).toEqual(relatedSlugs(a));
});
