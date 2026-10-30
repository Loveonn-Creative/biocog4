import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { GUIDES, GUIDE_BY_ID, defaultOrder, itemListLd, lastChecked, productsFor, rankFor } from '../src/data/softwareGuides';
import { STATIC_PAGE_META, fitTitle } from '../src/lib/seo/seoMeta';
import { TIER_PRICES } from '../src/lib/pricing/pricingMath';

const PATHS = [
  '/best-carbon-accounting-software', '/best-supplier-emissions-software',
  '/best-carbon-compliance-software', '/best-cbam-software', '/best-brsr-software',
  '/carbon-credit-platforms', '/green-loans-msme-india',
];

describe('software guides', () => {
  test('seven live guides at the agreed evergreen URLs', () => {
    expect(GUIDES.map(g => g.path).sort()).toEqual([...PATHS].sort());
  });

  test('every mark, tag and weight points at something real', () => {
    for (const g of GUIDES) {
      const crit = new Set(g.criteria.map(c => c.id));
      const list = productsFor(g.id);
      const ids = new Set(list.map(p => p.id));
      const tags = new Set(Object.keys(g.tagLabels));
      expect(ids.size).toBe(list.length);
      for (const p of list) {
        expect(Object.keys(p.caps).sort()).toEqual([...crit].sort());
        for (const c of Object.values(p.caps)) expect(['yes', 'partly', 'no', 'unknown']).toContain(c.v);
        expect(p.sources.length).toBeGreaterThan(0);
        for (const s of p.sources) {
          expect(s.url).toMatch(/^https:\/\//);
          expect(s.seen).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
        expect(p.bestFor).toBeTruthy();
      }
      for (const [pid, t] of Object.entries(g.tags)) {
        expect(ids.has(pid)).toBe(true);
        for (const x of t) expect(tags.has(x)).toBe(true);
      }
      for (const s of g.situations) {
        for (const k of Object.keys(s.weights)) {
          if (k.startsWith('tag:')) expect(tags.has(k.slice(4))).toBe(true);
          else expect(crit.has(k)).toBe(true);
        }
        expect(rankFor(g, s.id).length).toBe(list.length);
      }
      for (const pid of g.pinLast ?? []) expect(ids.has(pid)).toBe(true);
      for (const r of g.related) expect(GUIDE_BY_ID[r]).toBeTruthy();
    }
  });

  test('ratings show only when verified, and none could be', () => {
    for (const g of GUIDES) for (const p of productsFor(g.id)) expect(p.rating).toBeNull();
  });

  test('Senseible: disclosed, never in the tender list, readiness only for credits, not a lender', () => {
    for (const g of GUIDES) {
      const ours = productsFor(g.id).filter(p => p.isSenseible);
      if (g.id === 'tenders') {
        expect(ours.length).toBe(0);
        expect(g.disclosure).toContain('not a tender platform');
      } else {
        expect(ours.length).toBe(1);
        expect(g.disclosure.startsWith('Senseible makes one of the tools on this list.')).toBe(true);
      }
    }
    const credits = productsFor('carbon-credits').find(p => p.isSenseible)!;
    expect(credits.name).toContain('readiness only');
    expect(credits.caps.registry_issuance.v).toBe('no');
    expect(credits.caps.buy_or_trade.v).toBe('no');
    expect(defaultOrder(GUIDE_BY_ID['carbon-credits']).at(-1)!.isSenseible).toBe(true);
    expect(GUIDE_BY_ID['green-loans'].disclosure).toContain('does not lend');
    expect(defaultOrder(GUIDE_BY_ID['green-loans']).at(-1)!.isSenseible).toBe(true);
  });

  test("Senseible's prices come from the pricing module", () => {
    const yearly = `₹${TIER_PRICES.essential.yearly.toLocaleString('en-IN')}`;
    for (const g of GUIDES) {
      const p = productsFor(g.id).find(x => x.isSenseible);
      if (!p || g.id === 'supplier-emissions') continue;
      expect(p.pricing).toContain(yearly);
    }
  });

  test('a situation re-orders the list and says why', () => {
    const cbam = GUIDE_BY_ID.cbam;
    const importer = rankFor(cbam, 'importer');
    expect(importer[0].product.tags).toContain('importer');
    expect(importer[0].reasons.length).toBeGreaterThan(0);
    const exporter = rankFor(cbam, 'ex-steel');
    expect(exporter[0].product.tags).toContain('exporter');
    expect(importer.map(f => f.product.id)).not.toEqual(exporter.map(f => f.product.id));
  });

  // Owner rule: first where Senseible fits best, lower where it does not.
  test('Senseible ranks first for Indian exporters, bill-based suppliers and MSME loan papers, lower for EU importers and multinationals', () => {
    const pos = (id: string, s: string) => rankFor(GUIDE_BY_ID[id as keyof typeof GUIDE_BY_ID], s).findIndex(f => f.product.isSenseible);
    expect(pos('cbam', 'ex-steel')).toBe(0);
    expect(pos('cbam', 'ex-cement')).toBe(0);
    expect(pos('supplier-emissions', 'bills')).toBe(0);
    expect(pos('green-loans', 'papers')).toBe(0);
    expect(pos('cbam', 'importer')).toBeGreaterThan(2);
    expect(pos('supplier-emissions', 'global')).toBeGreaterThan(2);
    expect(pos('carbon-accounting', 'multinational')).toBeGreaterThan(2);
  });

  test('ItemList lists exactly the products on the page', () => {
    for (const g of GUIDES) {
      const ld = itemListLd(g, p => `https://senseible.earth${p}`);
      expect(ld.numberOfItems).toBe(productsFor(g.id).length);
      expect(ld.itemListElement.map(i => i.name)).toEqual(defaultOrder(g).map(p => p.name));
      expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|ratingValue|review/i);
    }
  });

  test('copy: no dashes, no internal words, no process notes, a checked date', () => {
    for (const g of GUIDES) {
      expect(lastChecked(g.id)).toMatch(/^2026-\d{2}-\d{2}$/);
      const shown = JSON.stringify({ g: { ...g, keywords: [] }, p: productsFor(g.id).map(({ sources: _s, site: _site, ...rest }) => rest) });
      expect(shown).not.toMatch(/[—–]/);
      expect(shown).not.toMatch(/\b(dataset|mapped|recompute|illustrative|sample data)\b/i);
      expect(shown).not.toMatch(/pages? opened|blocked|brief\.md|register-D|this server|NOT VERIFIED|returned 40\d/i);
    }
    expect(readFileSync('src/pages/SoftwareGuide.tsx', 'utf8')).not.toMatch(/[—–]/);
  });

  test('titles and descriptions fit search limits; CBAM says 2027 for a reason', () => {
    for (const g of GUIDES) {
      const m = STATIC_PAGE_META[g.path];
      expect(m).toBeTruthy();
      expect(fitTitle(m.title).length).toBeLessThanOrEqual(60);
      expect(m.description.length).toBeGreaterThanOrEqual(70);
      expect(m.description.length).toBeLessThanOrEqual(160);
      if (/2027/.test(m.title)) expect(g.id).toBe('cbam');
    }
    expect(STATIC_PAGE_META['/best-cbam-software'].description).toContain('February 2027');
  });

  test('not in the footer, and linked from the chooser and related pages', () => {
    const footer = readFileSync('src/components/Footer.tsx', 'utf8');
    for (const p of PATHS) expect(footer).not.toContain(p);
    const chooser = readFileSync('src/pages/SoftwareChooser.tsx', 'utf8');
    for (const p of ['/best-carbon-accounting-software', '/best-cbam-software', '/best-brsr-software', '/best-supplier-emissions-software']) expect(chooser).toContain(p);
    expect(readFileSync('src/pages/CbamIndia.tsx', 'utf8')).toContain('/best-cbam-software');
    expect(readFileSync('src/pages/BrsrReporting.tsx', 'utf8')).toContain('/best-brsr-software');
    expect(readFileSync('src/pages/CarbonCreditsIndia.tsx', 'utf8')).toContain('/carbon-credit-platforms');
    expect(readFileSync('src/pages/GreenLoanSchemes.tsx', 'utf8')).toContain('/green-loans-msme-india');
  });
});
