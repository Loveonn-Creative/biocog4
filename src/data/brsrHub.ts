// /brsr-reporting: the BRSR hub. Every fact below is taken from pages already in
// this repo; sources stay in these comments, never on the page.
//
// Sources (Answers library, src/data/answerLibrary/*.json, which cite SEBI):
// - Who files: Regulation 34(2)(f) SEBI LODR, top 1,000 listed by market cap; format
//   from SEBI circular of 10 May 2021; voluntary FY 2021-22, mandatory FY 2022-23:
//   when-did-brsr-replace-brr, do-unlisted-companies-need-brsr, brsr-vs-gri-vs-issb-which-framework.
// - Other listed companies may file voluntarily; unlisted have no duty:
//   brsr-sustainability-committee-question, do-unlisted-companies-need-brsr.
// - BRSR Core glide path (top 150 FY 2023-24, top 250 FY 2024-25, top 500 FY 2025-26,
//   top 1,000 FY 2026-27) and the 2023 vs 2025 table: brsr-core-rules-2023-vs-2025-changes
//   (SEBI circulars of 12 July 2023 and 28 March 2025, SEBI/HO/CFD/CFD-PoD-1/P/CIR/2025/42).
// - Nine attributes and their KPIs: brsr-core-nine-attributes-explained (SEBI BRSR Core
//   circular, Annexure I). Records per figure: brsr-documents-behind-each-environment-figure,
//   who-should-own-brsr-core-data.
// - Value chain 2% test, 75% coverage, voluntary dates: brsr-value-chain-data-request-msme-supplier,
//   brsr-core-value-chain-assurance-timeline, brsr-value-chain-first-year-prior-year-data.
// - Scope 3 is a leadership indicator, not in BRSR Core: does-brsr-require-scope-3.
// - Worked example quantities (480,000 kWh, 12,000 litres diesel, 3,000 kg LPG) and GJ
//   conversions (kWh x 0.0036; LPG 0.0473 GJ per kg; diesel IPCC NCV 43.0 GJ per tonne):
//   brsr-principle-6-worked-example-from-bills, brsr-energy-intensity-calculation.
//   Emission factors and diesel density come from the extraction engine itself
//   (src/lib/factors.ts), so the example matches what Senseible applies to a bill.
// - DG set rule (count the diesel, not the units it made): brsr-dg-set-diesel-energy-and-scope-1.
// - What Senseible does and does not do for BRSR: the "senseible" field of the pages above,
//   and src/data/answers.ts brsr-report-senseible. Sample report BRSR Core map, 19 codes:
//   src/data/esgReportSample.ts.
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '@/lib/factors';

export const BRSR_HUB_PATH = '/brsr-reporting';

/* ---------- Who files: the market-cap ladder ---------- */

export type RungId = 'top150' | 'top250' | 'top500' | 'top1000' | 'listed' | 'unlisted';
export interface Rung {
  id: RungId;
  label: string;
  /** Height of the step on the ladder, 1 (lowest) to 6. */
  step: number;
  brsr: string;
  core: string;
  valueChain: string;
}

const VC_TOP250 = 'Voluntary from FY 2025-26. Getting it assessed or assured is voluntary from FY 2026-27.';
const VC_NONE = 'Not asked of your company.';

export const RUNGS: Rung[] = [
  { id: 'top150', label: 'Top 150', step: 6, brsr: 'Required in your annual report since FY 2022-23.', core: 'Reasonable assurance from FY 2023-24. Assessment or assurance since March 2025.', valueChain: VC_TOP250 },
  { id: 'top250', label: '151 to 250', step: 5, brsr: 'Required in your annual report since FY 2022-23.', core: 'Reasonable assurance from FY 2024-25. Assessment or assurance since March 2025.', valueChain: VC_TOP250 },
  { id: 'top500', label: '251 to 500', step: 4, brsr: 'Required in your annual report since FY 2022-23.', core: 'Assessment or assurance from FY 2025-26.', valueChain: VC_NONE },
  { id: 'top1000', label: '501 to 1,000', step: 3, brsr: 'Required in your annual report since FY 2022-23.', core: 'Assessment or assurance from FY 2026-27.', valueChain: VC_NONE },
  { id: 'listed', label: 'Other listed', step: 2, brsr: 'Voluntary. You may publish one.', core: 'Not required.', valueChain: VC_NONE },
  { id: 'unlisted', label: 'Unlisted supplier', step: 1, brsr: 'No duty to file, whatever your size.', core: 'Not required.', valueChain: 'You can still be asked. A top 250 customer that reports its value chain counts you as a partner if you alone are 2% or more of its purchases or sales.' },
];

