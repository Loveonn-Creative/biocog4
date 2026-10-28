// Factor set IND_EF_2026_11 (methodology v1.2): sourced diesel, petrol and
// coal factors and grid electricity by the bill's financial year. Each value
// is re-derived here from its published inputs; the CEA figures are the
// weighted averages in CEA CO2 Baseline Database v21.0 (Table S and
// Annexure-I) and v22.0 (Table S).
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  COAL_BITUMINOUS,
  FACTOR_SET_VERSION,
  FUEL_FACTORS,
  INDIA_GRID_BY_FY,
  METHODOLOGY_VERSION_TAG,
  calculateEmissions,
  coalFactorFor,
  factorCitationFor,
  gridFactorFor,
  isPublishedFactor,
  publishedFactorFor,
  statedCoalCv,
} from '../supabase/functions/_shared/emissionFactors';
import { buildEmissionRows } from '../supabase/functions/_shared/emissionRows';
import { evidenceGaps } from '../supabase/functions/_shared/verifyGate';
import { factorCitationOf, reportFactorSources } from '../src/lib/factorCitation';

const emission = (c: ReturnType<typeof calculateEmissions>) => {
  if (!c || c.kind !== 'emission') throw new Error('expected an emission');
  return c;
};

describe('version', () => {
  test('factor set and methodology tag are bumped so records show the set they used', () => {
    expect(FACTOR_SET_VERSION).toBe('IND_EF_2026_11');
    expect(METHODOLOGY_VERSION_TAG).toBe('v1.2');
    expect(emission(calculateEmissions(1, 'litre', 1, 'FUEL', 'DIESEL')).factorSource).toBe('BIOCOG_MVR_INDIA_v1.2:DIESEL');
  });
});

describe('fuel factors and their arithmetic', () => {
  test('diesel: 43.0 TJ/Gg x 74,100 kgCO2/TJ = 3.186 kgCO2/kg x 0.83 kg/L = 2.645', () => {
    const perKg = 43.0 * 74_100 / 1e6;
    expect(perKg).toBeCloseTo(3.1863, 4);
    expect(Math.round(perKg * 0.83 * 1000) / 1000).toBe(2.645);
    expect(FUEL_FACTORS.DIESEL).toMatchObject({ value: 2.645, unit: 'litre' });
    expect(FUEL_FACTORS.DIESEL.source).toBe('IPCC 2006 Vol 2 Ch 1, Table 1.2 NCV 43.0 TJ/Gg x Table 1.4 74,100 kgCO2/TJ = 3.186 kgCO2/kg x 0.83 kg/L (CEA CO2 Baseline Database v22.0, Appendix B) = 2.645 kgCO2/L');
    expect(emission(calculateEmissions(100, 'litre', 1, 'FUEL', 'DIESEL'))).toMatchObject({ emissionFactor: 2.645, co2Kg: 264.5 });
  });
  test('petrol: 44.3 TJ/Gg x 69,300 kgCO2/TJ = 3.070 kgCO2/kg, at 1.411 kL per tonne (PPAC) = 2.176', () => {
    const perKg = 44.3 * 69_300 / 1e6;
    expect(perKg).toBeCloseTo(3.07, 3);
    expect(Math.round(perKg / 1.411 * 1000) / 1000).toBe(2.176);
    expect(FUEL_FACTORS.PETROL).toMatchObject({ value: 2.176, unit: 'litre' });
    expect(FUEL_FACTORS.PETROL.source).toContain('PPAC Ready Reckoner FY 2025-26, Table 9.2');
    expect(emission(calculateEmissions(50, 'litre', 1, 'FUEL', 'PETROL'))).toMatchObject({ emissionFactor: 2.176, co2Kg: 108.8 });
  });
  test('Indian coal default: 90.6 gCO2/MJ x 3,755 kcal/kg x 4.1868 kJ/kcal = 1.42', () => {
    expect(Math.round(90.6 * 3755 * 4.1868 / 1e6 * 100) / 100).toBe(1.42);
    expect(FUEL_FACTORS.COAL).toMatchObject({ value: 1.42, unit: 'kg' });
    expect(FUEL_FACTORS.COAL.source).toContain('Appendix B, Indian coal 90.6 gCO2/MJ x 3,755 kcal/kg x 4.1868 kJ/kcal');
  });
  test('bituminous coal: 25.8 TJ/Gg x 94,600 kgCO2/TJ = 2.44', () => {
    expect(Math.round(25.8 * 94_600 / 1e6 * 100) / 100).toBe(2.44);
    expect(COAL_BITUMINOUS).toMatchObject({ value: 2.44, unit: 'kg' });
  });
  test('every citation states its numbers, never an internal method name', () => {
    for (const f of [FUEL_FACTORS.DIESEL, FUEL_FACTORS.PETROL, FUEL_FACTORS.COAL, COAL_BITUMINOUS]) {
      expect(f.source).not.toMatch(/BIOCOG|unchanged|to be confirmed/);
      expect(f.source).toContain(String(f.value));
    }
  });
});

