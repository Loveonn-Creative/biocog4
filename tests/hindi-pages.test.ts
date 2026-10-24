import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { answerLibraryAll } from '../src/data/answerLibraryAll';
import { HINDI_ANSWERS } from '../src/data/answerLibraryHi';
import { HI_ANSWER_SLUGS, hindiHreflangFor, HI_PAGES_REVIEWED } from '../src/lib/seo/hiPages';
import { clampDescription, fitTitle } from '../src/lib/seo/seoMeta';
import type { LibraryAnswer } from '../src/data/answerLibraryTypes';
import type { HindiAnswer } from '../src/data/answerLibraryHi/types';

// The Hindi edition must say exactly what the English page says: same
// numbers, same links, same structure. Sources come from the English file.

const english = new Map(answerLibraryAll.map((a) => [a.slug, a]));
const files = readdirSync(new URL('../src/data/answerLibraryHi/', import.meta.url)).filter((f) => f.endsWith('.json'));
const NUM = /\d[\d,.]*\d|\d/g;

function text(a: LibraryAnswer | HindiAnswer): string {
  return [
    a.q, a.title, a.short, a.senseible,
    ...a.sections.flatMap((s) => [s.h, ...(s.p ?? []), ...(s.ul ?? []), ...(s.ol ?? [])]),
    ...(a.example ? [a.example.title, ...a.example.lines, a.example.note ?? ''] : []),
  ].join('\n');
}
const numbers = (s: string) => new Set((s.match(NUM) ?? []).map((n) => n.replace(/[.,]$/, '')));

describe('Hindi answer pages', () => {
  test('50 slugs, each with an English page and a Hindi file', () => {
    expect(HI_ANSWER_SLUGS.length).toBe(50);
    expect(new Set(HI_ANSWER_SLUGS).size).toBe(50);
    expect(files.map((f) => f.replace('.json', '')).sort()).toEqual([...HI_ANSWER_SLUGS].sort());
    expect(HINDI_ANSWERS.map((h) => h.slug).sort()).toEqual([...HI_ANSWER_SLUGS].sort());
    for (const s of HI_ANSWER_SLUGS) expect(english.has(s)).toBe(true);
  });

  for (const h of HINDI_ANSWERS) {
    const en = english.get(h.slug)!;
    test(`${h.slug}: same numbers, links and structure as English`, () => {
      const hi = numbers(text(h));
      const missing = [...numbers(text(en))].filter((n) => !hi.has(n));
      expect(missing).toEqual([]);
      expect(h.links.map((l) => l.to)).toEqual(en.links.map((l) => l.to));
      expect(h.sections.length).toBe(en.sections.length);
      expect(h.example?.lines.length ?? 0).toBe(en.example?.lines.length ?? 0);
    });
    test(`${h.slug}: no dashes, Devanagari text, SEO limits`, () => {
      const t = text(h);
      expect(t).not.toMatch(/[–—]/);
      expect(t).toMatch(/[ऀ-ॿ]/);
      expect(fitTitle(h.title).length).toBeLessThanOrEqual(60);
      const d = clampDescription(h.short);
      expect(d.length).toBeGreaterThanOrEqual(70);
      expect(d.length).toBeLessThanOrEqual(160);
    });
  }

  test('titles and descriptions are unique, and differ from English', () => {
    expect(new Set(HINDI_ANSWERS.map((h) => fitTitle(h.title))).size).toBe(HINDI_ANSWERS.length);
    expect(new Set(HINDI_ANSWERS.map((h) => clampDescription(h.short))).size).toBe(HINDI_ANSWERS.length);
    const enTitles = new Set(answerLibraryAll.map((a) => fitTitle(a.title)));
    for (const h of HINDI_ANSWERS) expect(enTitles.has(fitTitle(h.title))).toBe(false);
  });

  test('hreflang pairs only once reviewed', () => {
    const alts = hindiHreflangFor(`/answers/${HI_ANSWER_SLUGS[0]}`);
    expect(alts.length).toBe(HI_PAGES_REVIEWED ? 3 : 0);
    expect(hindiHreflangFor('/answers/not-a-hindi-page')).toEqual([]);
  });
});
