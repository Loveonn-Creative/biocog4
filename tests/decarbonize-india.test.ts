import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import * as di from '../src/data/decarbonizeIndia';
import { LANES, PROGRAM_CONTACT, STEPS, stepErrors, validateApplication } from '../src/lib/ambassadorApplication';
import { getSeoRoutes } from '../src/lib/seo/routeRegistry';

const allCopy = JSON.stringify(di);
const valid = {
  name: 'Asha Kumar', email: 'Asha@Example.in', whatsapp: '+91 77000 00000', city: 'Tiruppur',
  lanes: ['content', 'msme_talks'], commitment: 'full_90',
  firstMove: 'The dye unit two streets from my house runs boilers all night. I would ask the owner what the fuel bill was last month first.',
  workLink: '', reviewedPlatform: true, ownWords: true, selfless: true,
};

describe('Decarbonize India copy', () => {
  test('uses only facts from the program document', () => {
    expect(allCopy).toContain('₹1,50,000');
    expect(allCopy).toContain('may adjust');
    expect(allCopy).toContain('7 to 14 days');
    expect(allCopy).toContain('October 2026');
    expect(allCopy).toContain('18 countries');
    expect(PROGRAM_CONTACT.managerEmail).toBe('palanisamy@senseible.earth');
    expect(PROGRAM_CONTACT.whatsappNumber).toBe('917708540931');
  });
  test('states nothing the document leaves open', () => {
    for (const banned of ['50-60', '50 to 60', '400 million', '400+', '20 people', 'half-yearly', 'every year', 'yearly', 'guarantee', 'stipend', 'salary is']) {
      expect(allCopy.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
  test('never presents the program as a job or internship', () => {
    for (const line of [...di.filter.points, ...di.faqs.map(f => f.answer)]) {
      if (/internship|job/i.test(line)) expect(line).toMatch(/not|no\./i);
    }
  });
  test('no em dashes, and no weekly session dates', () => {
    expect(allCopy).not.toContain('—');
    expect(allCopy).not.toMatch(/\b(1[3-8]) Oct\b/i);
  });
  test('the WhatsApp link sends the CLIMATE keyword to the program number', () => {
    expect(di.session.whatsappHref).toBe('https://wa.me/917708540931?text=CLIMATE');
  });
  test('the page is pre-rendered with FAQ schema built from the same answers', () => {
    const route = getSeoRoutes().find(r => r.path === di.DI_PATH)!;
    expect(route).toBeTruthy();
    expect(route.title.length).toBeLessThanOrEqual(60);
    const faq = route.jsonLd.find((j: Record<string, unknown>) => j['@type'] === 'FAQPage') as { mainEntity: unknown[] };
    expect(faq.mainEntity.length).toBe(di.faqs.length);
  });
});

describe('ambassador application', () => {
  test('accepts a complete application and keeps the applicant\'s words exactly', () => {
    const r = validateApplication(valid);
    expect(r.ok).toBe(true);
    expect(r.value!.firstMove).toBe(valid.firstMove);
    expect(r.value!.email).toBe('asha@example.in');
    expect(r.value!.whatsapp).toBe('+917700000000');
  });
  test('needs 2 or 3 known lanes', () => {
    expect(validateApplication({ ...valid, lanes: ['content'] }).errors?.lanes).toBeTruthy();
    expect(validateApplication({ ...valid, lanes: ['content', 'design', 'code', 'creative'] }).errors?.lanes).toBeTruthy();
    expect(validateApplication({ ...valid, lanes: ['content', 'hacking'] }).errors?.lanes).toBeTruthy();
  });
  test('needs a real first move and all three confirmations', () => {
    expect(validateApplication({ ...valid, firstMove: 'short' }).errors?.firstMove).toMatch(/more characters/);
    for (const k of ['reviewedPlatform', 'ownWords', 'selfless'] as const) {
      expect(validateApplication({ ...valid, [k]: false }).errors?.[k]).toBeTruthy();
    }
  });
  test('rejects a filled honeypot without explaining', () => {
    const r = validateApplication({ ...valid, company: 'bot inc' });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors!)).toEqual(['form']);
  });
  test('each step blocks only on its own fields', () => {
    const r = validateApplication({ ...valid, city: '', firstMove: '' });
    expect(Object.keys(stepErrors(r.errors!, 0))).toEqual(['city']);
    expect(Object.keys(stepErrors(r.errors!, 1))).toEqual([]);
    expect(Object.keys(stepErrors(r.errors!, 2))).toEqual(['firstMove']);
    expect(STEPS.flatMap(s => s.fields).length).toBe(11);
  });
  test('lanes and limits match the database table', () => {
    const sql = readFileSync('supabase/pending-migrations/20261014100000_ambassador_applications.sql', 'utf8');
    const inSql = sql.match(/lanes <@ ARRAY\[([^\]]*)\]/)![1].match(/'([a-z_]+)'/g)!.map(s => s.slice(1, -1));
    expect(inSql.sort()).toEqual(LANES.map(l => l.id).sort());
    expect(sql).toContain('char_length(first_move) BETWEEN 80 AND 1200');
  });
});
