import { describe, expect, test } from 'bun:test';
import { prepareElectricityLines } from '../supabase/functions/_shared/electricityBill';
import { calculateEmissions, classifyByHSN } from '../supabase/functions/_shared/emissionFactors';

// Discom bills (e.g. JdVVNL) print consumption on the "Energy Charges" line
// with kWh and no HSN. That line must be read as grid electricity (Scope 2).
describe('Energy Charges line on a discom bill', () => {
  const ocr = {
    documentType: 'invoice',
    vendor: 'JODHPUR VIDYUT VITRAN NIGAM LIMITED',
    unitsConsumedKwh: 18303,
    lineItems: [
      { description: 'Energy Charges', quantity: 18303, unit: 'kWh', hsn_code: null, total: 118969.5 },
      { description: 'Fixed Charges', quantity: null, unit: null, total: 5000 },
    ],
  };
  test('gets the electricity HSN and is calculated once at the India grid factor', () => {
    const { lines } = prepareElectricityLines(ocr);
    const energy = lines.filter(l => l.hsn_code === '2716');
    expect(energy).toHaveLength(1);
    expect(energy[0].quantity).toBe(18303);
    const cls = classifyByHSN('2716')!;
    expect(cls.productCategory).toBe('ELECTRICITY');
    const r = calculateEmissions(18303, 'kWh', 2, 'ELECTRICITY', undefined, { gridCountry: 'IN' });
    expect(r && r.kind === 'emission' && r.co2Kg > 0).toBe(true);
  });
  test('a charge line without a quantity is not given a quantity', () => {
    const { lines } = prepareElectricityLines(ocr);
    const fixed = lines.find(l => l.description === 'Fixed Charges')!;
    expect(fixed.quantity).toBeNull();
    expect(fixed.hsn_code ?? null).toBeNull();
  });
});
