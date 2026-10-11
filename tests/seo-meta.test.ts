import { describe, expect, test } from 'bun:test';
import {
  BANNED_CLAIMS,
  STATIC_PAGE_META,
  TITLE_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  canonicalPath,
  canonicalUrl,
  clampDescription,
  fitTitle,
  isNoIndexPath,
} from '../src/lib/seo/seoMeta';

const banned = (text: string) => BANNED_CLAIMS.some(c => c.pattern.test(text));

describe('seo metadata helpers', () => {
  test('brands a title only when it still fits', () => {
    expect(fitTitle('Pricing')).toBe('Pricing | Senseible');
    const long = 'A'.repeat(55);
    expect(fitTitle(long)).toBe(long);
    expect(fitTitle('About Senseible')).toBe('About Senseible');
  });

  test('cuts descriptions on a word boundary and strips markdown', () => {
    const d = clampDescription(`**Bold** start with a [link](/x) ${'word '.repeat(60)}`);
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d.startsWith('Bold start with a link')).toBe(true);
    expect(d.endsWith('…')).toBe(true);
  });

  test('normalises canonicals', () => {
    expect(canonicalPath('/pricing/?ref=x#top')).toBe('/pricing');
    expect(canonicalUrl('/')).toBe('https://senseible.earth/');
    expect(canonicalUrl('/trust/')).toBe('https://senseible.earth/trust');
  });

  test('keeps private routes out of the index', () => {
    expect(isNoIndexPath('/dashboard')).toBe(true);
    expect(isNoIndexPath('/calculators/history')).toBe(true);
    expect(isNoIndexPath('/calculators/logistics-emissions')).toBe(false);
    expect(isNoIndexPath('/partners')).toBe(false);
  });

  test('every static page meets title and description limits', () => {
    for (const [path, meta] of Object.entries(STATIC_PAGE_META)) {
      expect(fitTitle(meta.title).length, path).toBeLessThanOrEqual(TITLE_MAX);
      expect(meta.description.length, path).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(meta.description.length, path).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(banned(`${meta.title} ${meta.description}`), path).toBe(false);
    }
  });

  test('blocks unverified claims but not URL slugs', () => {
    expect(banned("India's first AI carbon layer")).toBe(true);
    expect(banned('for 400 million MSMEs')).toBe(true);
    expect(banned('verified in under 47 seconds')).toBe(true);
    expect(banned('"aggregateRating": {}')).toBe(true);
    expect(banned('/climate-intelligence/dynamic-benchmarking-400m-msmes')).toBe(false);
    expect(banned('Phase-in rises to 48.5% in 2030')).toBe(false);
  });
});
