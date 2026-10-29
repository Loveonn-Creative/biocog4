import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { EVIDENCE, GLS_FAQS, NEEDS, SCHEMES, arrange, evidenceTally } from '../src/data/greenLoanSchemes';
import { STATIC_PAGE_META } from '../src/lib/seo/seoMeta';

describe('/msme-green-loan-schemes', () => {
  test('every need has routes, and the tally counts only the routes shown', () => {
    for (const n of NEEDS) {
      const { fit, rest } = arrange(n.id);
      expect(fit.length).toBeGreaterThan(0);
      expect(fit.length + rest.length).toBe(SCHEMES.length);
      for (const t of evidenceTally(fit)) expect(t.count).toBeLessThanOrEqual(fit.length);
    }
    expect(arrange(null).fit.length).toBe(SCHEMES.length);
    expect(SCHEMES.length).toBe(10);
  });

  test('every route says where to check terms, and its Answers link exists', () => {
    const ids = new Set(EVIDENCE.map(e => e.id));
    for (const s of SCHEMES) {
      expect(s.check.length).toBeGreaterThan(3);
      expect(s.asks.length > 0 || Boolean(s.asksNote)).toBe(true);
      for (const a of s.asks) expect(ids.has(a)).toBe(true);
      expect(existsSync(`src/data/answerLibrary/${s.more.to.replace('/answers/', '')}.json`)).toBe(true);
    }
  });

  test('every number on the page appears in the Answers page it comes from', () => {
    for (const s of SCHEMES) {
      const source = readFileSync(`src/data/answerLibrary/${s.more.to.replace('/answers/', '')}.json`, 'utf8')
        + readFileSync('src/data/answerLibrary/adeetie-loan-size-and-debt-share.json', 'utf8')
        + readFileSync('src/data/answerLibrary/adeetie-eligible-clusters-list.json', 'utf8')
        + readFileSync('src/data/answerLibrary/adeetie-application-steps.json', 'utf8')
        + readFileSync('src/data/answerLibrary/fmap-eligible-energy-efficiency-technologies.json', 'utf8');
      for (const n of `${s.suits} ${s.funds} ${s.terms.join(' ')}`.match(/\d+(?:\.\d+)?/g) ?? []) {
        expect(source.includes(n)).toBe(true);
      }
    }
  });

  test('no dashes, no invented rates, and Senseible never lends', () => {
    const text = JSON.stringify({ SCHEMES, GLS_FAQS, EVIDENCE }) + readFileSync('src/pages/GreenLoanSchemes.tsx', 'utf8');
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\d+(\.\d+)?\s?% (p\.a\.|interest|per annum)/i);
    expect(text).not.toMatch(/\b(platform|dataset|mapped|recompute)\b/i);
    expect(text).not.toMatch(/Senseible (lends|approves|guarantees|arranges)/i);
  });

  test('title and description fit search limits', () => {
    const m = STATIC_PAGE_META['/msme-green-loan-schemes'];
    expect(`${m.title} | Senseible`.length).toBeLessThanOrEqual(60);
    expect(m.description.length).toBeGreaterThanOrEqual(70);
    expect(m.description.length).toBeLessThanOrEqual(160);
  });

  test('the page is not in the footer', () => {
    expect(readFileSync('src/components/Footer.tsx', 'utf8')).not.toContain('msme-green-loan-schemes');
  });
});
