import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { answerLibraryAll } from '../src/data/answerLibraryAll';
import { answerLibraryIndex } from '../src/data/answerLibraryIndex';
import { LIBRARY_TOPICS } from '../src/data/answerLibraryTypes';
import { answers } from '../src/data/answers';
import { libraryBlocks } from '../src/lib/seo/routeRegistry';
import { blocksToHtml } from '../src/lib/seo/render';

const files = readdirSync(new URL('../src/data/answerLibrary/', import.meta.url)).filter((f) => f.endsWith('.json'));

describe('answer library', () => {
  test('generated modules match the JSON files (run npm run seo:answers)', () => {
    expect(answerLibraryAll.map((a) => `${a.slug}.json`).sort()).toEqual(files.sort());
    expect(answerLibraryIndex.map((e) => e.slug).sort()).toEqual(answerLibraryAll.map((a) => a.slug).sort());
  });

  test('slugs and titles are unique and never collide with hand-written answers', () => {
    const slugs = answerLibraryAll.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const titles = answerLibraryAll.map((a) => a.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    const own = new Set(answers.map((a) => a.slug));
    for (const s of slugs) expect(own.has(s)).toBe(false);
  });

  test('every page is complete and quotable', () => {
    for (const a of answerLibraryAll) {
      expect(LIBRARY_TOPICS[a.topic]).toBeDefined();
      expect(a.title.length).toBeLessThanOrEqual(46);
      const words = a.short.trim().split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(25);
      expect(words).toBeLessThanOrEqual(60);
      expect(a.sections.length).toBeGreaterThanOrEqual(2);
      expect(a.senseible.length).toBeGreaterThan(20);
      expect(a.sources.length).toBeGreaterThan(0);
      for (const s of a.sources) expect(s.url).toMatch(/^https:\/\//);
      expect(a.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('no dashes or capability claims Senseible cannot make', () => {
    const text = JSON.stringify(answerLibraryAll);
    expect(text).not.toMatch(/[—–]/);
    for (const a of answerLibraryAll) {
      expect(a.senseible).not.toMatch(/\b(certifies|certified by Senseible|issues carbon credits|public API|SOC ?2 certified|ISO 27001 certified)\b/i);
    }
  });

  test('links between library pages resolve', () => {
    const slugs = new Set(answerLibraryAll.map((a) => a.slug));
    for (const a of answerLibraryAll) for (const l of a.links) {
      if (l.to.startsWith('/answers/')) expect(slugs.has(l.to.slice(9)) || answers.some((x) => `/answers/${x.slug}` === l.to)).toBe(true);
    }
  });

  test('prerendered page carries the short answer, sections and sources', () => {
    const a = answerLibraryAll.find((x) => x.slug === 'cea-vs-iea-grid-emission-factor-india')!;
    const html = blocksToHtml(libraryBlocks(a));
    expect(html).toContain('Which CEA figure to pick');
    expect(html).toContain('cea.nic.in');
    expect(html).toContain('Last reviewed 2026-10-15');
  });
});
