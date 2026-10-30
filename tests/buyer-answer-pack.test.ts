import { describe, expect, it } from 'bun:test';
import {
  BUYER_PACK_REPORT, NO_INSTRUMENTS, VERIFIED_MEANS, buildBuyerAnswerPack, buyerPackSheet, ghgCategoryOf, packFieldStatus,
  type BuyerAnswerPack,
} from '../src/lib/buyerAnswerPack';
import { reportDownloadKey, reportIdFor } from '../supabase/functions/_shared/reportDownloadKey';
import type { ReportDataset } from '../src/lib/frameworkReports';
import type { Scope2Summary } from '../src/lib/scope2Summary';

const sampleDataset: ReportDataset = {
  draft: false, organizationName: 'Shree Ganesh Castings Pvt Ltd', gstin: '27ABCDE1234F1Z5', sector: 'Iron and steel casting', size: 'small',
  country: 'IN', locale: 'en-IN', generatedAt: '2026-10-25T10:00:00Z', periodStart: '2025-04-01', periodEnd: '2026-03-31',
  scope1Kg: 11260, scope2Kg: 28400, scope3Kg: 4200, totalKg: 43860,
  categories: [
    { category: 'Grid electricity', scope: 2, co2Kg: 28400, activityData: 40000, activityUnit: 'kWh', emissionFactor: 0.71, dataQuality: 'bill', verified: true },
    { category: 'Diesel (DG set)', scope: 1, co2Kg: 8000, activityData: 3025, activityUnit: 'litres', emissionFactor: 2.645, dataQuality: 'invoice', verified: true },
    { category: 'LPG', scope: 1, co2Kg: 3260, activityData: 1100, activityUnit: 'kg', emissionFactor: 2.96, dataQuality: 'invoice', verified: true },
    { category: 'Road freight', scope: 3, co2Kg: 4200, activityData: 51000, activityUnit: 'tkm', emissionFactor: 0.0823, dataQuality: 'invoice', verified: true },
  ],
  evidence: [
    { emissionId: 'e1', documentHash: 'h1', invoiceNumber: 'INV-1042', vendor: 'Indian Oil', invoiceDate: '2025-06-12', co2Kg: 8000, scope: 1, category: 'Diesel (DG set)', factorSource: 'IPCC 2006', verificationStatus: 'verified' },
    { emissionId: 'e2', documentHash: 'h2', invoiceNumber: 'GAS-11', vendor: 'HP Gas', invoiceDate: '2025-07-02', co2Kg: 3260, scope: 1, category: 'LPG', factorSource: 'IPCC 2006', verificationStatus: 'verified' },
    { emissionId: 'e3', documentHash: 'h3', invoiceNumber: 'MSEDCL-07', vendor: 'MSEDCL', invoiceDate: '2025-07-31', co2Kg: 28400, scope: 2, category: 'Grid electricity', factorSource: 'CEA v21', verificationStatus: 'verified' },
    { emissionId: 'e4', documentHash: 'h4', invoiceNumber: 'LR-5521', vendor: 'VRL Logistics', invoiceDate: '2025-08-20', co2Kg: 4200, scope: 3, category: 'Road freight', factorSource: 'GLEC', verificationStatus: 'verified' },
    { emissionId: 'e5', documentHash: 'h5', invoiceNumber: 'INV-2001', vendor: 'Indian Oil', invoiceDate: '2025-09-12', co2Kg: 2000, scope: 1, category: 'Diesel (DG set)', factorSource: 'IPCC 2006', verificationStatus: 'pending' },
  ],
  availability: { scope1: true, scope2: true, scope3: true, intensity: false, targets: true, governance: false, risks: false, energy: true, productLevel: false },
  methodologyVersion: 'v1.2', factorSources: ['IPCC 2006 Guidelines', 'CEA CO2 Baseline Database v21.0'],
  verification: { status: 'verified', score: 0.92, greenwashingRisk: 'low', cctsEligible: null, cbamCompliant: null, verifiedAt: '2026-09-30T10:00:00Z' },
  target: { baselineCo2Kg: 43860, targetReductionPct: 30, targetDate: '2031-03-31', progressPct: 12 },
};

const sampleScope2: Scope2Summary = {
  enabled: true,
  years: [{ year: 'FY2025-26', location: { kwh: 40000, kg: 28400, unresolvedKwh: 0, instrumentKwh: 0 }, market: { kwh: 40000, kg: 17040, unresolvedKwh: 0, instrumentKwh: 16000 } }],
  warnings: [], needsData: [],
  instruments: [{ id: 'i1', type: 'eac', scheme: 'I-REC', certificateRef: 'IREC-1', mwh: 16, generationCountry: 'IN', vintageStart: '2025-04-01', vintageEnd: '2026-03-31', kgPerKwh: 0, retired: true, beneficiaryConfirmed: true, hasEvidence: true, allocatedKwh: 16000 }],
};