/* ---------- BRSR Core: nine attributes ---------- */

export interface Attribute {
  n: number;
  name: string;
  group: 'environment' | 'people' | 'business';
  asks: string[];
  records: string;
  /** What Senseible builds from bills and invoices, where it does. */
  fromBills?: string;
  link?: { label: string; to: string };
}

export const ATTRIBUTES: Attribute[] = [
  { n: 1, name: 'GHG footprint', group: 'environment', fromBills: 'Senseible builds the Scope 1 and Scope 2 totals from your electricity bills and fuel invoices.',
    asks: ['Total Scope 1 and Scope 2 emissions', 'Scope 1 plus 2 per rupee of turnover, and the same adjusted for PPP'],
    records: 'Fuel invoices for Scope 1, electricity bills for Scope 2, audited revenue for intensity.',
    link: { label: 'Intensity per rupee, adjusted for PPP', to: '/answers/brsr-emission-intensity-per-rupee-ppp' } },
  { n: 2, name: 'Water footprint', group: 'environment',
    asks: ['Total water consumption and its intensity', 'Water discharged, by destination and level of treatment'],
    records: 'Supply bills, borewell meter readings, tanker invoices in kL, discharge meter logs and CETP invoices.',
    link: { label: 'Water withdrawal and intensity', to: '/answers/water-intensity-calculation-for-brsr' } },
  { n: 3, name: 'Energy footprint', group: 'environment', fromBills: 'Senseible builds total energy from your electricity bills and fuel invoices.',
    asks: ['Total energy consumed', 'Share from renewable sources', 'Energy intensity'],
    records: 'Electricity bills, fuel invoices and open access settlement statements.',
    link: { label: 'Energy intensity, step by step', to: '/answers/brsr-energy-intensity-calculation' } },
  { n: 4, name: 'Circularity and waste', group: 'environment',
    asks: ['Waste generated by category, and its intensity', 'Waste recovered through recycling or re-use, and waste disposed of, by method'],
    records: 'Weighbridge slips, hazardous waste manifests, recycler and co-processor receipts.',
    link: { label: 'Filling the waste table', to: '/answers/brsr-waste-categories-how-to-fill' } },
  { n: 5, name: 'Employee wellbeing and safety', group: 'people',
    asks: ['Spending on wellbeing as a share of revenue', 'Lost time injury frequency, permanent disabilities and fatalities, contract staff included'],
    records: 'Incident registers and payroll.' },
  { n: 6, name: 'Gender diversity', group: 'people',
    asks: ['Wages paid to women as a share of total wages', 'Complaints under the POSH Act, and how many were upheld'],
    records: 'Payroll and POSH complaint records, kept by HR.' },
  { n: 7, name: 'Inclusive development', group: 'people',
    asks: ['Input material bought from MSMEs, small producers and within India', 'Wages paid in smaller towns'],
    records: 'Purchase ledgers and payroll.' },
  { n: 8, name: 'Fairness with customers and suppliers', group: 'business',
    asks: ['Customer data breaches as a share of cybersecurity events', 'Days of accounts payable'],
    records: 'Records of data breaches and cybersecurity events, and audited accounts for payables.' },
  { n: 9, name: 'Openness of business', group: 'business',
    asks: ['Purchases and sales concentrated with trading houses, dealers and related parties', 'Loans, advances and investments with related parties'],
    records: 'Audited accounts.' },
];

/* ---------- Value chain: 2023 rules vs 2025 rules ---------- */

export interface RuleRow { what: string; y2023: string; y2025: string }
export const RULE_ROWS: RuleRow[] = [
  { what: 'Check on BRSR Core', y2023: 'Reasonable assurance', y2025: 'Assessment or assurance, your choice' },
  { what: 'Who counts as a partner', y2023: 'Top partners making up 75% of purchases or sales together', y2025: 'Any partner at 2% or more of purchases or sales on its own. Coverage may stop at 75%.' },
  { what: 'Value chain disclosure, top 250', y2023: 'Comply or explain, from FY 2024-25', y2025: 'Voluntary, from FY 2025-26' },
  { what: 'Check on value chain figures', y2023: 'Limited assurance, comply or explain, from FY 2025-26', y2025: 'Assessment or assurance, voluntary, from FY 2026-27' },
  { what: 'Green credits', y2023: 'Not asked', y2025: 'A voluntary Principle 6 line, from FY 2024-25' },
];