describe('grid electricity by Indian financial year', () => {
  test('31 March 2025 is FY 2024-25 (0.710); 1 April 2025 is FY 2025-26 (0.675)', () => {
    expect(gridFactorFor('2025-03-31')).toMatchObject({ key: 'INDIA_GRID_FY2024_25', value: 0.71, billYear: 'FY 2024-25' });
    expect(gridFactorFor('2025-04-01')).toMatchObject({ key: 'INDIA_GRID_FY2025_26', value: 0.675, billYear: 'FY 2025-26' });
    expect(emission(calculateEmissions(1000, 'kWh', 2, 'ELECTRICITY', undefined, { activityDate: '2025-03-31' }))).toMatchObject({ emissionFactor: 0.71, co2Kg: 710 });
    expect(emission(calculateEmissions(1000, 'kWh', 2, 'ELECTRICITY', undefined, { activityDate: '2025-04-01' }))).toMatchObject({ emissionFactor: 0.675, co2Kg: 675 });
  });
  test('citations name the CEA edition, table and year', () => {
    expect(INDIA_GRID_BY_FY.FY2024_25.source).toBe('CEA CO2 Baseline Database v21.0 (Nov 2025), Table S, FY 2024-25 weighted average');
    expect(INDIA_GRID_BY_FY.FY2025_26.source).toBe('CEA CO2 Baseline Database v22.0 (Aug 2026), Table S, FY 2025-26 weighted average');
    expect(INDIA_GRID_BY_FY.FY2023_24.source).toBe('CEA CO2 Baseline Database v21.0 (Nov 2025), Annexure-I, FY 2023-24 weighted average');
  });
  test('later years use the latest published figure; covered years their own; earlier years 0.710', () => {
    expect(gridFactorFor('2026-10-28')).toMatchObject({ key: 'INDIA_GRID_FY2025_26', value: 0.675, billYear: 'FY 2026-27', factorYear: 'FY 2025-26' });
    expect(gridFactorFor('2031-01-01').value).toBe(0.675);
    const annex: Record<string, number> = { '2013-06-01': 0.774, '2014-06-01': 0.779, '2015-06-01': 0.774, '2016-06-01': 0.770, '2017-06-01': 0.754, '2018-06-01': 0.744, '2019-06-01': 0.713, '2020-06-01': 0.703, '2021-06-01': 0.715, '2022-06-01': 0.716, '2023-06-01': 0.727 };
    for (const [d, v] of Object.entries(annex)) expect(gridFactorFor(d).value).toBe(v);
    expect(gridFactorFor('2013-03-31')).toMatchObject({ key: 'INDIA_GRID_FY2024_25', value: 0.71, billYear: 'FY 2012-13' });
  });
  test('the upload timestamp is used when there is no invoice date, and the note says so', () => {
    const r = emission(calculateEmissions(100, 'kWh', 2, 'ELECTRICITY', undefined, { activityDate: '2026-03-31T20:00:00.000Z', activityDateFrom: 'upload' }));
    expect(r.factorSource).toBe('BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2025_26');
    expect(r.assumption).toBe('Bill year FY 2025-26 (upload date, no invoice date read): CEA grid factor for that year');
  });
  test('electricity outside India still gets no factor', () => {
    expect(calculateEmissions(100, 'kWh', 2, 'ELECTRICITY', undefined, { gridCountry: 'DE', activityDate: '2025-05-01' })).toBeNull();
  });
});

