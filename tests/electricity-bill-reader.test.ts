// Bill reader rules approved by the owner (October 2026), pure parts:
// printed kWh on kVAh bills, kVAh x printed power factor as a labelled
// estimate, meter photos (later minus earlier reading), bill charges, and
// the data-quality and verification treatment of each basis.
import { describe, expect, test } from 'bun:test';
import {
  BASIS_LABEL, consumptionFromMeterReadings, documentCaptureOf, kwhForKvahBill, meterReadingsOf, prepareElectricityLines, printedPowerFactor,
} from '../supabase/functions/_shared/electricityBill';
import { activitiesFromBill } from '../supabase/functions/_shared/electricity';
import { BILL_CHARGE_GUIDANCE, guideDocument, guideLine } from '../supabase/functions/_shared/extractionRead';
import { buildEmissionRows } from '../supabase/functions/_shared/emissionRows';
import { evidenceGaps, validateEmission } from '../supabase/functions/_shared/verifyGate';

const kvahBill = { documentType: 'bill', vendor: 'MSEDCL', unitsConsumedKwh: 10000, unitsConsumedUnit: 'kVAh', unitsConsumedText: 'Billed 10000 kVAh',
  lineItems: [{ description: 'Electricity consumed', hsn_code: '2716', quantity: 10000, unit: 'kVAh' }] };

describe('kVAh bills', () => {
  test('printed kWh wins over the power factor', () => {
    const r = kwhForKvahBill({ kvah: 10000, activeEnergyKwh: '9,600', activeEnergyText: 'kWh 9600', powerFactor: 0.9 });
    expect(r).toMatchObject({ kwh: 9600, basis: 'read_from_bill' });
  });
  test('only PF printed: kWh = kVAh x PF, rounded to 0.01', () => {
    const r = kwhForKvahBill({ kvah: 12345, powerFactor: '0.937' });
    expect(r).toMatchObject({ kwh: 11567.27, basis: 'estimated_kvah_pf' });
    expect(r.note).toContain('Estimated: kWh worked out from kVAh x the power factor printed on the bill (kVAh × PF)');
  });
  test('an invalid power factor is never used', () => {
    expect(printedPowerFactor(1.2)).toBeNull();
    expect(printedPowerFactor(0)).toBeNull();
    expect(printedPowerFactor('lag')).toBeNull();
    expect(kwhForKvahBill({ kvah: 1000, powerFactor: 95 })).toMatchObject({ kwh: null, reason: 'kvah_needs_kwh' });
  });
  test('printed kWh larger than kVAh is rejected (PF cannot exceed 1)', () => {
    expect(kwhForKvahBill({ kvah: 1000, activeEnergyKwh: 1500, powerFactor: 0.9 })).toMatchObject({ kwh: null, reason: 'active_exceeds_apparent' });
  });
  test('a figure labelled only kVAh is not taken as printed kWh', () => {
    expect(kwhForKvahBill({ kvah: 1000, activeEnergyKwh: 1000, activeEnergyText: 'Consumption 1000 kVAh' })).toMatchObject({ kwh: null });
  });
  test('prepareElectricityLines: estimate line added, kVAh line kept as evidence and not counted', () => {
    const p = prepareElectricityLines({ ...kvahBill, powerFactor: 0.95 });
    expect(p).toMatchObject({ billedKwh: 9500, basis: 'estimated_kvah_pf', blocker: null });
    const kwhLine = p.lines.find((l) => l.unit === 'kWh');
    expect(kwhLine).toMatchObject({ quantity: 9500, hsn_code: '2716', basis: 'estimated_kvah_pf', basisLabel: BASIS_LABEL.estimated_kvah_pf });
    const kvahLine = p.lines.find((l) => l.printedUnit === 'kVAh');
    expect(kvahLine).toMatchObject({ quantity: null, printedQuantity: 10000 });
  });
  test('kVAh on a line only (no billed figure), PF printed', () => {
    const p = prepareElectricityLines({ vendor: 'BESCOM', powerFactor: 0.9, lineItems: [{ description: 'Energy charges', quantity: 900, unit: 'Units', sourceText: 'Consumption 900 kVAh' }] });
    expect(p.billedKwh).toBe(810);
  });
  test('neither printed: blocker, friendly guidance, reading again would not help', () => {
    const p = prepareElectricityLines(kvahBill);
    expect(p.blocker).toBe('kvah_needs_kwh');
    expect(p.lines.some((l) => l.unit === 'kWh')).toBe(false);
    const g = guideDocument([{ description: 'Electricity consumed', productCategory: 'ELECTRICITY', quantity: 10000, unit: 'kVAh', validationFlags: ['No verified factor for ELECTRICITY with unit kVAh'] }], { electricityBill: true, blocker: p.blocker });
    expect(g.nextStep).toBe('Your bill is in kVAh. We need the kWh or power factor printed on it — usually near the meter readings.');
    expect(g.deterministicBlocker).toBe(true);
  });
  test('kvarh is never converted', () => {
    const p = prepareElectricityLines({ vendor: 'MSEDCL', powerFactor: 0.9, lineItems: [{ description: 'Reactive energy', hsn_code: '2716', quantity: 500, unit: 'kvarh' }] });
    expect(p.billedKwh).toBeNull();
    expect(p.lines[0].unit).toBe('kvarh');
  });
  test('Scope 2 engine: kVAh x PF gives valid kWh, with the kVAh kept as printed and the label in the source text', () => {
    const [a] = activitiesFromBill({ ...kvahBill, currency: 'INR', powerFactor: 0.95, billingPeriodStart: '2026-08-01', billingPeriodEnd: '2026-08-31' }, 'India');
    expect(a).toMatchObject({ kwh: 9500, status: 'valid', quantityPrinted: 10000, unitPrinted: 'kVAh', basis: 'estimated_kvah_pf' });
    expect(a.sourceText).toMatch(/^Estimated/);
    const [b] = activitiesFromBill({ ...kvahBill, currency: 'INR', billingPeriodStart: '2026-08-01', billingPeriodEnd: '2026-08-31' }, 'India');
    expect(b.status).toBe('needs_data');
    expect(b.reasons).toContain('apparent_or_reactive_energy');
  });
});

