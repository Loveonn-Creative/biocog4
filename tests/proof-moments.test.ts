import { describe, expect, test } from 'bun:test';
import { firstVerified, nextMoment, pfConfirmed, sixMonths } from '../src/lib/proofMoments';
import type { ActionDocument, ActionEmission } from '../src/lib/intelligentActions';

let n = 0;
const em = (o: Partial<ActionEmission>): ActionEmission => ({ id: `e${++n}`, document_id: null, scope: 2, category: 'electricity', activity_data: 1000, activity_unit: 'kWh', co2_kg: 710, verified: true, created_at: '2026-01-01T00:00:00Z', ...o });
const doc = (o: Partial<ActionDocument> & { document_hash?: string }): ActionDocument => ({ id: `d${++n}`, vendor: 'MSEDCL', invoice_date: '2026-05-10', created_at: '2026-05-10T00:00:00Z', ...o });
const pfDoc = (month: string, pf: number) => doc({ invoice_date: `${month}-10`, cached_result: { lineItems: [{ evidence: { powerFactor: pf } }] } });

describe('proof moments', () => {
  test('first verified record names the earliest verified line and its fingerprint', () => {
    const d = doc({ document_hash: 'ab'.repeat(32) });
    const m = firstVerified([em({ activity_date: '2026-09-10', verified: true }), em({ document_id: d.id, activity_date: '2026-08-10', activity_data: 9857, co2_kg: 6998 }), em({ activity_date: '2026-07-01', verified: false })], [d]);
    expect(m).toMatchObject({ id: 'first_verified', vendor: 'MSEDCL', month: '2026-08', quantity: 9857, kg: 6998, fingerprint: 'ab'.repeat(32) });
    expect(firstVerified([em({ verified: false })], [])).toBeNull();
    // A measured line wins over an earlier count of items.
    expect(firstVerified([em({ activity_date: '2026-01-01', activity_unit: 'item', activity_data: 1, co2_kg: 82 }), em({ activity_date: '2026-03-01' })], [])).toMatchObject({ unit: 'kWh', month: '2026-03' });
  });

  test('six months only when the latest six calendar months are all present', () => {
    const rows = (ms: string[]) => ms.map((m) => em({ activity_date: `${m}-05` }));
    expect(sixMonths(rows(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']))).toMatchObject({ months: ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'] });
    expect(sixMonths(rows(['2025-12', '2026-01', '2026-02', '2026-04', '2026-05', '2026-06']))).toBeNull();
  });

  test('power factor confirmed only when a later bill reaches 0.95 from a low one', () => {
    expect(pfConfirmed([pfDoc('2026-05', 0.86), pfDoc('2026-09', 0.97)])).toMatchObject({ before: 0.86, after: 0.97, month: '2026-09' });
    expect(pfConfirmed([pfDoc('2026-05', 0.86), pfDoc('2026-09', 0.9)])).toBeNull();
    expect(pfConfirmed([pfDoc('2026-05', 0.97)])).toBeNull();
  });

  test('the newest unseen moment comes first; seen ones never return', () => {
    const rows = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'].map((m) => em({ activity_date: `${m}-05` }));
    expect(nextMoment(rows, [], [])?.id).toBe('six_months');
    expect(nextMoment(rows, [], ['six_months'])?.id).toBe('first_verified');
    expect(nextMoment(rows, [], ['six_months', 'first_verified'])).toBeNull();
  });
});
