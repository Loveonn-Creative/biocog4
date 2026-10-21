import { describe, expect, test } from 'bun:test';
import { intelligentActions, type ActionDocument, type ActionEmission } from '../src/lib/intelligentActions';

let n = 0;
const em = (o: Partial<ActionEmission>): ActionEmission => ({ id: `e${++n}`, document_id: null, scope: 2, category: 'electricity', activity_data: 1000, activity_unit: 'kWh', co2_kg: 710, verified: true, created_at: '2026-01-01T00:00:00Z', ...o });
const doc = (o: Partial<ActionDocument>): ActionDocument => ({ id: `d${++n}`, vendor: 'MSEDCL', invoice_date: '2026-05-10', created_at: '2026-05-10T00:00:00Z', ...o });
const bills = (months: string[], kwh = 1000) => months.map((m) => em({ activity_date: `${m}-10`, activity_data: kwh, co2_kg: kwh * 0.71 }));

describe('intelligentActions', () => {
  test('new account gets a friendly first step, not a tip list', () => {
    const a = intelligentActions([], []);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ id: 'start', lever: false, cta: { to: '/' } });
  });

  test('documents with nothing counted ask for a readable bill', () => {
    expect(intelligentActions([], [doc({})])[0].title).toMatch(/readable bill/);
  });

  test('a few months of bills show progress toward six', () => {
    const a = intelligentActions(bills(['2026-01', '2026-02']), [doc({})]);
    expect(a.at(-1)).toMatchObject({ id: 'start' });
    expect(a.at(-1)!.title).toMatch(/^2 of 6 months/);
  });

  test('power factor below 0.95 on a kVAh bill, read from the stored bill only', () => {
    const d = doc({ cached_result: { lineItems: [{ evidence: { kvah: 1200, powerFactor: 0.86 } }] } });
    const a = intelligentActions(bills(['2026-05']), [d]);
    const pf = a.find((x) => x.id === 'power_factor')!;
    expect(pf.title).toContain('0.86');
    expect(pf.title).toContain('16%');
    expect(pf.kg).toBe(0);
    expect(intelligentActions(bills(['2026-05']), [doc({ cached_result: { lineItems: [{ evidence: { powerFactor: 0.4 } }] } })]).find((x) => x.id === 'power_factor')).toBeUndefined();
  });

  test('diesel with grid power: saving uses 2.68 kg/L against 3 kWh x 0.710', () => {
    const a = intelligentActions([...bills(['2026-05']), em({ scope: 1, category: 'diesel', activity_data: 1000, activity_unit: 'L', co2_kg: 2680 })], [doc({})]);
    const g = a.find((x) => x.id === 'generator')!;
    expect(g.kg).toBeCloseTo(1000 * (2.68 - 3 * 0.71), 6);
    expect(g.effect).toContain('estimate');
  });

  test('solar needs six months, is capped by sanctioned load, and is an estimate', () => {
    const six = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
    expect(intelligentActions(bills(six.slice(0, 5), 3000), [doc({})]).find((x) => x.id === 'solar')).toBeUndefined();
    const s = intelligentActions(bills(six, 3000), [doc({ cached_result: { electricityBill: { sanctionedLoadKw: 15 } } })]).find((x) => x.id === 'solar')!;
    expect(s.title).toContain('15 kWp'); // 36,000 kWh / 1,500 = 24, capped at 15
    expect(s.kg).toBeCloseTo(15 * 1500 * 0.71, 6);
    expect(s.effect).toContain('estimate');
  });

  test('a supplier above half of Scope 3 is named; levers rank before record tasks', () => {
    const a1 = doc({ vendor: 'Asha Steel' }), a2 = doc({ vendor: 'Ravi Packaging' });
    const rows = [em({ scope: 3, category: 'steel', document_id: a1.id, co2_kg: 800 }), em({ scope: 3, category: 'packaging', document_id: a2.id, co2_kg: 200, verified: false })];
    const a = intelligentActions(rows, [a1, a2]);
    expect(a[0]).toMatchObject({ id: 'supplier', lever: true });
    expect(a[0].title).toContain('Asha Steel is 80%');
    expect(a.find((x) => x.id === 'verify')).toBeTruthy();
    expect(a.find((x) => x.id === 'start')).toBeUndefined();
  });

  test('a missing month is listed between the first and last bill', () => {
    const a = intelligentActions(bills(['2026-01', '2026-03']), [doc({})]);
    expect(a.find((x) => x.id === 'missing_month')!.evidence).toEqual(['Feb 2026']);
  });
});
