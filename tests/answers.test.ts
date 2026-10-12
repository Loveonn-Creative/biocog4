import { describe, expect, test } from 'bun:test';
import { answers, ANSWER_TOPICS } from '../src/data/answers';

describe('answers hub content', () => {
  test('slugs are unique and URL-safe', () => {
    expect(new Set(answers.map(a => a.slug)).size).toBe(answers.length);
    for (const a of answers) expect(a.slug).toMatch(/^[a-z0-9-]+$/);
  });
  test('titles fit and short answers are quotable', () => {
    for (const a of answers) {
      expect(a.title.length).toBeLessThanOrEqual(46);
      const words = a.short.split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(20);
      expect(words).toBeLessThanOrEqual(62);
      expect(ANSWER_TOPICS[a.topic]).toBeDefined();
    }
  });
  test('internal links point to known routes', () => {
    const known = /^\/(|auth(\?mode=signup)?|platform|pricing|trust|mission|about|contact|calculators(\/product-carbon-footprint)?|net-zero|msme-carbon-number|scope-3-supplier-evidence|carbon-accounting|esg-reporting|green-finance|climate-finance|carbon-credits|cbam-calculator|enterprise|partners|industries\/[a-z-]+|legal\/(terms|privacy|dpa)|answers\/[a-z0-9-]+)$/;
    for (const a of answers) for (const l of a.links) expect(l.to).toMatch(known);
  });
  test('no superlatives or invented guarantees', () => {
    const text = JSON.stringify(answers);
    expect(text).not.toMatch(/\b(the only|leading|best|guarantee[ds]?)\b(?! approval)/i);
    expect(text).not.toMatch(/—/);
  });
  test('not-offered answers say no plainly', () => {
    for (const a of answers.filter(x => x.status === 'not-offered')) expect(a.short).toMatch(/^(No\.|Senseible does not)/);
  });
});
