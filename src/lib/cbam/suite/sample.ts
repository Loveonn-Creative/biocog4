// An illustrative workbook so the suite opens on a working model. Every
// quantity here is made up for demonstration and is labelled as such in the UI;
// none of it is data from a real plant. Factors are cited: natural gas from the
// platform's shared factor table, the purchased billet on the India default value, and the
// electricity factor from CEA (an option under D.4(b) "other public data").
import { FUEL_FACTORS } from '../../../../supabase/functions/_shared/emissionFactors';
import { WORKBOOK_SCHEMA, type Installation, type Verification, type Workbook } from './types';

export const emptyInstallation = (): Installation => ({
  nameEn: '', street: '', city: '', postcode: '', country: 'IN', economicActivity: '',
  periodStart: '2026-01-01', periodEnd: '2026-12-31',
});

export const emptyVerification = (): Verification => ({
  mode: 'senseible',
  internal: { checklist: {}, siteVisit: '', siteVisitJustification: '', misstatements: [], reviewerName: '', reviewerRole: '', date: '' },
  external: { company: '', accreditationState: '', accreditationBody: '', registrationNumber: '', opinion: '', date: '', reportReference: '' },
});

export const uid = () => Math.random().toString(36).slice(2, 10);

export function emptyWorkbook(): Workbook {
  const now = new Date().toISOString();
  return {
    schema: WORKBOOK_SCHEMA, id: uid(), sample: false, createdAt: now, updatedAt: now,
    installation: emptyInstallation(), streams: [], processes: [],
    dataQuality: { general: '', defaultJustification: '', qualityAssurance: '' },
    verification: emptyVerification(), log: [{ at: now, action: 'Workbook created' }],
  };
}

export function sampleWorkbook(): Workbook {
  const now = new Date().toISOString();
  return {
    schema: WORKBOOK_SCHEMA, id: 'sample', sample: true, createdAt: now, updatedAt: now,
    installation: {
      nameEn: 'Example re-rolling mill', street: 'Plot 0, Industrial Area', city: 'Example City', postcode: '000000',
      country: 'IN', economicActivity: 'Hot rolling of steel billets', periodStart: '2026-01-01', periodEnd: '2026-12-31',
    },
    streams: [
      {
        id: 's-gas', name: 'Natural gas, reheating furnace', method: 'factor', fuel: 'CNG', ad: 1450000, adUnit: 'kg',
        factorSource: FUEL_FACTORS.CNG.source,
        allocations: [{ processId: 'p-wire', share: 0.6 }, { processId: 'p-bar', share: 0.4 }],
      },
      {
        id: 's-diesel', name: 'Diesel, loaders and gensets', method: 'factor', fuel: 'DIESEL', ad: 85000, adUnit: 'litre',
        factorSource: FUEL_FACTORS.DIESEL.source,
        allocations: [{ processId: 'p-wire', share: 0.5 }, { processId: 'p-bar', share: 0.5 }],
      },
    ],
    processes: [
      {
        id: 'p-wire', name: 'Wire rod mill', category: 'Iron or steel products', sector: 'iron_steel', route: 'All production routes',
        goods: [{ id: 'g1', cn: '72139110', name: 'Wire rod', tonnes: 24000 }],
        precursors: [{ id: 'pr1', kind: 'purchased', name: 'Billets', cn: '72071114', country: 'IN', basis: 'default', quantity: 25200, year: 2026 }],
        electricity: { mwh: 2900, ef: 0.71, efSource: 'D.4(b)', evidence: 'CEA CO2 Baseline Database, weighted average' },
      },
      {
        id: 'p-bar', name: 'Bar mill', category: 'Iron or steel products', sector: 'iron_steel', route: 'All production routes',
        goods: [{ id: 'g2', cn: '72142000', name: 'TMT bars', tonnes: 16000 }],
        precursors: [{ id: 'pr2', kind: 'purchased', name: 'Billets', cn: '72071114', country: 'IN', basis: 'supplier', quantity: 16800, seeDirect: 2.4, seeIndirect: 0.3, sefa: 0.183, benchmarkRoute: '(C)', evidence: 'Supplier operator emissions report (illustrative)', year: 2026 }],
        electricity: { mwh: 1800, ef: 0.71, efSource: 'D.4(b)', evidence: 'CEA CO2 Baseline Database, weighted average' },
      },
    ],
    dataQuality: { general: 'Mostly measurements & international standard factors for e.g. the emission factor', defaultJustification: 'Supplier data not yet received for part of the billets', qualityAssurance: 'Four eyes principle' },
    verification: emptyVerification(),
    log: [{ at: now, action: 'Sample loaded (illustrative values)' }],
  };
}
