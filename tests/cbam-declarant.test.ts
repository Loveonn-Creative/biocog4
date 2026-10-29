import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import * as cbd from '../src/data/cbamDeclarant';
import { getSeoRoutes } from '../src/lib/seo/routeRegistry';
import { STATIC_PAGE_META } from '../src/lib/seo/seoMeta';

const page = readFileSync(new URL('../src/pages/CbamDeclarant.tsx', import.meta.url), 'utf8');
const finderStates = (['buyer', 'seller'] as const).flatMap((c) => (['under', 'over'] as const).flatMap((v) => [false, true].map((h) => cbd.findDeclarant(c, v, h))));
const allCopy = JSON.stringify({ ...cbd, finderStates }) + page;

describe('/cbam-authorised-declarant', () => {
  test('finder: the threshold, DDP and hydrogen rules', () => {
    expect(cbd.findDeclarant('buyer', 'under', false).who).toBe('Nobody, for now.');
    expect(cbd.findDeclarant('buyer', 'under', true).who).toContain('Your buyer');
    expect(cbd.findDeclarant('buyer', 'over', false).who).toContain('Your buyer');
    expect(cbd.findDeclarant('seller', 'over', false).who).toContain('Not your Indian company');
    expect(cbd.findDeclarant('seller', 'under', true).who).toContain('Someone in the EU');
  });

  test('dates and the threshold match the sourced answers', () => {
    expect(cbd.THRESHOLD_TONNES).toBe(50);
    expect(cbd.DECLARANT_MILESTONES.map((m) => m.iso)).toEqual(['2026-01-01', '2026-03-31', '2027-02-01', '2027-09-30']);
    expect(cbd.FIRST_DECLARATION_ISO).toBe('2027-09-30');
    expect(cbd.MARKUP_SCHEDULE).toBe('10% in 2026, 20% in 2027 and 30% from 2028');
  });

  test('copy: no em dashes, emojis or internal words, and no claim that Senseible files', () => {
    expect(allCopy).not.toMatch(/—/);
    expect(allCopy).not.toMatch(/\p{Extended_Pictographic}/u);
    for (const w of ['platform', 'dataset', 'mapped', 'recompute', 'Simulation']) expect(allCopy.toLowerCase()).not.toContain(w.toLowerCase());
    expect(cbd.CBAM_DECLARANT_FAQS.find((f) => f.question.includes('Senseible'))?.answer).toMatch(/^No\./);
  });

  test('SEO: registered with FAQ schema, title and description in range', () => {
    const meta = STATIC_PAGE_META[cbd.CBAM_DECLARANT_PATH];
    expect(meta.title.length).toBeLessThanOrEqual(60);
    expect(meta.description.length).toBeGreaterThanOrEqual(70);
    expect(meta.description.length).toBeLessThanOrEqual(160);
    const route = getSeoRoutes().find((r) => r.path === cbd.CBAM_DECLARANT_PATH);
    expect(route).toBeDefined();
    expect(route!.jsonLd.some((ld) => (ld as { '@type'?: string })['@type'] === 'FAQPage')).toBe(true);
  });

  test('one CTA destination: the CBAM suite', () => {
    const primaries = [...page.matchAll(/<Link to="([^"]+)" className="cbd-btn cbd-btn-primary/g)].map((m) => m[1]);
    expect(primaries.length).toBeGreaterThan(0);
    expect(new Set(primaries)).toEqual(new Set(['/cbam-suite']));
  });
});
