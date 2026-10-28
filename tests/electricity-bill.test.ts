import { describe, expect, test } from 'bun:test';
import { prepareElectricityLines, consolidateElectricity, isElectricityBill, electricityBillMeta, printedBilledKwh, isGridRenewableLine, type RawOcr } from '../supabase/functions/_shared/electricityBill';
import { calculateEmissions, classifyByHSN, classifyByKeyword } from '../supabase/functions/_shared/emissionFactors';
import { buildEmissionRows } from '../src/lib/mrvPersistence';

// Mirrors extract-document's deterministic steps (classification is copied in
// shape from the function), then the client row builder, then the
// verification evidence gate. Everything after the model's reading.
function pipeline(ocr: RawOcr, opts: { gridCountry?: string | null } = {}) {
  const utilityBill = ocr.unitsConsumedKwh != null || isElectricityBill(ocr);
  const { lines, notes } = prepareElectricityLines(ocr);
  const items = lines.map((l) => {
    const it: any = { description: l.description || '', hsn_code: l.hsn_code, quantity: Number(l.quantity) > 0 ? Number(l.quantity) : undefined, unit: l.unit || undefined, validationFlags: [] };
    const h = l.hsn_code ? classifyByHSN(String(l.hsn_code)) : null;
    if (h) { it.productCategory = h.productCategory; it.scope = h.scope; it.classificationMethod = 'HSN'; }
    else { const k = classifyByKeyword(it.description); if (k) { it.productCategory = k.productCategory; it.scope = k.scope; it.fuelType = k.fuelType; it.classificationMethod = 'KEYWORD'; } }
    if (isGridRenewableLine(utilityBill, it.productCategory, it.unit)) { it.productCategory = 'ELECTRICITY'; it.scope = 2; }
    if (it.productCategory && it.quantity && it.unit && it.scope) {
      const r = calculateEmissions(it.quantity, it.unit, it.scope, it.productCategory, it.fuelType, { gridCountry: 'gridCountry' in opts ? opts.gridCountry : 'IN', activityDate: '2025-01-15' });
      if (r && r.kind === 'emission') { it.quantity = r.quantity; it.unit = r.unit; it.co2Kg = r.co2Kg; it.emissionFactor = r.emissionFactor; it.factorSource = r.factorSource; }
    }
    return it;
  });
  consolidateElectricity(items, { billedKwh: printedBilledKwh(ocr).kwh });
  const rows = buildEmissionRows({ confidence: 90, lineItems: items } as any, { documentId: 'd1', sessionId: 's1', userId: null });
  // verify-carbon evidence gate, field by field
  const gaps = rows.map(r => {
    const f: string[] = [];
    if (!(r.activity_data > 0)) f.push('qty'); if (!r.activity_unit) f.push('unit');
    if (!(r.emission_factor > 0)) f.push('factor'); if (r.category === 'other') f.push('class');
    const p = JSON.parse(r.verification_notes); if (!p.factorSource) f.push('source'); if (!p.sourceDescription) f.push('line');
    if (Math.abs(r.activity_data * r.emission_factor - r.co2_kg) > Math.max(0.01, r.co2_kg * 0.001)) f.push('maths');
    return f;
  });
  return { rows, gaps, notes, items };
}

const kg = (rows: { co2_kg: number }[]) => rows.reduce((s, r) => s + r.co2_kg, 0);