export const SUPPLIER_LINES: string[] = [
  'No law makes a supplier send figures. A contract or supplier code can.',
  'Requests usually arrive in the months after March, because BRSR is filed with the annual report.',
  'Expect to be asked for Scope 1 and 2, energy, water and waste for April to March, with the bills behind them.',
];

/* ---------- From bills to Principle 6 figures ---------- */

export type FieldId = 'scope1' | 'scope2' | 'energy' | 'renewable';
export interface BillDoc {
  id: string;
  name: string;
  qty: number;
  unit: string;
  kgCo2PerUnit: number;
  gjPerUnit: number;
  scope: 1 | 2;
  feeds: FieldId[];
}

// Diesel energy uses the same density the engine applies to diesel (0.83 kg per litre).
const DIESEL_GJ_PER_L = 43.0 * 0.83 / 1000;

export const BILL_DOCS: BillDoc[] = [
  { id: 'power', name: '12 electricity bills', qty: 480000, unit: 'kWh', kgCo2PerUnit: INDIA_GRID_FACTOR_KG_PER_KWH, gjPerUnit: 0.0036, scope: 2, feeds: ['scope2', 'energy', 'renewable'] },
  { id: 'diesel', name: 'Diesel invoices', qty: 12000, unit: 'litres', kgCo2PerUnit: FUEL_FACTORS.DIESEL.value, gjPerUnit: DIESEL_GJ_PER_L, scope: 1, feeds: ['scope1', 'energy', 'renewable'] },
  { id: 'lpg', name: 'LPG invoices', qty: 3000, unit: 'kg', kgCo2PerUnit: FUEL_FACTORS.LPG.value, gjPerUnit: 0.0473, scope: 1, feeds: ['scope1', 'energy', 'renewable'] },
];

export const FIELDS: { id: FieldId; label: string; unit: string }[] = [
  { id: 'scope1', label: 'Scope 1', unit: 't CO2' },
  { id: 'scope2', label: 'Scope 2', unit: 't CO2' },
  { id: 'energy', label: 'Total energy', unit: 'GJ' },
  { id: 'renewable', label: 'From renewable sources', unit: '%' },
];

/** Principle 6 totals for the documents switched on. None of the example documents is renewable. */
export function principle6(on: string[]): Record<FieldId, number> {
  const docs = BILL_DOCS.filter((d) => on.includes(d.id));
  const t = (scope: 1 | 2) => docs.filter((d) => d.scope === scope).reduce((s, d) => s + (d.qty * d.kgCo2PerUnit) / 1000, 0);
  return {
    scope1: t(1),
    scope2: t(2),
    energy: docs.reduce((s, d) => s + d.qty * d.gjPerUnit, 0),
    renewable: 0,
  };
}

/* ---------- Find your answer, by need ---------- */