describe('coal rule selection', () => {
  test('a stated gross calorific value is used (CEA 90.6 gCO2/MJ)', () => {
    const c = coalFactorFor('Steam coal GCV 5500 kcal/kg')!;
    expect(c.key).toBe('COAL_GCV_5500');
    expect(c.factor.value).toBe(Math.round(90.6 * 5500 * 4.1868 / 1e6 * 1e4) / 1e4);
    expect(c.assumption).toBe('Coal factor from the gross calorific value on the bill: 5500 kcal/kg');
    expect(coalFactorFor('Coal 5,800 GAR')?.key).toBe('COAL_GCV_5800');
    expect(coalFactorFor('Coal, Gross Calorific Value: 6000 kcal')?.key).toBe('COAL_GCV_6000');
  });
  test('a stated net calorific value uses IPCC 94,600 kgCO2/TJ; MJ/kg is converted', () => {
    const c = coalFactorFor('Coal (NCV: 24.5 MJ/kg)')!;
    expect(c.key).toBe('COAL_NCV_5852');
    expect(c.factor.value).toBe(Math.round(94_600 * 5852 * 4.1868 / 1e9 * 1e4) / 1e4);
    expect(statedCoalCv('NAR 4,200 kcal/kg')).toEqual({ basis: 'NCV', kcal: 4200, printed: '4,200 kcal/kg' });
  });
  test('imported, bituminous or steam coal without a calorific value: 2.44', () => {
    for (const t of ['Imported coal', 'Bituminous coal', 'Steam coal 10 MT']) {
      expect(coalFactorFor(t)).toMatchObject({ key: 'COAL_BITUMINOUS', assumption: 'Imported, bituminous or steam coal on the bill: bituminous coal factor' });
    }
  });
  test('otherwise the Indian coal default, 1.42', () => {
    expect(coalFactorFor('Coal')).toMatchObject({ key: 'COAL', assumption: 'No calorific value or coal grade on the bill: Indian coal average' });
    expect(coalFactorFor('Non coking coal ROM')?.key).toBe('COAL');
    expect(coalFactorFor(undefined)?.key).toBe('COAL');
    expect(emission(calculateEmissions(1.5, 'MT', 1, 'FUEL', 'COAL', { description: 'Coal' }))).toMatchObject({ quantity: 1500, emissionFactor: 1.42, co2Kg: 2130 });
  });
  test('lignite, anthracite, coking and sub-bituminous coal are not guessed: no factor', () => {
    for (const t of ['Lignite coal', 'Anthracite coal', 'Coking coal', 'Sub-bituminous coal']) {
      expect(coalFactorFor(t)).toBeNull();
      expect(calculateEmissions(1, 't', 1, 'FUEL', 'COAL', { description: t })).toBeNull();
    }
  });
  test('implausible calorific values are treated as not stated', () => {
    expect(statedCoalCv('GCV 120 kcal/kg')).toBeNull();
    expect(coalFactorFor('Coal GCV 99999')?.key).toBe('COAL');
  });
});