describe('electricity bills produce one verifiable record from printed units', () => {
  test('charges only, units printed in the meter box (the production failure)', () => {
    const { rows, gaps } = pipeline({ documentType: 'bill', vendor: 'MSEDCL', unitsConsumedKwh: 342, unitsConsumedText: 'Units Consumed 342',
      lineItems: [{ description: 'Energy Charges', total: 2500 }, { description: 'Fixed Charges', total: 120 }, { description: 'Electricity Duty', total: 300 }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].activity_data).toBe(342);
    expect(rows[0].activity_unit).toBe('kWh');
    expect(kg(rows)).toBeCloseTo(342 * 0.71, 6);
    expect(gaps[0]).toEqual([]);
  });
  test('quantity on the charge line with unit "Units"', () => {
    const { rows, gaps } = pipeline({ vendor: 'BESCOM', lineItems: [{ description: 'Energy charges', quantity: 342, unit: 'Units' }] });
    expect(rows).toHaveLength(1);
    expect(kg(rows)).toBeCloseTo(242.82, 6);
    expect(gaps[0]).toEqual([]);
  });
  test('model adds the consumption line and also puts units on energy charges: counted once', () => {
    const { rows } = pipeline({ vendor: 'Tata Power', unitsConsumedKwh: 342,
      lineItems: [{ description: 'Electricity consumed', hsn_code: '2716', quantity: 342, unit: 'kWh' }, { description: 'Energy charges', quantity: 342, unit: 'Units' }] });
    expect(rows).toHaveLength(1);
    expect(kg(rows)).toBeCloseTo(242.82, 6);
  });
  test('time-of-day slabs plus total: only the total counts', () => {
    const { rows } = pipeline({ vendor: 'TANGEDCO', lineItems: [
      { description: 'Electricity consumed', hsn_code: '2716', quantity: 342, unit: 'kWh' },
      { description: 'Energy charges peak', quantity: 100, unit: 'kWh' },
      { description: 'Energy charges off-peak', quantity: 242, unit: 'kWh' }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].activity_data).toBe(342);
  });
  test('slabs without a total are summed', () => {
    const { rows } = pipeline({ vendor: 'TANGEDCO', lineItems: [
      { description: 'Energy charges peak', quantity: 100, unit: 'kWh' }, { description: 'Energy charges off-peak', quantity: 242, unit: 'kWh' }] });
    expect(kg(rows)).toBeCloseTo(342 * 0.71, 6);
  });
  test('no units printed anywhere: no record, and the reason is recorded', () => {
    const { rows, notes } = pipeline({ vendor: 'MSEDCL', lineItems: [{ description: 'Energy Charges', total: 2500 }] });
    expect(rows).toHaveLength(0);
    expect(notes.join(' ')).toMatch(/billed units \(kWh\) not found/);
  });
  test('"units" on a non-electricity invoice is never read as kWh', () => {
    const ocr = { vendor: 'Steel Traders', lineItems: [{ description: 'MS bolts', quantity: 10, unit: 'units' }] };
    expect(isElectricityBill(ocr)).toBe(false);
    expect(pipeline(ocr).rows).toHaveLength(0);
  });
  test('same bill, same numbers on every run', () => {
    const ocr = { vendor: 'MSEDCL', unitsConsumedKwh: '1,250', lineItems: [{ description: 'Energy Charges', total: 9000 }] };
    const first = kg(pipeline(ocr).rows);
    expect(first).toBeCloseTo(887.5, 6);
    for (let i = 0; i < 20; i++) expect(kg(pipeline(ocr).rows)).toBe(first);
  });
});

describe('electricityBillMeta', () => {
  const bill = { documentType: 'bill', vendor: 'BESCOM', lineItems: [{ description: 'Energy charges', hsn_code: '2716' }] };

  test('keeps printed billing details that pass checks', () => {
    expect(electricityBillMeta({ ...bill, billingPeriodStart: '2025-04-12', billingPeriodEnd: '2025-05-11', tariffCategory: ' LT-II  Commercial ', sanctionedLoadKw: '15' }))
      .toEqual({ billingPeriodStart: '2025-04-12', billingPeriodEnd: '2025-05-11', tariffCategory: 'LT-II Commercial', sanctionedLoadKw: 15 });
  });

  test('drops a reversed, too long or half period', () => {
    expect(electricityBillMeta({ ...bill, billingPeriodStart: '2025-05-11', billingPeriodEnd: '2025-04-12', sanctionedLoadKw: 5 })?.billingPeriodStart).toBeNull();
    expect(electricityBillMeta({ ...bill, billingPeriodStart: '2023-01-01', billingPeriodEnd: '2025-01-01', sanctionedLoadKw: 5 })?.billingPeriodEnd).toBeNull();
    expect(electricityBillMeta({ ...bill, billingPeriodStart: '2025-04-12', sanctionedLoadKw: 5 })?.billingPeriodStart).toBeNull();
  });

  test('never keeps tariff text carrying an account-like number', () => {
    expect(electricityBillMeta({ ...bill, tariffCategory: 'LT-II A/c 1234567890' })).toBeNull();
  });

  test('null for non-electricity documents or when nothing is printed', () => {
    expect(electricityBillMeta({ documentType: 'invoice', vendor: 'Steel Traders', lineItems: [{ description: 'MS rods', hsn_code: '7214' }], tariffCategory: 'X' })).toBeNull();
    expect(electricityBillMeta(bill)).toBeNull();
  });
});

describe('electricity: only grid kWh is counted, once, at the right country', () => {
  const flags = (items: { validationFlags?: string[] }[]) => items.flatMap((i) => i.validationFlags ?? []).join(' | ');

  test('billed in kVAh: no record, and the reason is recorded', () => {
    const { rows, notes } = pipeline({ vendor: 'MSEDCL', unitsConsumedKwh: 5200, unitsConsumedUnit: 'kVAh', unitsConsumedText: 'Billed Units (kVAh) 5200',
      lineItems: [{ description: 'Electricity consumed', hsn_code: '2716', quantity: 5200, unit: 'kVAh' }] });
    expect(rows).toHaveLength(0);
    expect(notes.join(' ')).toMatch(/kVAh/);
  });
  test('a kVAh line labelled with unit "units" is still not read as kWh', () => {
    const { rows } = pipeline({ vendor: 'BESCOM', lineItems: [{ description: 'Energy charges', quantity: 900, unit: 'Units', sourceText: 'Consumption 900 kVAh' }] });
    expect(rows).toHaveLength(0);
  });
  test('net units after solar export are not consumption', () => {
    const { rows, notes } = pipeline({ vendor: 'TANGEDCO', unitsConsumedKwh: 120, unitsConsumedText: 'Net Units 120',
      lineItems: [{ description: 'Net units billed', hsn_code: '2716', quantity: 120, unit: 'kWh' }] });
    expect(rows).toHaveLength(0);
    expect(notes.join(' ')).toMatch(/net/i);
  });
  test('printed billed consumption wins over lines that do not add up to it', () => {
    const { rows } = pipeline({ vendor: 'MSEDCL', unitsConsumedKwh: 500, unitsConsumedText: 'Units Consumed 500',
      lineItems: [{ description: 'Energy charges slab 1', quantity: 100, unit: 'kWh' }, { description: 'Energy charges slab 2', quantity: 300, unit: 'kWh' }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].activity_data).toBe(500);
  });
  test('an unlabelled line equal to the sum of the others is not guessed', () => {
    const { rows, items } = pipeline({ vendor: 'TANGEDCO', lineItems: [
      { description: 'Meter A', quantity: 100, unit: 'kWh', hsn_code: '2716' }, { description: 'Meter B', quantity: 200, unit: 'kWh', hsn_code: '2716' }, { description: 'Meter C', quantity: 300, unit: 'kWh', hsn_code: '2716' }] });
    expect(rows).toHaveLength(0);
    expect(flags(items)).toMatch(/total or another meter/);
  });
  test('a line labelled total replaces its slabs', () => {
    const { rows } = pipeline({ vendor: 'TANGEDCO', lineItems: [
      { description: 'Peak', quantity: 100, unit: 'kWh', hsn_code: '2716' }, { description: 'Off-peak', quantity: 200, unit: 'kWh', hsn_code: '2716' }, { description: 'Total units', quantity: 300, unit: 'kWh', hsn_code: '2716' }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].activity_data).toBe(300);
  });
  test('two meters with close but different readings both count', () => {
    const { rows } = pipeline({ vendor: 'BESCOM', lineItems: [
      { description: 'Energy charges meter 1', quantity: 1000, unit: 'kWh' }, { description: 'Energy charges meter 2', quantity: 1004, unit: 'kWh' }] });
    expect(rows.map((r) => r.activity_data).sort()).toEqual([1000, 1004]);
  });
  test('electricity outside India gets no India factor', () => {
    const ocr = { vendor: 'Con Edison', unitsConsumedKwh: 800, unitsConsumedText: 'Total usage 800 kWh', lineItems: [{ description: 'Electricity consumed', hsn_code: '2716', quantity: 800, unit: 'kWh' }] };
    expect(pipeline(ocr, { gridCountry: 'US' }).rows).toHaveLength(0);
    expect(pipeline(ocr, { gridCountry: null }).rows).toHaveLength(0);
    expect(pipeline(ocr, { gridCountry: 'IN' }).rows).toHaveLength(1);
  });
  test('solar delivered through the grid on a bill is Scope 2, not avoided', () => {
    const { rows, items } = pipeline({ vendor: 'Adani Electricity', lineItems: [{ description: 'Solar power', quantity: 5000, unit: 'kWh' }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].scope).toBe(2);
    expect(kg(rows)).toBeCloseTo(5000 * 0.71, 6);
    expect(items[0].avoidedCo2Kg).toBeUndefined();
  });
  test('solar outside a bill stays an avoided-emission line', () => {
    expect(isGridRenewableLine(false, 'SOLAR_ENERGY', 'kWh')).toBe(false);
    expect(isGridRenewableLine(true, 'SOLAR_ENERGY', 'nos')).toBe(false);
    expect(calculateEmissions(100, 'kWh', 2, 'SOLAR_ENERGY', undefined, { gridCountry: 'DE' })).toBeNull();
    expect(calculateEmissions(100, 'kWh', 2, 'SOLAR_ENERGY')).toMatchObject({ kind: 'avoided' });
  });
});
