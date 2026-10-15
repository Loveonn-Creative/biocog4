import { describe, expect, test } from 'bun:test';
import { askLink, scan, slugToQuestion, words, type RadarItem } from '../src/lib/answerRadar';
import { answers } from '../src/data/answers';
import { articleIndex } from '../src/data/articleIndex';

const items: RadarItem[] = [
  ...answers.map((a) => ({ kind: 'answer' as const, title: a.q, to: `/answers/${a.slug}`, text: `${a.title} ${a.short}` })),
  ...articleIndex.map((g) => ({ kind: 'guide' as const, title: g.title, to: `/climate-intelligence/${g.slug}`, text: `${g.subtitle} ${g.tags.join(' ')}` })),
];

describe('question radar', () => {
  test('reads an address as a question', () => {
    expect(slugToQuestion('buyer-asked-for-product-carbon-footprint-what-to-send')).toBe('Buyer asked for product carbon footprint what to send');
    expect(slugToQuestion('')).toBe('');
    expect(slugToQuestion('%3Cscript%3E')).toBe('<script>'); // rendered as text by React, never as HTML
  });

  test('finds the product footprint pages for a product footprint question', () => {
    const hits = scan(slugToQuestion('buyer-asked-for-product-carbon-footprint-what-to-send'), items);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits.some((h) => /product carbon footprint/i.test(h.title))).toBe(true);
  });

  test('CBAM questions land on CBAM pages, best first', () => {
    const hits = scan('how much will cbam cost my steel exports', items);
    expect(hits[0].title.toLowerCase()).toContain('cbam');
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
  });

  test('nonsense or stop words only: nothing on the radar', () => {
    expect(scan('the and of how', items)).toEqual([]);
    expect(scan('zzqx plorb', items)).toEqual([]);
  });

  test('stop words and plurals are normalised', () => {
    expect(words('How do I calculate emissions for invoices')).toEqual(['calculate', 'emission', 'invoice']);
  });

  test('ask link prefills the contact form', () => {
    const l = askLink('What is CBAM?');
    expect(l.startsWith('/contact?topic=climate&msg=')).toBe(true);
    expect(decodeURIComponent(l.split('msg=')[1])).toBe('Please answer this on Senseible: What is CBAM?');
  });
});