describe('verification: published factors, new and old', () => {
  const cases: Array<[number, string, number, string, string | undefined, Record<string, string>]> = [
    [100, 'litre', 1, 'FUEL', 'DIESEL', {}],
    [100, 'litre', 1, 'FUEL', 'PETROL', {}],
    [2, 't', 1, 'FUEL', 'COAL', { description: 'Coal' }],
    [2, 't', 1, 'FUEL', 'COAL', { description: 'Imported coal' }],
    [2, 't', 1, 'FUEL', 'COAL', { description: 'Coal GCV 4,850 kcal/kg' }],
    [2, 't', 1, 'FUEL', 'COAL', { description: 'Coal NCV 21 MJ/kg' }],
    [14.2, 'kg', 1, 'FUEL', 'LPG', {}],
    [10, 'kg', 1, 'FUEL', 'CNG', {}],
    ...['2010-05-01', '2013-04-01', '2016-08-01', '2020-02-29', '2023-06-01', '2025-03-31', '2025-04-01', '2026-10-28'].map((d) => [342, 'kWh', 2, 'ELECTRICITY', undefined, { activityDate: d }] as [number, string, number, string, undefined, Record<string, string>]),
  ];
  test('every factor the new code can write re-derives to itself and is accepted', () => {
    for (const [q, u, s, c, f, o] of cases) {
      const r = emission(calculateEmissions(q, u, s, c, f, o));
      expect(publishedFactorFor(r.factorSource)).toBe(r.emissionFactor);
      expect(isPublishedFactor(r.factorSource, r.emissionFactor)).toBe(true);
      expect(factorCitationFor(r.factorSource)).toBeTruthy();
    }
  });
  test('every grid year and coal key is recognised', () => {
    for (const [k, v] of Object.entries(INDIA_GRID_BY_FY)) expect(publishedFactorFor(`BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_${k}`)).toBe(v.value);
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.2:COAL_BITUMINOUS')).toBe(2.44);
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.2:COAL_GCV_5500')).toBe(2.0863);
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.2:COAL_GCV_99999')).toBeNull();
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2030_31')).toBeNull();
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_constructor')).toBeNull();
    expect(publishedFactorFor('BIOCOG_MVR_INDIA_v1.2:toString')).toBeNull();
  });

  const doc = { vendor: 'V', invoice_number: 'I-1', amount: 100, confidence: 95, document_hash: 'h'.repeat(64), invoice_date: '2025-06-01', created_at: '2025-06-02T00:00:00Z' };
  const rec = (factorSource: string, category: string, scope: number, qty: number, unit: string, factor: number) => ({
    id: 'e', document_id: 'd', category, scope, activity_data: qty, activity_unit: unit, emission_factor: factor,
    co2_kg: Math.round(qty * factor * 100) / 100, data_quality: 'high', documents: doc,
    verification_notes: JSON.stringify({ factorSource, classificationMethod: 'HSN', sourceDescription: 'line' }),
  });
  test('records saved by v1.1 and v1.0 keep verifying at the factors they were saved with', () => {
    const old = [
      rec('BIOCOG_MVR_INDIA_v1.1:DIESEL', 'fuel', 1, 100, 'litre', 2.68),
      rec('BIOCOG_MVR_INDIA_v1.1:PETROL', 'fuel', 1, 100, 'litre', 2.31),
      rec('BIOCOG_MVR_INDIA_v1.1:COAL', 'fuel', 1, 1000, 'kg', 2.42),
      rec('BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG', 'electricity', 2, 1000, 'kWh', 0.71),
      rec('BIOCOG_MVR_INDIA_v1.0:INDIA_GRID_AVG', 'electricity', 2, 1000, 'kWh', 0.708),
      rec('BIOCOG_MVR_INDIA_v1.1:CNG', 'fuel', 1, 10, 'kg', 2.75),
      rec('BIOCOG_MVR_INDIA_v1.1:LPG', 'fuel', 1, 10, 'kg', 2.98),
    ];
    for (const r of old) expect(evidenceGaps(r, false)).toEqual([]);
  });
  test('records saved by v1.2 pass at their factor and a changed factor is caught', () => {
    expect(evidenceGaps(rec('BIOCOG_MVR_INDIA_v1.2:DIESEL', 'fuel', 1, 100, 'litre', 2.645), false)).toEqual([]);
    expect(evidenceGaps(rec('BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2025_26', 'electricity', 2, 1000, 'kWh', 0.675), false)).toEqual([]);
    expect(evidenceGaps(rec('BIOCOG_MVR_INDIA_v1.2:COAL_GCV_5500', 'fuel', 1, 1000, 'kg', 2.0863), false)).toEqual([]);
    expect(evidenceGaps(rec('BIOCOG_MVR_INDIA_v1.2:DIESEL', 'fuel', 1, 100, 'litre', 2.68), false)).toContain('emission factor does not match the published factor for its source');
    expect(evidenceGaps(rec('BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2025_26', 'electricity', 2, 1000, 'kWh', 0.71), false)).toContain('emission factor does not match the published factor for its source');
  });
});

