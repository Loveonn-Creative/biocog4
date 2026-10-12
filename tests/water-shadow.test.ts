import { describe, expect, test } from 'bun:test';
import { billingPeriod, isWaterBill, waterBillsFromInvoice } from '../supabase/functions/_shared/water/fromInvoice';
import { shadowWaterRun } from '../supabase/functions/_shared/water/shadow';

const BILL = {
  vendor: 'Delhi Jal Board', supplierGstin: '07AAAGD1234F1Z5', currency: 'INR',
  lineItems: [
    { description: 'Water consumption', quantity: 18, unit: 'kL', sourceText: 'Billing period 01/04/2026 to 31/05/2026  Consumption 18 KL' },
    { description: 'Sewerage charges', quantity: 18, unit: 'kL' },
    { description: 'Meter rent', quantity: 1, unit: 'month' },
  ],
};

describe('water bill detection', () => {
  test('utility water and sewerage bill is detected; packaged drinking water is not', () => {
    expect(isWaterBill(BILL)).toBe(true);
    expect(isWaterBill({ vendor: 'Bisleri International', lineItems: [{ description: 'Packaged drinking water 20L jar', hsn_code: '22011010', quantity: 10, unit: 'nos' }] })).toBe(false);
    expect(isWaterBill({ vendor: 'Tata Power', lineItems: [{ description: 'Energy charges', quantity: 400, unit: 'kWh' }] })).toBe(false);
  });
  test('printed billing period is read; invalid or missing dates give null', () => {
    expect(billingPeriod(['Billing period 01/04/2026 to 31/05/2026'])).toEqual({ start: '2026-04-01', end: '2026-05-31' });
    expect(billingPeriod(['From 1-Apr-2026 to 31-May-2026'])).toEqual({ start: '2026-04-01', end: '2026-05-31' });
    expect(billingPeriod(['31/02/2026 to 31/03/2026'])).toBeNull();
    expect(billingPeriod(['31/05/2026 to 01/04/2026'])).toBeNull();
    expect(billingPeriod(['Bill date 05/06/2026'])).toBeNull();
  });
  test('one input per water line with a quantity; supply and sewerage kept apart', () => {
    const b = waterBillsFromInvoice(BILL, 'e1', 'hash');
    expect(b.map(x => [x.volume_kind, x.volume_raw, x.unit_raw])).toEqual([['SUPPLY', 18, 'kL'], ['WASTEWATER', 18, 'kL']]);
    expect(b[0]).toMatchObject({ country_code: 'IN', billing_period_start: '2026-04-01', billing_period_end: '2026-05-31', supplier_id: 'delhi jal board', source_document_ref: 'hash#0' });
  });
  test('no GSTIN: country stays unknown, never assumed', () => {
    expect(waterBillsFromInvoice({ ...BILL, supplierGstin: undefined }, 'e1', 'h')[0].country_code).toBeNull();
  });
});

function fakeDb(enabled: boolean | 'missing') {
  const calls: unknown[] = [];
  const table = (name: string) => ({
    select: () => ({
      maybeSingle: async () => (enabled === 'missing' ? { data: null, error: { message: 'relation does not exist' } }
        : { data: { enabled, gwp_basis: 'AR5', period_basis: 'INDIA_FY' }, error: null }),
      eq: async () => ({ data: [], error: null }),
    }),
    name,
  });
  return { calls, from: table, rpc: async (fn: string, args: unknown) => { calls.push([fn, args]); return { error: null }; } };
}

describe('shadow run', () => {
  test('does nothing while the switch is off or the tables do not exist', async () => {
    for (const s of [false, 'missing'] as const) {
      const db = fakeDb(s);
      await shadowWaterRun(db, BILL, 'u1', 'h');
      expect(db.calls).toHaveLength(0);
    }
  });
  test('does nothing for guests and non-water invoices', async () => {
    const db = fakeDb(true);
    await shadowWaterRun(db, BILL, null, 'h');
    await shadowWaterRun(db, { vendor: 'Tata Power', lineItems: [{ description: 'Energy charges', quantity: 1, unit: 'kWh' }] }, 'u1', 'h');
    expect(db.calls).toHaveLength(0);
  });
  test('switch on: persists each bill as SHADOW; no factors loaded means NULL emissions and NO_FACTOR flags', async () => {
    const db = fakeDb(true);
    await shadowWaterRun(db, BILL, 'u1', 'h');
    expect(db.calls).toHaveLength(2);
    const p = (db.calls[0] as [string, { p: { kind: string; bill: { volume_m3: number }; results: { emissions_kgco2e: unknown }[]; flags: { reason_code: string }[] } }])[1].p;
    expect(p.kind).toBe('SHADOW');
    expect(p.bill.volume_m3).toBe(18);
    expect(p.results.every((r: { emissions_kgco2e: unknown }) => r.emissions_kgco2e === null)).toBe(true);
    expect(p.flags.map((f: { reason_code: string }) => f.reason_code)).toEqual(expect.arrayContaining(['NO_FACTOR', 'MAPPING_PENDING']));
  });
  test('never throws, even if the database call fails', async () => {
    const db = { from: () => { throw new Error('boom'); } };
    await expect(shadowWaterRun(db, BILL, 'u1', 'h')).resolves.toBeUndefined();
  });
});
