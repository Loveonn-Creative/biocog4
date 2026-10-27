// The shared import rules (supabase/functions/_shared/importRows.ts) used by
// both the /import page and the import-records function.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { checkRecords, checkRows, cleanValues, DOC_TYPES, gstinProblem } from '../supabase/functions/_shared/importRows';
import * as pageRules from '../src/lib/import/validate';
import { gstinCheckChar, gstinFault } from '../supabase/functions/_shared/gstin';
import { checkGstin, gstinCheckChar as signupCheckChar } from '../src/lib/indiaBusinessIds';
import { classifyByKeyword } from '../supabase/functions/_shared/emissionFactors';

const NOW = new Date('2026-10-27T00:00:00Z');

describe('one set of rules', () => {
  test('the page uses the shared module, not a copy', () => {
    expect(pageRules.checkRecords).toBe(checkRecords);
    expect(readFileSync('src/lib/import/validate.ts', 'utf8')).toContain("export * from '../../../supabase/functions/_shared/importRows'");
    expect(readFileSync('supabase/functions/_shared/importRows.ts', 'utf8')).not.toMatch(/from ['"](https?:|npm:|jsr:|@\/)/);
  });
  test('bill types use the invoice reader\'s own keyword classification', () => {
    for (const rule of Object.values(DOC_TYPES)) expect(rule.calc).toEqual(classifyByKeyword(rule.label)!);
    expect(DOC_TYPES.freight.calc).toMatchObject({ productCategory: 'TRANSPORT', scope: 3 });
  });
  test('named rows and sheet rows give the same result', () => {
    const values = { date: '30/05/2026', type: 'Petrol', quantity: '120', unit: 'litre', supplier: 'Shell', gstin: '', invoice: 'SH-77', amount: '', notes: '' };
    const fromSheet = checkRows('activity', { date: 0, type: 1, quantity: 2, unit: 3, supplier: 4, gstin: 5, invoice: 6, amount: 7, notes: 8 }, [Object.values(values)], NOW);
    expect(checkRecords('activity', [{ line: 2, values }], NOW)).toEqual(fromSheet);
  });
  test('values from a request are cleaned: unknown keys dropped, non-text ignored, nothing filled in', () => {
    const v = cleanValues('activity', { date: ' 2026-05-01 ', quantity: 42, unit: { x: 1 }, evil: 'x' } as any);
    expect(v).toEqual({ date: '2026-05-01', type: '', quantity: '42', unit: '', supplier: '', gstin: '', invoice: '', amount: '', notes: '' });
  });
});

describe('GSTIN rules agree with the signup checks', () => {
  test('check character and verdicts match indiaBusinessIds on many numbers', () => {
    const pans = ['AAPFU0939F', 'AAACR5055K', 'ABCDE1234F', 'ZZZZZ9999Z'];
    for (const state of ['27', '07', '29', '33', '45', '99', '00']) for (const pan of pans) for (const ent of ['1', '2', 'A']) {
      const body = `${state}${pan}${ent}Z`;
      expect(gstinCheckChar(body)).toBe(signupCheckChar(body));
      for (const last of [gstinCheckChar(body), '0', 'X']) {
        const g = body + last;
        expect(gstinFault(g) === null).toBe(checkGstin(g).status === 'format_ok');
      }
    }
  });
  test('plain messages for each fault', () => {
    expect(gstinProblem('27AAPFU0939F1ZV')).toBeNull();
    expect(gstinProblem('27AAPFU')).toContain('15 characters');
    expect(gstinProblem('27AAPFU0939F1ZA')).toContain('typo');
  });
});