describe('emission rows (golden)', () => {
  const items = [
    { description: 'HSD Diesel', hsn_code: '2710', quantity: 1250, unit: 'litre', productCategory: 'FUEL', scope: 1, ...pick(calculateEmissions(1250, 'litre', 1, 'FUEL', 'DIESEL')), classificationMethod: 'HSN' as const, basis: 'read_from_bill', basisLabel: 'Read from bill', assumptions: [] },
    { description: 'Units consumed', hsn_code: '2716', quantity: 4200, unit: 'kWh', productCategory: 'ELECTRICITY', scope: 2, ...pick(calculateEmissions(4200, 'kWh', 2, 'ELECTRICITY', undefined, { activityDate: '2025-04-01' })), classificationMethod: 'HSN' as const, assumptions: ['Grid factor for IN', 'Bill year FY 2025-26 (invoice date): CEA grid factor for that year'] },
    { description: 'Coal', quantity: 10000, unit: 'kg', productCategory: 'FUEL', scope: 1, ...pick(calculateEmissions(10, 't', 1, 'FUEL', 'COAL', { description: 'Coal' })), classificationMethod: 'KEYWORD' as const, assumptions: ['No calorific value or coal grade on the bill: Indian coal average'] },
  ];
  function pick(c: ReturnType<typeof calculateEmissions>) {
    const e = emission(c);
    return { co2Kg: e.co2Kg, emissionFactor: e.emissionFactor, factorSource: e.factorSource };
  }
  test('rows carry the v1.2 key, factor set, citation and rule, byte for byte', () => {
    const rows = buildEmissionRows({ confidence: 90, documentKind: 'tax_invoice', methodology: { factorVersion: FACTOR_SET_VERSION }, lineItems: items }, { documentId: 'doc-1', sessionId: null, userId: 'user-1' });
    expect(rows.map((r) => [r.category, r.activity_data, r.activity_unit, r.emission_factor, r.co2_kg])).toEqual([
      ['fuel', 1250, 'litre', 2.645, 3306.25],
      ['electricity', 4200, 'kWh', 0.675, 2835],
      ['fuel', 10000, 'kg', 1.42, 14200],
    ]);
    expect(rows.map((r) => r.verification_notes)).toEqual([
      '{"factorSource":"BIOCOG_MVR_INDIA_v1.2:DIESEL","classificationMethod":"HSN","hsnCode":"2710","sourceDescription":"HSD Diesel","basis":"read_from_bill","basisLabel":"Read from bill","factorSetVersion":"IND_EF_2026_11","assumptions":[],"factorCitation":"IPCC 2006 Vol 2 Ch 1, Table 1.2 NCV 43.0 TJ/Gg x Table 1.4 74,100 kgCO2/TJ = 3.186 kgCO2/kg x 0.83 kg/L (CEA CO2 Baseline Database v22.0, Appendix B) = 2.645 kgCO2/L"}',
      '{"factorSource":"BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2025_26","classificationMethod":"HSN","hsnCode":"2716","sourceDescription":"Units consumed","factorSetVersion":"IND_EF_2026_11","assumptions":["Grid factor for IN","Bill year FY 2025-26 (invoice date): CEA grid factor for that year"],"factorCitation":"CEA CO2 Baseline Database v22.0 (Aug 2026), Table S, FY 2025-26 weighted average"}',
      '{"factorSource":"BIOCOG_MVR_INDIA_v1.2:COAL","classificationMethod":"KEYWORD","hsnCode":null,"sourceDescription":"Coal","factorSetVersion":"IND_EF_2026_11","assumptions":["No calorific value or coal grade on the bill: Indian coal average"],"factorCitation":"CEA CO2 Baseline Database v22.0 (Aug 2026), Appendix B, Indian coal 90.6 gCO2/MJ x 3,755 kcal/kg x 4.1868 kJ/kcal = 1.42 kgCO2/kg"}',
    ]);
  });
});

