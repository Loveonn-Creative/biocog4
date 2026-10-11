import { describe, expect, test } from 'bun:test';
import { prepareElectricityLines, consolidateElectricity, isElectricityBill, type RawOcr } from '../supabase/functions/_shared/electricityBill';
import { calculateEmissions, classifyByHSN, classifyByKeyword } from '../supabase/functions/_shared/emissionFactors';
import { buildEmissionRows } from '../src/lib/mrvPersistence';

// Mirrors extract-document's deterministic steps (classification is copied in
// shape from the function), then the client row builder, then the
// verification evidence gate. Everything after the model's reading.
function pipeline(ocr: RawOcr) {
  const { lines, notes } = prepareElectricityLines(ocr);
  const items = lines.map((l) => {
    const it: any = { description: l.description || '', hsn_code: l.hsn_code, quantity: Number(l.quantity) > 0 ? Number(l.quantity) : undefined, unit: l.unit || undefined, validationFlags: [] };
    const h = l.hsn_code ? classifyByHSN(String(l.hsn_code)) : null;
    if (h) { it.productCategory = h.productCategory; it.scope = h.scope; it.classificationMethod = 'HSN'; }
    else { const k = classifyByKeyword(it.description); if (k) { it.productCategory = k.productCategory; it.scope = k.scope; it.fuelType = k.fuelType; it.classificationMethod = 'KEYWORD'; } }
    if (it.productCategory && it.quantity && it.unit && it.scope) {
      const r = calculateEmissions(it.quantity, it.unit, it.scope, it.productCategory, it.fuelType);
      if (r && r.kind === 'emission') { it.quantity = r.quantity; it.unit = r.unit; it.co2Kg = r.co2Kg; it.emissionFactor = r.emissionFactor; it.factorSource = r.factorSource; }
    }
    return it;
  });
  consolidateElectricity(items);
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
  return { rows, gaps, notes };
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
