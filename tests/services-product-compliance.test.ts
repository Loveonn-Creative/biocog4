import { describe, expect, test } from 'bun:test';
import { checklist, daysUntil, productHeadline, productSummary } from '../src/components/services/product-compliance/logic';

const now = new Date('2026-10-11T09:00:00Z');

describe('product compliance checklist', () => {
  test('battery passport required for EV, industrial and LMT, not portable', () => {
    for (const product of ['battery_ev', 'battery_industrial', 'battery_lmt'] as const) {
      const c = checklist({ product, eu: 'yes', pfas: 'no', svhc: 'no' });
      expect(c.items[0]).toMatchObject({ id: 'passport', status: 'required', date: '2027-02-18' });
      expect(c.nearest?.id).toBe('passport');
      expect(c.layers.carbon).toBe('required');
    }
    const p = checklist({ product: 'battery_portable', eu: 'yes', pfas: 'no', svhc: 'no' });
    expect(p.passport).toBe(false);
    expect(p.items.find(x => x.id === 'passport')?.status).toBe('check');
    expect(p.nearest).toBeNull();
  });
  test('ESPR: textiles and steel to prepare, others to check', () => {
    expect(checklist({ product: 'textiles', eu: 'yes', pfas: 'no', svhc: 'no' }).items.find(x => x.id === 'espr')?.status).toBe('prepare');
    expect(checklist({ product: 'steel_aluminium', eu: 'yes', pfas: 'no', svhc: 'no' }).layers.materials).toBe('prepare');
    expect(checklist({ product: 'furniture', eu: 'yes', pfas: 'no', svhc: 'no' }).items.find(x => x.id === 'espr')?.status).toBe('check');
  });
  test('SVHC above 0.1%: importer told and SCIP notification', () => {
    const c = checklist({ product: 'electronics', eu: 'yes', pfas: 'no', svhc: 'yes' });
    expect(c.items.filter(x => x.status === 'required').map(x => x.id)).toEqual(['svhc', 'scip']);
    expect(c.layers.substances).toBe('required');
    expect(checklist({ product: 'electronics', eu: 'yes', pfas: 'no', svhc: 'unsure' }).items.find(x => x.id === 'svhc')?.status).toBe('prepare');
  });
  test('PFAS is a proposed restriction with no date', () => {
    const c = checklist({ product: 'textiles', eu: 'yes', pfas: 'yes', svhc: 'no' });
    const pf = c.items.find(x => x.id === 'pfas')!;
    expect(pf.status).toBe('prepare');
    expect(pf.detail).toContain('proposed');
    expect(pf.date).toBeUndefined();
  });
  test('outside the EU everything becomes a check', () => {
    const c = checklist({ product: 'battery_ev', eu: 'no', pfas: 'yes', svhc: 'yes' });
    expect(c.required + c.prepare).toBe(0);
    expect(productHeadline({ product: 'battery_ev', eu: 'no', pfas: 'yes', svhc: 'yes' }, now)).toContain('no EU duties today');
  });
  test('countdown and headline', () => {
    expect(daysUntil('2027-02-18', now)).toBe(130);
    expect(productHeadline({ product: 'battery_ev', eu: 'yes', pfas: 'no', svhc: 'no' }, now))
      .toBe('EV battery for the EU: 1 required, 0 to prepare now. Nearest date: battery passport from 18 February 2027, 130 days away.');
    expect(productHeadline({ product: 'textiles', eu: 'yes', pfas: 'unsure', svhc: 'unsure' }, now)).toContain('No dated deadline');
    expect(productSummary({ product: 'textiles', eu: 'yes', pfas: 'no', svhc: 'no' })).toContain('Prepare now: Digital Product Passport under ESPR');
  });
});
