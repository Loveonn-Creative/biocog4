import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { ATTRIBUTES, BILL_DOCS, BRSR_FAQS, BRSR_HUB_PATH, NEEDS, RULE_ROWS, RUNGS, SUPPLIER_LINES, principle6 } from '../src/data/brsrHub';
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '../src/lib/factors';
import { STATIC_PAGE_META } from '../src/lib/seo/seoMeta';

const text = JSON.stringify({ ATTRIBUTES, BILL_DOCS, BRSR_FAQS, NEEDS, RULE_ROWS, RUNGS, SUPPLIER_LINES });
const page = readFileSync(new URL('../src/pages/BrsrReporting.tsx', import.meta.url), 'utf-8');

describe('BRSR hub', () => {
  test('nine attributes, numbered 1 to 9, and only GHG and energy claimed as built from bills', () => {
    expect(ATTRIBUTES.map((a) => a.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(ATTRIBUTES.filter((a) => a.fromBills).map((a) => a.name)).toEqual(['GHG footprint', 'Energy footprint']);
    expect(text).not.toMatch(/environment fields/);
  });

  test('the ladder follows the BRSR Core glide path', () => {
    const core = Object.fromEntries(RUNGS.map((r) => [r.id, r.core]));
    expect(core.top150).toContain('FY 2023-24');
    expect(core.top250).toContain('FY 2024-25');
    expect(core.top500).toContain('FY 2025-26');
    expect(core.top1000).toContain('FY 2026-27');
    expect(RUNGS.find((r) => r.id === 'unlisted')?.brsr).toMatch(/No duty/);
  });

  test('every answer link exists in the library', () => {
    const links = [...NEEDS.flatMap((g) => g.items.map((i) => i.slug)), ...ATTRIBUTES.flatMap((a) => a.link ? [a.link.to.replace('/answers/', '')] : [])];
    for (const slug of links) expect(existsSync(`src/data/answerLibrary/${slug}.json`), slug).toBe(true);
    const slugs = NEEDS.flatMap((g) => g.items.map((i) => i.slug));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('worked example uses the factors Senseible applies to bills', () => {
    const t = principle6(BILL_DOCS.map((d) => d.id));
    expect(t.scope2).toBeCloseTo((480000 * INDIA_GRID_FACTOR_KG_PER_KWH) / 1000, 6);
    expect(t.scope1).toBeCloseTo((12000 * FUEL_FACTORS.DIESEL.value + 3000 * FUEL_FACTORS.LPG.value) / 1000, 6);
    expect(t.energy).toBeCloseTo(480000 * 0.0036 + 12000 * 0.03569 + 3000 * 0.0473, 6);
    expect(t.renewable).toBe(0);
    expect(principle6([])).toEqual({ scope1: 0, scope2: 0, energy: 0, renewable: 0 });
  });

  test('no dashes, no internal words, no filing or assurance claims for Senseible', () => {
    expect(text + page).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\b(platform|dataset|mapped|recompute)\b/i);
    expect(text).not.toMatch(/Senseible (files|assures|certifies)/i);
  });

  test('meta fits the search snippet', () => {
    const meta = STATIC_PAGE_META[BRSR_HUB_PATH];
    expect(meta.title.length).toBeLessThanOrEqual(60);
    expect(meta.description.length).toBeGreaterThanOrEqual(70);
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });
});