const section = (p: BuyerAnswerPack, n: number) => p.sections.find((s) => s.title.startsWith(`${n}.`))!;
const row = (p: BuyerAnswerPack, n: number, q: string) => section(p, n).rows.find((r) => r.question.startsWith(q));

describe('buyer answer pack', () => {
  it('keeps the nine sections in questionnaire order', () => {
    const p = buildBuyerAnswerPack(sampleDataset);
    expect(p.sections.map((s) => s.title.split('.')[0])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    p.sections.forEach((s) => s.rows.forEach((r) => { expect(r.answer.length).toBeGreaterThan(0); expect(r.basis.length).toBeGreaterThan(0); }));
  });

  it('fills period, organisation and Scope 1 with top sources', () => {
    const p = buildBuyerAnswerPack(sampleDataset);
    expect(row(p, 1, 'Reporting period')!.answer).toBe('1 Apr 2025 to 31 Mar 2026');
    expect(row(p, 2, 'GSTIN')!.answer).toBe('27ABCDE1234F1Z5');
    expect(row(p, 2, 'Sector')!.answer).toBe('Iron and steel casting');
    expect(row(p, 3, 'Gross Scope 1')!).toMatchObject({ answer: '11.26 tCO2e', tonnes: 11.26 });
    expect(row(p, 3, 'Gross Scope 1')!.basis).toStartWith('2 verified records');
    expect(row(p, 3, 'Scope 1 by fuel')!.answer).toBe('Diesel (DG set): 8.00 tCO2e (71%); LPG: 3.26 tCO2e (29%)');
  });

  it('leaves GSTIN out when there is none and marks a missing sector', () => {
    const p = buildBuyerAnswerPack({ ...sampleDataset, gstin: null, sector: null });
    expect(row(p, 2, 'GSTIN')).toBeUndefined();
    expect(row(p, 2, 'Sector')!.filled).toBe(false);
  });

  it('says market-based is not available without renewable purchase records', () => {
    for (const scope2 of [undefined, null, { ...sampleScope2, instruments: [] }, { ...sampleScope2, enabled: false }]) {
      const p = buildBuyerAnswerPack(sampleDataset, { scope2 });
      expect(row(p, 4, 'Gross Scope 2 emissions, location-based')!.answer).toBe('28.40 tCO2e');
      const m = row(p, 4, 'Gross Scope 2 emissions, market-based, and')!;
      expect(m.answer).toBe('Not reported: no renewable electricity certificate, power purchase agreement or green tariff on record');
      expect(m.answer).toBe(NO_INSTRUMENTS);
      expect(m.filled).toBe(false);
      expect(row(p, 4, 'Renewable electricity share')).toBeUndefined();
    }
  });

  it('gives market-based Scope 2 and renewable share when instruments exist', () => {
    const p = buildBuyerAnswerPack(sampleDataset, { scope2: sampleScope2 });
    expect(row(p, 4, 'Gross Scope 2 emissions, market-based')!).toMatchObject({ answer: 'FY 2025-26: 17.04 tCO2e', tonnes: 17.04, filled: true });
    expect(row(p, 4, 'Renewable electricity share')!.answer).toBe('FY 2025-26: 40% (16,000 of 40,000 kWh)');
    expect(row(p, 4, 'Gross Scope 2 emissions, market-based, and')).toBeUndefined();
  });

  it('lists Scope 3 by GHG category, only categories with records', () => {
    const p = buildBuyerAnswerPack(sampleDataset);
    const s3 = section(p, 5).rows;
    expect(s3.map((r) => r.question)).toEqual(['Category 4: Upstream transportation and distribution', 'Total Scope 3 emissions']);
    expect(s3[0].answer).toBe('4.20 tCO2e');
    // The invoice-line results win when they exist.
    const lines = buildBuyerAnswerPack(sampleDataset, { scope3: { enabled: true, categories: [{ category: 1, kg: 2500, lines: 3 }, { category: 4, kg: 1700, lines: 2 }, { category: 6, kg: 0, lines: 0 }] } });
    expect(section(lines, 5).rows.map((r) => r.question)).toEqual(['Category 1: Purchased goods and services', 'Category 4: Upstream transportation and distribution', 'Total Scope 3 emissions']);
    expect(section(lines, 5).rows[0].basis).toBe('3 verified invoice lines × published emission factors');
  });

  it('never guesses a category and says when there is no Scope 3', () => {
    expect(ghgCategoryOf('Road freight')).toBe(4);
    expect(ghgCategoryOf('Business air travel')).toBe(6);
    expect(ghgCategoryOf('Waste disposal')).toBe(5);
    expect(ghgCategoryOf('Steel coil')).toBeNull();
    const odd = buildBuyerAnswerPack({ ...sampleDataset, categories: [...sampleDataset.categories.filter((c) => c.scope !== 3), { ...sampleDataset.categories[3], category: 'Steel coil' }] });
    expect(section(odd, 5).rows[0]).toMatchObject({ question: 'Not sorted into a GHG category yet', filled: false });
    const none = buildBuyerAnswerPack({ ...sampleDataset, scope3Kg: 0, categories: sampleDataset.categories.filter((c) => c.scope !== 3) });
    expect(section(none, 5).rows).toHaveLength(1);
    expect(section(none, 5).rows[0]).toMatchObject({ answer: 'None on record', filled: false });
  });

  it('states methodology, verified share with the existing wording, and the target', () => {
    const p = buildBuyerAnswerPack(sampleDataset);
    expect(row(p, 6, 'Standard')!.answer).toContain('GHG Protocol');
    expect(row(p, 6, 'Emission factor sources')!.answer).toBe('IPCC 2006 Guidelines; CEA CO2 Baseline Database v21.0');
    expect(row(p, 6, 'Methodology version')!.answer).toBe('v1.2');
    expect(row(p, 7, 'Share of records verified')!.answer).toBe('4 of 5 records (80%)');
    expect(row(p, 7, 'Share of emissions verified')!.answer).toBe('96% of recorded tCO2e');
    expect(row(p, 7, 'Who verified')!.answer).toBe('Senseible, expert-supervised');
    expect(row(p, 7, 'What verified means')!.answer).toBe(VERIFIED_MEANS);
    expect(VERIFIED_MEANS).toContain('rule checks passed against the source document; it is not third-party assurance');
    expect(row(p, 7, 'Third-party verification or assurance')!.answer).toBe('None');
    // Totals count verified records only; the pending one is named, not hidden.
    expect(section(p, 7).note).toBe('The Scope 1, 2 and 3 figures count verified records only. 1 record (2.00 tCO2e) is not verified yet and left out.');
    expect(row(p, 4, 'Total Scope 1 and 2')!).toMatchObject({ answer: '39.66 tCO2e', tonnes: 39.66 });
    expect(row(p, 9, 'Emissions intensity')!.answer).toContain('Divide 43.86 tCO2e by your revenue');
    expect(row(p, 8, 'Emissions reduction target')!.answer).toBe('30% cut from 43.86 tCO2e by 31 Mar 2031');
    const noTarget = buildBuyerAnswerPack({ ...sampleDataset, target: null, verification: null });
    expect(row(noTarget, 8, 'Emissions reduction target')!).toMatchObject({ answer: 'No target set', filled: false });
    expect(row(noTarget, 7, 'Who verified')).toBeUndefined();
  });

  it('names the questions the records cannot answer', () => {
    const p = buildBuyerAnswerPack(sampleDataset);
    expect(section(p, 9).rows.map((r) => r.question)).toEqual([
      'Emissions intensity per unit of revenue', 'Refrigerant leaks (HFCs) and process emissions', 'Governance, climate policy and risk',
    ]);
    expect(section(p, 9).rows.every((r) => !r.filled)).toBe(true);
  });

  it('labels a draft pack and its records as unverified', () => {
    const p = buildBuyerAnswerPack({ ...sampleDataset, draft: true, verification: null });
    expect(p.draft).toBe(true);
    expect(row(p, 3, 'Gross Scope 1')!.basis).toStartWith('3 unverified records');
    expect(buyerPackSheet(p)[0][0]).toStartWith('PRE-VERIFICATION');
  });

  it('builds a formula-safe spreadsheet with numeric tonnes', () => {
    const p = buildBuyerAnswerPack({ ...sampleDataset, organizationName: '=HYPERLINK("x")' });
    const sheet = buyerPackSheet(p);
    expect(sheet.find((r) => r[0] === 'Organisation')![1]).toBe('\'=HYPERLINK("x")');
    const s1 = sheet.find((r) => r[1] === 'Gross Scope 1 emissions')!;
    expect(s1[3]).toBe(11.26);
    expect(packFieldStatus(p).length).toBe(sheet.filter((r) => r.length === 5 && r[1] !== '' && r[0] !== 'Section').length);
  });

  it('uses a download id the allowance function already accepts', () => {
    expect(BUYER_PACK_REPORT).toBe('BUYER_PACK');
    expect(reportDownloadKey(reportIdFor(BUYER_PACK_REPORT, '2025-04-01', '2026-03-31'), 'pdf')).toBe('BUYER_PACK:2025-04-01:2026-03-31:pdf');
    expect(reportDownloadKey(reportIdFor(BUYER_PACK_REPORT, null, null), 'xlsx')).toBe('BUYER_PACK:none:none:xlsx');
  });
});