describe('meter photos', () => {
  const photo = (readings: any[]) => ({ documentType: 'bill', documentCapture: 'meter_photo', lineItems: [{ description: 'Meter', quantity: 48215, unit: 'kWh' }], meterReadings: readings });
  test('two readings: later minus earlier, the register value itself is never consumption', () => {
    const p = prepareElectricityLines(photo([{ readingKwh: 1200, readingDate: null }, { readingKwh: 1530.5, readingDate: null }]));
    expect(p.billedKwh).toBe(330.5);
    expect(p.lines).toHaveLength(1);
    expect(p.lines[0]).toMatchObject({ quantity: 330.5, basis: 'meter_readings', basisLabel: 'Calculated from two meter readings in the photo' });
  });
  test('dated readings give the period', () => {
    const p = prepareElectricityLines(photo([{ readingKwh: 1530, readingDate: '2026-09-01' }, { readingKwh: 1200, readingDate: '2026-08-01' }]));
    expect(p.readingPeriod).toEqual({ start: '2026-08-01', end: '2026-09-01' });
  });
  test('one reading: no consumption, asks for the previous reading', () => {
    const p = prepareElectricityLines(photo([{ readingKwh: 1200, readingDate: null }]));
    expect(p).toMatchObject({ billedKwh: null, blocker: 'single_meter_reading' });
    expect(p.lines).toHaveLength(0);
    expect(guideDocument([], { electricityBill: true, blocker: p.blocker })).toMatchObject({ nextStep: 'Add your previous meter reading or the bill for this period.', deterministicBlocker: true });
  });
  test('negative and implausible differences are rejected', () => {
    expect(consumptionFromMeterReadings([{ readingKwh: 900, readingDate: '2026-09-01' }, { readingKwh: 1000, readingDate: '2026-08-01' }])).toMatchObject({ kwh: null, reason: 'not_increasing' });
    expect(consumptionFromMeterReadings([{ readingKwh: 10, readingDate: null }, { readingKwh: 5_000_000, readingDate: null }])).toMatchObject({ kwh: null, reason: 'implausible' });
    expect(consumptionFromMeterReadings([{ readingKwh: 100, readingDate: '2026-08-01' }, { readingKwh: 900_000, readingDate: '2026-08-02' }])).toMatchObject({ kwh: null, reason: 'implausible' });
    expect(consumptionFromMeterReadings([{ readingKwh: 100, readingDate: '2026-08-01' }, { readingKwh: 200, readingDate: '2026-08-01' }])).toMatchObject({ kwh: null, reason: 'implausible' });
    expect(consumptionFromMeterReadings([{ readingKwh: 1, readingDate: null }, { readingKwh: 2, readingDate: null }, { readingKwh: 3, readingDate: null }])).toMatchObject({ kwh: null, reason: 'too_many_readings' });
    const p = prepareElectricityLines(photo([{ readingKwh: 900, readingDate: '2026-09-01' }, { readingKwh: 1000, readingDate: '2026-08-01' }]));
    expect(p.blocker).toBe('meter_readings_unusable');
  });
  test('text that may carry a meter number is not kept', () => {
    expect(meterReadingsOf([{ readingKwh: 1200, sourceText: 'Meter No 99887766 reading 1200' }])[0].sourceText).toBeNull();
  });
  test('Scope 2 engine: meter readings become one labelled activity', () => {
    const [a] = activitiesFromBill({ currency: 'INR', documentCapture: 'meter_photo', meterReadings: [{ readingKwh: 1530, readingDate: '2026-09-01' }, { readingKwh: 1200, readingDate: '2026-08-01' }], billingPeriodStart: '2026-08-01', billingPeriodEnd: '2026-09-01' }, 'India');
    expect(a).toMatchObject({ kwh: 330, basis: 'meter_readings', status: 'valid' });
  });
  test('capture field', () => {
    expect(documentCaptureOf({ documentCapture: 'Meter Photo' })).toBe('meter_photo');
    expect(documentCaptureOf({ documentCapture: null, legibility: 'handwritten' })).toBe('handwritten');
    expect(documentCaptureOf({})).toBe('printed');
  });
});