describe('reports print the stored citation', () => {
  test('the citation from the notes, else the stored key', () => {
    const rows = [
      { factorSource: 'BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2025_26', factorCitation: factorCitationOf(JSON.stringify({ factorCitation: INDIA_GRID_BY_FY.FY2025_26.source })) },
      { factorSource: 'BIOCOG_MVR_INDIA_v1.2:DIESEL', factorCitation: factorCitationOf(JSON.stringify({ factorCitation: FUEL_FACTORS.DIESEL.source })) },
      { factorSource: 'BIOCOG_MVR_INDIA_v1.2:INDIA_GRID_FY2025_26', factorCitation: INDIA_GRID_BY_FY.FY2025_26.source },
      { factorSource: 'BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG', factorCitation: null },
      { factorSource: null, factorCitation: null },
    ];
    expect(reportFactorSources(rows)).toEqual([INDIA_GRID_BY_FY.FY2025_26.source, FUEL_FACTORS.DIESEL.source, 'BIOCOG_MVR_INDIA_v1.1:INDIA_GRID_AVG']);
  });
  test('reading the notes: method names and broken notes are not citations', () => {
    expect(factorCitationOf('{"factorCitation":"BIOCOG_MVR_INDIA v1.0 (unchanged)"}')).toBeNull();
    expect(factorCitationOf('{"factorCitation":"IPCC 2006 V2 Tables 1.2/1.4: LPG"}')).toBe('IPCC 2006 V2 Tables 1.2/1.4: LPG');
    expect(factorCitationOf('not json')).toBeNull();
    expect(factorCitationOf(null)).toBeNull();
    expect(factorCitationOf('{"factorCitation":""}')).toBeNull();
  });
  test('the hook builds the report sources from the emission notes', () => {
    const hook = readFileSync('src/hooks/useReportEvidence.ts', 'utf8');
    expect(hook).toContain('factorCitationOf(e.verification_notes)');
    expect(hook).toContain('reportFactorSources(citedEvidence)');
  });
});

describe('pending migration matches the code', () => {
  const sql = readFileSync('supabase/pending-migrations/20261115100000_factor_corrections_unverified.sql', 'utf8');
  const dry = readFileSync('supabase/pending-migrations/factor_corrections_dry_run.sql', 'utf8');
  test('every grid year, value and citation is the one the code uses', () => {
    for (const [k, v] of Object.entries(INDIA_GRID_BY_FY)) {
      expect(sql).toContain(`(${k.slice(2, 6)}, 'INDIA_GRID_${k}', ${v.value.toFixed(3)}, '${v.source}')`);
    }
  });
  test('diesel, petrol and coal values and citations are the ones the code uses', () => {
    for (const k of ['DIESEL', 'PETROL', 'COAL'] as const) expect(sql).toContain(`'${k}', `);
    expect(sql).toContain(`'litre', 2.645, '${FUEL_FACTORS.DIESEL.source}'`);
    expect(sql).toContain(`'litre', 2.176, '${FUEL_FACTORS.PETROL.source}'`);
    expect(sql).toContain(`'kg', 1.42, '${FUEL_FACTORS.COAL.source}'`);
    expect(sql).toContain(`'${coalFactorFor('Coal')!.assumption}'`);
    expect(sql).toContain("SET LOCAL app.change_reason = 'factor correction IND_EF_2026_11'");
    expect(sql).toContain("'factorSetVersion', 'IND_EF_2026_11'");
  });
  test('the grid notes the migration writes are the code\'s wording', () => {
    const a = (d: string, from: 'invoice' | 'upload') => emission(calculateEmissions(1, 'kWh', 2, 'ELECTRICITY', undefined, { activityDate: d, activityDateFrom: from })).assumption!;
    expect(a('2025-03-31', 'invoice')).toBe('Bill year FY 2024-25 (invoice date): CEA grid factor for that year');
    expect(a('2026-10-20', 'upload')).toBe('Bill year FY 2026-27 (upload date, no invoice date read): latest CEA grid factor, FY 2025-26');
    expect(a('2010-06-01', 'invoice')).toBe('Bill year FY 2010-11 (invoice date): CEA lists no factor for that year; FY 2024-25 factor used');
    for (const s of ['CEA grid factor for that year', 'latest CEA grid factor, FY 2025-26', 'CEA lists no factor for that year; FY 2024-25 factor used', 'upload date, no invoice date read']) expect(sql).toContain(s);
  });
  test('the dry run builds exactly the migration\'s plan', () => {
    const block = (s: string) => s.slice(s.indexOf('CREATE OR REPLACE FUNCTION pg_temp.try_jsonb'), s.indexOf('FROM planned p;') + 'FROM planned p;'.length);
    expect(block(dry)).toBe(block(sql));
    expect(dry).toContain('ROLLBACK;');
    expect(dry).not.toMatch(/UPDATE public\.emissions|INSERT INTO public\./);
  });
});
