import { describe, expect, test } from 'bun:test';
import { existsSync } from 'fs';
import { beeFees, CCI_FAQS, INSTRUMENTS, ROUTES, SITUATIONS } from '../src/data/carbonCreditsIndia';
import { CRITERIA, checklist, checklistText, scoreVendor, startWeights, type Weights } from '../src/data/softwareChooser';

describe('carbon credits in India', () => {
  test('BEE fees follow the Annexure 2 slabs over ten years', () => {
    const small = beeFees(1000);
    expect(small.registration).toBe(50000);
    expect(small.credits).toBe(10000);
    expect(small.total).toBe(50000 + 5000 + 20000 + 50000);
    expect(small.perCredit).toBeCloseTo(12.5, 5);
    expect(beeFees(15000).registration).toBe(50000);
    expect(beeFees(15001).registration).toBe(100000);
    expect(beeFees(50001).registration).toBe(150000);
    expect(beeFees(0).perCredit).toBe(0);
  });

  test('every situation and choice has a route, and every Answers link exists', () => {
    for (const s of SITUATIONS) for (const c of s.choices) expect(ROUTES[`${s.id}:${c.id}`]).toBeDefined();
    const links = [...Object.values(ROUTES).flatMap(r => r.links.map(l => l.to)), ...INSTRUMENTS.map(i => i.link)];
    for (const to of links.filter(t => t.startsWith('/answers/'))) {
      expect(existsSync(`src/data/answerLibrary/${to.slice('/answers/'.length)}.json`)).toBe(true);
    }
  });

  test('no price promises and no dashes', () => {
    const text = JSON.stringify({ ROUTES, CCI_FAQS, INSTRUMENTS, SITUATIONS });
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/₹\s?\d+\s?(per|a) (credit|tonne)/i);
  });
});

describe('software chooser', () => {
  test('checklist skips zero weights and puts musts first', () => {
    const w = { ...startWeights(), cbam: 0 } as Weights;
    const list = checklist(w);
    expect(list.find(c => c.id === 'cbam')).toBeUndefined();
    expect(w[list[0].id]).toBe(3);
    expect(checklistText(w)).toContain('Red flag:');
  });

  test('score is weighted and a must rated No is a dealbreaker', () => {
    const w = Object.fromEntries(CRITERIA.map(c => [c.id, 0])) as Weights;
    w.bills = 3; w.price = 1;
    expect(scoreVendor(w, { bills: 2, price: 2 }).score).toBe(100);
    const s = scoreVendor(w, { bills: 0, price: 2 });
    expect(s.score).toBe(25);
    expect(s.dealbreakers).toEqual(['Reads Indian electricity bills']);
    expect(scoreVendor(w, {}).rated).toBe(0);
  });

  test('Senseible answers make no certification or residency claims', () => {
    const text = CRITERIA.map(c => c.senseible ?? '').join(' ');
    expect(text).not.toMatch(/SOC ?2|ISO 27001|certified|India-only|data residency/i);
    expect(CRITERIA.find(c => c.id === 'location')?.senseible).toBeNull();
  });
});