describe('bill charges', () => {
  test('a no-quantity line on an electricity bill is a bill charge, never an HSN request', () => {
    for (const d of ['Demand Charges', 'Wheeling Charge', 'FAC', 'Tax on Sale', 'Prompt Payment Discount']) {
      const g = guideLine({ description: d }, { electricityBill: true });
      expect(g).toEqual({ status: 'bill_charge', need: null, nextStep: BILL_CHARGE_GUIDANCE });
    }
    expect(guideLine({ description: 'Electricity Duty', productCategory: 'ELECTRICITY' }, { electricityBill: true }).status).toBe('bill_charge');
    const doc = guideDocument([{ description: 'Demand Charges' }, { description: 'FAC' }, { description: 'Electricity consumed', productCategory: 'ELECTRICITY', quantity: 100, unit: 'kWh', co2Kg: 71 }], { electricityBill: true });
    expect(doc).toMatchObject({ counted: 1, billCharges: 2, unclassified: 0, needsData: 0, nextStep: null });
  });
  test('net units only: a blocker on the document, so reading again is not offered', () => {
    const p = prepareElectricityLines({ vendor: 'BESCOM', lineItems: [{ description: 'Net units', hsn_code: '2716', quantity: 120, unit: 'kWh' }] });
    expect(p.blocker).toBe('net_units');
    expect(guideDocument([{ description: 'Net units', productCategory: 'ELECTRICITY' }], { electricityBill: true, blocker: p.blocker })).toMatchObject({ deterministicBlocker: true });
  });
  test('outside an electricity bill nothing changes', () => {
    expect(guideLine({ description: 'Consulting fee' }).status).toBe('unclassified');
  });
});

describe('basis: data quality and verification', () => {
  const base = { productCategory: 'ELECTRICITY', scope: 2, quantity: 9500, unit: 'kWh', co2Kg: 6745, emissionFactor: 0.71, factorSource: 'BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG', classificationMethod: 'HSN' as const };
  const rows = (basis: string) => buildEmissionRows({ confidence: 90, lineItems: [{ description: 'Electricity consumed (kWh)', ...base, basis, basisLabel: BASIS_LABEL[basis as keyof typeof BASIS_LABEL] }] }, { documentId: 'd', sessionId: null, userId: 'u' });
  test('estimated, handwritten and meter-reading rows rank below a printed reading', () => {
    expect(rows('read_from_bill')[0].data_quality).toBe('high');
    for (const b of ['estimated_kvah_pf', 'handwritten', 'meter_readings']) expect(rows(b)[0].data_quality).toBe('medium');
    const notes = JSON.parse(rows('estimated_kvah_pf')[0].verification_notes);
    expect(notes).toMatchObject({ basis: 'estimated_kvah_pf', basisLabel: BASIS_LABEL.estimated_kvah_pf, sourceDescription: 'Electricity consumed (kWh)' });
  });
  test('the verify gate accepts them (evidence on file) with a lower score than printed', () => {
    const rec = (basis: string) => {
      const r = rows(basis)[0];
      return { ...r, id: basis, documents: { vendor: 'MSEDCL', invoice_number: 'B1', amount: 1, confidence: 90, document_hash: 'h' } };
    };
    const printed = validateEmission(rec('read_from_bill'));
    const estimated = validateEmission(rec('estimated_kvah_pf'));
    expect(estimated.valid).toBe(true);
    expect(estimated.confidence).toBeLessThan(printed.confidence);
    expect(estimated.flags.join(' ')).toMatch(/lower data quality/);
    expect(evidenceGaps(rec('estimated_kvah_pf'), false)).toEqual([]);
    expect(evidenceGaps(rec('meter_readings'), false)).toEqual([]);
  });
});
