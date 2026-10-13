import { describe, expect, test } from 'bun:test';
import { getSeoRoutes } from '../src/lib/seo/routeRegistry';
import { ORGANIZATION, ORG_ID, ORG_SAME_AS, WEBSITE, WEBSITE_ID } from '../src/lib/seo/entity';

// Every node anywhere in a page's JSON-LD, nested ones included.
const nodes = (v: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] => {
  if (Array.isArray(v)) v.forEach(x => nodes(x, out));
  else if (v && typeof v === 'object') { out.push(v as Record<string, unknown>); Object.values(v).forEach(x => nodes(x, out)); }
  return out;
};

describe('Senseible is one entity across the site', () => {
  const routes = getSeoRoutes();

  test('the home page defines the organisation and the website once, by @id', () => {
    const home = routes.find(r => r.path === '/')!;
    expect(home.jsonLd).toContainEqual(ORGANIZATION);
    expect(home.jsonLd).toContainEqual(WEBSITE);
    expect(WEBSITE.publisher).toEqual({ '@id': ORG_ID });
    expect(ORG_ID).toBe('https://senseible.earth/#organization');
    expect(WEBSITE_ID).toBe('https://senseible.earth/#website');
  });

  test('every Senseible organisation node on every page carries the shared @id', () => {
    let seen = 0;
    for (const r of routes) for (const n of nodes(r.jsonLd)) {
      if (n['@type'] === 'Organization' && n.name === 'Senseible') { expect(n['@id']).toBe(ORG_ID); seen++; }
    }
    expect(seen).toBeGreaterThan(100); // home plus every article's author and publisher
  });

  test('the full organisation is defined only on the home page', () => {
    for (const r of routes.filter(x => x.path !== '/')) {
      expect(nodes(r.jsonLd).some(n => n.sameAs)).toBe(false);
    }
  });

  test('About and Contact point at the organisation', () => {
    for (const [path, type] of [['/about', 'AboutPage'], ['/contact', 'ContactPage']] as const) {
      const page = routes.find(r => r.path === path)!.jsonLd.find(n => n['@type'] === type)!;
      expect(page.mainEntity).toEqual({ '@id': ORG_ID });
      expect(page.isPartOf).toEqual({ '@id': WEBSITE_ID });
    }
  });

  test('the entity names the look-alikes it is not, and lists only https profiles', () => {
    expect(ORGANIZATION.disambiguatingDescription).toMatch(/Sensibull/);
    expect(ORGANIZATION.alternateName).toContain('senseible.earth');
    for (const u of ORG_SAME_AS) expect(u).toMatch(/^https:\/\/(www\.)?(linkedin\.com|x\.com|instagram\.com|facebook\.com)\//);
  });
});