export interface NeedGroup { id: string; label: string; items: { q: string; slug: string }[] }
export const NEEDS: NeedGroup[] = [
  { id: 'who', label: 'Who files, and when', items: [
    { q: 'Do unlisted companies have to file BRSR?', slug: 'do-unlisted-companies-need-brsr' },
    { q: 'When did BRSR replace the BRR?', slug: 'when-did-brsr-replace-brr' },
    { q: 'BRSR, GRI or ISSB: which do we need?', slug: 'brsr-vs-gri-vs-issb-which-framework' },
    { q: 'Essential or leadership indicator: which must we report?', slug: 'brsr-essential-vs-leadership-indicators' },
    { q: 'What changed between the 2023 and 2025 rules?', slug: 'brsr-core-rules-2023-vs-2025-changes' },
  ] },
  { id: 'energy', label: 'Emissions and energy', items: [
    { q: 'Energy and emissions from a year of bills, worked through', slug: 'brsr-principle-6-worked-example-from-bills' },
    { q: 'Energy intensity per rupee of turnover', slug: 'brsr-energy-intensity-calculation' },
    { q: 'Emission intensity adjusted for PPP', slug: 'brsr-emission-intensity-per-rupee-ppp' },
    { q: 'Scope 2: location-based or market-based?', slug: 'brsr-scope-2-location-or-market-based' },
    { q: 'Renewable or non-renewable: which row does each source go in?', slug: 'brsr-renewable-vs-non-renewable-energy' },
    { q: 'Diesel for a DG set: energy and Scope 1', slug: 'brsr-dg-set-diesel-energy-and-scope-1' },
    { q: 'Scope 1 from LPG and PNG bills', slug: 'brsr-scope-1-from-lpg-and-png-bills' },
    { q: 'Which greenhouse gases to include', slug: 'brsr-which-greenhouse-gases-to-include' },
    { q: 'Does BRSR require Scope 3?', slug: 'does-brsr-require-scope-3' },
    { q: 'Adding several plants into one figure', slug: 'combine-plants-into-one-brsr-figure' },
  ] },
  { id: 'water', label: 'Water, waste and air', items: [
    { q: 'Water withdrawal, consumption and intensity', slug: 'water-intensity-calculation-for-brsr' },
    { q: 'Withdrawal or consumption: what is the difference?', slug: 'brsr-water-withdrawal-vs-consumption' },
    { q: 'Filling the waste table by category', slug: 'brsr-waste-categories-how-to-fill' },
    { q: 'Using vendor certificates for waste figures', slug: 'brsr-waste-figures-from-vendor-certificates' },
    { q: 'NOx, SOx and particulate matter from stack reports', slug: 'brsr-air-emissions-nox-sox-pm' },
    { q: 'The zero liquid discharge question', slug: 'brsr-zero-liquid-discharge-question' },
  ] },
  { id: 'chain', label: 'Value chain and suppliers', items: [
    { q: 'A listed customer wants our figures. Do we have to send them?', slug: 'brsr-value-chain-data-request-msme-supplier' },
    { q: 'The supplier questionnaire, field by field', slug: 'brsr-supplier-questionnaire-field-by-field' },
    { q: 'A supplier has not replied. What do we report?', slug: 'brsr-value-chain-estimate-when-supplier-silent' },
    { q: 'First year of value chain reporting: is last year needed?', slug: 'brsr-value-chain-first-year-prior-year-data' },
    { q: 'Distributors and dealers as value chain partners', slug: 'brsr-value-chain-downstream-partners' },
    { q: 'Share of value chain partners assessed', slug: 'brsr-value-chain-environment-assessment-share' },
    { q: 'Is value chain assurance mandatory yet?', slug: 'brsr-core-value-chain-assurance-timeline' },
  ] },
  { id: 'check', label: 'Assurance and review', items: [
    { q: 'BRSR Core: assessment or assurance?', slug: 'brsr-core-assurance-or-assessment-which' },
    { q: 'Can our statutory auditor assure BRSR Core?', slug: 'can-statutory-auditor-assure-brsr-core' },
    { q: 'The documents behind each environment figure', slug: 'brsr-documents-behind-each-environment-figure' },
    { q: 'Common errors in the environment section', slug: 'brsr-environment-disclosure-common-errors' },
    { q: 'Disclosing estimates and your own methods', slug: 'brsr-core-estimates-and-industry-adjustments' },
    { q: 'Explaining a big change in emissions', slug: 'explain-big-change-in-brsr-emissions' },
    { q: 'Who should own each BRSR Core figure', slug: 'who-should-own-brsr-core-data' },
  ] },
];

/* ---------- Questions (also FAQ structured data) ---------- */

export const BRSR_FAQS: { question: string; answer: string }[] = [
  { question: 'Who has to file BRSR?', answer: 'The top 1,000 listed companies by market capitalisation, in their annual report, under Regulation 34(2)(f) of SEBI\'s LODR Regulations. It has been mandatory for them since FY 2022-23. Other listed companies may file one voluntarily. Unlisted companies have no duty to file.' },
  { question: 'What is BRSR Core?', answer: 'A short list of key BRSR indicators, grouped under nine attributes, that must be checked by an independent provider. Since SEBI\'s circular of 28 March 2025 the check can be an assessment or an assurance. It applies to the top 150 listed companies from FY 2023-24, the top 250 from FY 2024-25, the top 500 from FY 2025-26 and the top 1,000 from FY 2026-27.' },
  { question: 'Does BRSR require Scope 3?', answer: 'No. Scope 1 and Scope 2 are essential indicators under Principle 6. Scope 3 is a leadership indicator, which is voluntary, and it is not part of BRSR Core.' },
  { question: 'Is value chain disclosure mandatory?', answer: 'No. Since March 2025 it is voluntary for the top 250 listed companies from FY 2025-26, and getting it assessed or assured is voluntary from FY 2026-27. A partner counts if it alone makes up 2% or more of purchases or sales by value.' },
  { question: 'Can Senseible file or assure our BRSR?', answer: 'No. Senseible builds your Scope 1, Scope 2 and energy figures from your bills and invoices, with each number traced to its document, and drafts the BRSR energy and emissions fields from them. The draft is self-declared. Filing stays with your company, and the BRSR Core check comes from an independent provider.' },
];
