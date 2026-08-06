// Framework-specific report generation.
//
// Every framework renders from ONE verified dataset (the same emissions,
// evidence and verification records the UI shows). What changes per framework
// is the structure: the disclosure index, the ordering of sections and the
// terminology used. No framework generator invents a number, a compliance
// claim or a certification statement — unevidenced disclosures are printed as
// explicit gaps.

import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
  FRAMEWORKS,
  assessFramework,
  type DataAvailability,
  type FrameworkAssessment,
} from '@/lib/reportFrameworks';

export interface ReportCategory {
  category: string;
  scope: number;
  co2Kg: number;
  activityData: number | null;
  activityUnit: string | null;
  emissionFactor: number | null;
  dataQuality: string | null;
  verified: boolean;
}

export interface ReportEvidenceRow {
  documentHash: string;
  invoiceNumber: string | null;
  vendor: string | null;
  invoiceDate: string | null;
  co2Kg: number;
  scope: number;
  category: string;
  factorSource: string | null;
  verificationStatus: string;
}

export interface ReportDataset {
  organizationName: string;
  gstin: string | null;
  sector: string | null;
  size: string | null;
  country: string;
  locale: string;
  generatedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  totalKg: number;
  categories: ReportCategory[];
  evidence: ReportEvidenceRow[];
  availability: DataAvailability;
  methodologyVersion: string;
  factorSources: string[];
  verification: {
    status: string;
    score: number | null;
    greenwashingRisk: string | null;
    cctsEligible: boolean | null;
    cbamCompliant: boolean | null;
    verifiedAt: string | null;
  } | null;
  target: {
    baselineCo2Kg: number;
    targetReductionPct: number;
    targetDate: string;
    progressPct: number | null;
  } | null;
}

type Section =
  | { kind: 'text'; title: string; body: string }
  | { kind: 'kv'; title: string; rows: Array<[string, string]> }
  | { kind: 'table'; title: string; head: string[]; rows: Array<Array<string | number>>; note?: string };

/* ------------------------- locale-aware formatting --------------------- */

const numFmt = (locale: string, digits: number) => {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  } catch {
    return new Intl.NumberFormat('en', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }
};

/** Mass in the reader's locale, with the unit always spelled out. */
const kgL = (v: number, locale: string) =>
  v >= 1000
    ? `${numFmt(locale, 3).format(v / 1000)} tCO2e`
    : `${numFmt(locale, 1).format(v)} kgCO2e`;

/** Tonnes as a locale-formatted string for table cells. */
const tL = (v: number, locale: string) => numFmt(locale, 4).format(v / 1000);

/** Raw tonnes for spreadsheet cells that must stay numeric. */
const tNum = (v: number) => Number((v / 1000).toFixed(4));

const pctL = (part: number, whole: number, locale: string) => {
  const value = whole > 0 ? (part / whole) * 100 : 0;
  try {
    return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
  } catch {
    return `${value.toFixed(1)}%`;
  }
};

const fmtDate = (iso: string | null, locale: string) => {
  if (!iso) return 'Not recorded';
  try {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return new Date(iso).toISOString().split('T')[0];
  }
};

/** Base year = the earliest evidenced activity year in the dataset. */
const baseYear = (ds: ReportDataset): string => {
  const dates = ds.evidence
    .map((e) => e.invoiceDate)
    .filter(Boolean)
    .concat(ds.periodStart ? [ds.periodStart] : [])
    .sort();
  const first = dates[0];
  if (!first) return 'Not established — no dated evidence recorded';
  const year = new Date(first).getFullYear();
  return Number.isNaN(year) ? 'Not established' : String(year);
};


/** Shared entity + boundary block used by every framework. */
const entitySection = (ds: ReportDataset): Section => ({
  kind: 'kv',
  title: 'Reporting entity and boundary',
  rows: [
    ['Organization', ds.organizationName],
    ['Tax / registration ID', ds.gstin || 'Not recorded'],
    ['Sector', ds.sector || 'Not recorded'],
    ['Organization size', ds.size || 'Not recorded'],
    ['Country of operation', ds.country],
    ['Reporting period', ds.periodStart && ds.periodEnd
      ? `${fmtDate(ds.periodStart, ds.locale)} — ${fmtDate(ds.periodEnd, ds.locale)}`
      : 'All recorded activity to date'],
    ['Base year', baseYear(ds)],
    ['Organizational boundary', 'Operational control'],
    ['Operational boundary', 'Scope 1, Scope 2 (location-based) and evidenced Scope 3 categories'],
    ['Report generated', fmtDate(ds.generatedAt, ds.locale)],
    ['Output locale', ds.locale],
  ],
});

const inventorySection = (ds: ReportDataset, labels: [string, string, string]): Section => ({
  kind: 'table',
  title: 'GHG inventory by scope',
  head: ['Scope', 'Description', 'tCO2e', 'Share'],
  rows: [
    ['Scope 1', labels[0], tL(ds.scope1Kg, ds.locale), pctL(ds.scope1Kg, ds.totalKg, ds.locale)],
    ['Scope 2', labels[1], tL(ds.scope2Kg, ds.locale), pctL(ds.scope2Kg, ds.totalKg, ds.locale)],
    ['Scope 3', labels[2], tL(ds.scope3Kg, ds.locale), pctL(ds.scope3Kg, ds.totalKg, ds.locale)],
    ['Total', '', tL(ds.totalKg, ds.locale), pctL(ds.totalKg, ds.totalKg, ds.locale)],
  ],
});

const categorySection = (ds: ReportDataset): Section => ({
  kind: 'table',
  title: 'Emissions by activity category',
  head: ['Category', 'Scope', 'Activity data', 'Unit', 'Factor', 'tCO2e', 'Data quality'],
  rows: ds.categories.map((c) => [
    c.category,
    `Scope ${c.scope}`,
    c.activityData ?? '—',
    c.activityUnit ?? '—',
    c.emissionFactor ?? '—',
    tL(c.co2Kg, ds.locale),
    c.dataQuality || 'unrated',
  ]),
});

const methodologySection = (ds: ReportDataset): Section => ({
  kind: 'kv',
  title: 'Quantification methodology',
  rows: [
    ['Methodology version', ds.methodologyVersion],
    ['Emission factor sources', ds.factorSources.length ? ds.factorSources.join(', ') : 'Not recorded'],
    ['Activity data source', 'Supplier invoices and metered records uploaded by the entity'],
    ['Calculation basis', 'Activity data × published emission factor; no spend-based proxy is applied'],
    ['Gases covered', 'CO2e aggregate (factors are supplied on a CO2e basis)'],
    ['Scope 2 method', 'Location-based; no market-based figure is disclosed because contractual instruments are not recorded'],
    ['Exclusions', 'Any activity without a supporting document is excluded and declared in the disclosure index'],
    ['Recalculation policy', 'Restated when source evidence is corrected or a factor set is superseded'],
    ['Independent assurance', 'Not obtained — this report is unassured unless separately verified'],
  ],
});

/** Completeness, quality and assurance, stated uniformly for every framework. */
const dataQualitySection = (ds: ReportDataset, assessment: FrameworkAssessment): Section => {
  const verified = ds.evidence.filter((e) => e.verificationStatus === 'verified').length;
  const rated = ds.categories.filter((c) => Boolean(c.dataQuality)).length;
  return {
    kind: 'kv',
    title: 'Completeness, data quality and assurance',
    rows: [
      ['Evidence records', String(ds.evidence.length)],
      ['Of which integrity-checked', `${verified} of ${ds.evidence.length}`],
      ['Activity categories', String(ds.categories.length)],
      ['Categories carrying a data-quality rating', `${rated} of ${ds.categories.length}`],
      ['Disclosure completeness (all mapped references)', `${assessment.completeness}%`],
      ['Disclosure completeness (references the platform can evidence)', `${assessment.evidenceableCompleteness}%`],
      ['Declared data gaps', String(assessment.dataGaps.length)],
      ['Declared not applicable', String(assessment.notApplicable.length)],
      ['Assurance status', 'Self-reported, unassured'],
      ['Uncertainty treatment', 'Expressed qualitatively through per-record data-quality ratings; no numeric uncertainty range is asserted'],
    ],
  };
};

const evidenceSection = (ds: ReportDataset): Section => ({
  kind: 'table',
  title: 'Evidence register',
  head: ['Evidence hash', 'Document', 'Vendor', 'Date', 'Scope', 'tCO2e', 'Status'],
  rows: ds.evidence.slice(0, 200).map((e) => [
    e.documentHash.substring(0, 16),
    e.invoiceNumber || '—',
    e.vendor || '—',
    e.invoiceDate ? fmtDate(e.invoiceDate, ds.locale) : '—',
    `Scope ${e.scope}`,
    tL(e.co2Kg, ds.locale),
    e.verificationStatus,
  ]),
  note: ds.evidence.length > 200 ? `Showing first 200 of ${ds.evidence.length} evidence records.` : undefined,
});

/**
 * Scope 3 supplier annex — the same verified evidence, grouped by counterparty.
 * Suppliers without usable evidence are listed as declared gaps rather than
 * estimated, so a buyer or auditor can see exactly what is covered.
 */
const supplierAnnexSection = (ds: ReportDataset): Section | null => {
  const suppliers = buildSupplierLedger(
    ds.evidence.map((e) => ({
      vendor: e.vendor,
      invoiceDate: e.invoiceDate,
      amount: null,
      currency: null,
      co2Kg: e.co2Kg,
      scope: e.scope,
      category: e.category,
      hsnCode: null,
      factorSource: e.factorSource,
      verificationStatus: e.verificationStatus,
      documentHash: e.documentHash,
    })),
  );
  if (suppliers.length === 0) return null;

  const coverage = summariseCoverage(suppliers);
  const scope3Total = suppliers.reduce((t, s) => t + s.scope3Co2Kg, 0);

  return {
    kind: 'table',
    title: 'Scope 3 supplier annex',
    head: ['Supplier', 'Documents', 'Verified', 'tCO2e', 'Share of Scope 3', 'Evidence basis'],
    rows: suppliers.slice(0, 100).map((s) => [
      s.name,
      s.documentCount,
      s.verifiedCount,
      tL(s.co2Kg, ds.locale),
      pctL(s.scope3Co2Kg, scope3Total, ds.locale),
      TIER_LABEL[s.tier],
    ]),
    note:
      `${coverage.supplierCount} suppliers identified from the entity's own documents; ` +
      `${coverage.evidencedCount} carry usable evidence. ` +
      `Verified share of supplier-attributed emissions: ${coverage.emissionsCoveragePct.toFixed(1)}%. ` +
      'Suppliers with no verified document are reported as coverage gaps and are not estimated.' +
      (suppliers.length > 100 ? ` Showing the first 100 of ${suppliers.length} suppliers.` : ''),
  };
};


const verificationSection = (ds: ReportDataset): Section => ({
  kind: 'kv',
  title: 'Verification status',
  rows: ds.verification
    ? [
        ['Status', ds.verification.status],
        ['Verification score', ds.verification.score === null ? 'Not scored' : `${Math.round(ds.verification.score * 100)}%`],
        ['Greenwashing risk flag', ds.verification.greenwashingRisk || 'Not assessed'],
        ['Verified at', fmtDate(ds.verification.verifiedAt, ds.locale)],
        ['Note', 'Platform verification is a data-integrity check, not third-party assurance.'],
      ]
    : [['Status', 'No verification run recorded for this dataset']],
});

const targetSection = (ds: ReportDataset): Section =>
  ds.target
    ? {
        kind: 'kv',
        title: 'Reduction target',
        rows: [
          ['Baseline emissions', kgL(ds.target.baselineCo2Kg, ds.locale)],
          ['Target reduction', `${ds.target.targetReductionPct}%`],
          ['Target date', fmtDate(ds.target.targetDate, ds.locale)],
          ['Progress recorded', ds.target.progressPct === null ? 'Not tracked' : `${ds.target.progressPct}%`],
          ['Target validation', 'Self-declared; not validated by any target-setting body'],
        ],
      }
    : {
        kind: 'text',
        title: 'Reduction target',
        body: 'No reduction target is recorded for this entity. Target-related disclosures under this framework are reported as a gap rather than estimated.',
      };

const gapSection = (assessment: FrameworkAssessment): Section => ({
  kind: 'table',
  title: 'Disclosure index',
  head: ['Disclosure reference', 'Status', 'Basis'],
  rows: [
    ...assessment.satisfied.map((r) => [r, 'Evidenced', 'Computed from the entity\'s own recorded evidence']),
    ...assessment.missingDetail.map((m) => [
      m.reference,
      m.classification === 'data_gap' ? 'Data gap' : 'Not applicable',
      m.reason,
    ]),
  ],
  note:
    `Evidenced: ${assessment.satisfied.length}. Data gaps: ${assessment.dataGaps.length}. Not applicable: ${assessment.notApplicable.length}. ` +
    'A data gap is a disclosure that can be closed by adding the underlying record. Not applicable means the disclosure is authored by the entity and sits outside this platform. Neither is estimated or filled in.',
});


/** Framework-specific narrative and section order. */
function buildSections(fwId: string, ds: ReportDataset, assessment: FrameworkAssessment): Section[] {
  const common = {
    entity: entitySection(ds),
    methodology: methodologySection(ds),
    categories: categorySection(ds),
    evidence: evidenceSection(ds),
    verification: verificationSection(ds),
    target: targetSection(ds),
    index: gapSection(assessment),
    quality: dataQualitySection(ds, assessment),
  };

  const note = (title: string, body: string): Section => ({ kind: 'text', title, body });

  /** Standard tail every framework view shares. */
  const tail: Section[] = [common.index, common.quality, common.verification, common.evidence];

  const supersededNote = assessment.framework.supersededBy
    ? [note('Standard status', assessment.framework.note || '')]
    : [];

  switch (fwId) {
    case 'GHG_PROTOCOL':
      return [
        common.entity,
        note(
          'Basis of preparation',
          'Emissions are compiled following the GHG Protocol Corporate Accounting and Reporting Standard using the operational control approach. Scope 2 is reported on a location-based basis using published grid factors; a market-based figure is not disclosed because contractual instruments are not recorded by this entity.',
        ),
        inventorySection(ds, ['Direct combustion and process emissions', 'Purchased electricity (location-based)', 'Value chain activities from purchased goods and services']),
        common.categories,
        common.methodology,
        common.target,
        ...tail,
      ];

    case 'ISO_14064':
      return [
        common.entity,
        note(
          'Clause 5 — Boundaries and GHG inventory',
          'The organizational boundary is set by operational control. Direct emissions, indirect emissions from imported energy, and other indirect emissions are quantified separately in line with ISO 14064-1 categorisation. Emissions arising outside evidenced activity are excluded and declared in the disclosure index.',
        ),
        inventorySection(ds, ['Category 1 — Direct GHG emissions', 'Category 2 — Indirect from imported energy', 'Categories 3-6 — Other indirect emissions']),
        common.categories,
        note(
          'Clause 6 — Quantification approach',
          'Emissions are quantified as activity data multiplied by a published emission factor. Activity data is drawn from invoices and metered records; no modelled or extrapolated activity is included. Uncertainty is expressed qualitatively through per-record data-quality ratings.',
        ),
        common.methodology,
        common.target,
        note(
          'Clause 7 — Verification',
          'This inventory has not undergone third-party verification to ISO 14064-3. The platform verification result below is an internal data-integrity control and must not be presented as a validation or verification statement.',
        ),
        ...tail,
      ];

    case 'ISO_14067':
      return [
        common.entity,
        note(
          'Clause 6.3 — Functional unit and product system',
          ds.availability.productLevel
            ? 'Product-level evidence (HSN/CN coded purchase and dispatch records) is present, so emissions are attributed to the goods those records identify. The functional unit is the unit of the good stated on the dispatch evidence; where a dispatch quantity is absent for a given good, the per-product figure for that good is declared a gap.'
            : 'No product-level (HSN/CN coded) evidence is recorded for this entity, so a product carbon footprint cannot be produced. The organizational inventory below is provided as context only and must not be presented as a product footprint.',
        ),
        inventorySection(ds, ['Direct process emissions in the product system', 'Energy used in production', 'Upstream materials and inputs']),
        common.categories,
        note(
          'Clause 6.4 — Life cycle stages covered',
          'Coverage is cradle-to-gate and limited to stages evidenced by documents: purchased materials, production energy and direct process fuel. Use phase, distribution beyond evidenced freight, and end-of-life are outside the evidence set and are declared as gaps rather than modelled.',
        ),
        common.methodology,
        ...tail,
      ];

    case 'GRI_305':
      return [
        common.entity,
        note(
          'GRI 305 — Reporting approach',
          'Disclosures 305-1 to 305-5 are reported against the entity\'s own evidenced activity. Biogenic emissions, ozone-depleting substances (305-6) and NOx/SOx (305-7) are not captured by this platform and are not asserted.',
        ),
        inventorySection(ds, ['305-1 Direct (Scope 1) GHG emissions', '305-2 Energy indirect (Scope 2) GHG emissions', '305-3 Other indirect (Scope 3) GHG emissions']),
        common.categories,
        note(
          '305-4 GHG emissions intensity',
          ds.availability.intensity
            ? 'Intensity is derived from an evidenced output denominator.'
            : 'No output or revenue denominator is recorded, so an intensity ratio is reported as a data gap rather than divided by an assumed figure.',
        ),
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'SASB':
      return [
        common.entity,
        note(
          'SASB — Applicability',
          'SASB metrics are industry-specific. The greenhouse-gas metrics below are the subset this platform can evidence. Industry topics outside GHG accounting are not covered here and must be reported separately by the entity.',
        ),
        inventorySection(ds, ['Gross global Scope 1 emissions', 'Purchased energy emissions', 'Value chain emissions (where the applicable standard requires them)']),
        common.categories,
        common.methodology,
        ...tail,
      ];

    case 'TCFD':
      return [
        common.entity,
        ...supersededNote,
        note(
          'Governance and Strategy',
          'Governance of climate issues and strategic resilience are narrative disclosures authored by the entity. They are not derived from documents and are therefore reported as not applicable to this platform rather than drafted on the entity\'s behalf.',
        ),
        note('Risk management', 'No climate risk assessment is recorded by this platform. This pillar is reported as a gap.'),
        inventorySection(ds, ['Scope 1', 'Scope 2 (location-based)', 'Scope 3']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'ISSB_S1':
      return [
        common.entity,
        note(
          'IFRS S1 — General requirements',
          'IFRS S1 requires sustainability-related risks and opportunities that could reasonably affect prospects, disclosed alongside the financial statements. This output supplies the metrics pillar from verified evidence. Governance, strategy and risk-management narratives are authored by the entity and are marked accordingly in the disclosure index.',
        ),
        inventorySection(ds, ['Scope 1', 'Scope 2 (location-based)', 'Scope 3']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'ISSB_S2':
      return [
        common.entity,
        note(
          'IFRS S2 — Climate-related disclosures',
          'IFRS S2 carries forward the TCFD recommendations. Cross-industry metrics for absolute gross Scope 1, 2 and 3 emissions are reported below from evidenced records. Scenario analysis, transition planning and physical risk exposure are entity-authored and are not asserted here.',
        ),
        inventorySection(ds, ['Absolute gross Scope 1', 'Absolute gross Scope 2 (location-based)', 'Absolute gross Scope 3']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'CDP':
      return [
        common.entity,
        note(
          'CDP — Response basis',
          'The figures below correspond to CDP module C6 (emissions data). Responses to governance (C1), risks and opportunities (C2-C3) and verification (C10) modules require entity input and third-party assurance respectively; they are not answered from this dataset.',
        ),
        inventorySection(ds, ['C6.1 Scope 1', 'C6.3 Scope 2 (location-based)', 'C6.5 Scope 3']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'CSRD_ESRS':
      return [
        common.entity,
        note(
          'ESRS E1 — Climate change',
          'This output covers the quantitative datapoints of ESRS E1-5 (energy) and E1-6 (gross Scopes 1, 2, 3 and total). E1-1 transition plan, E1-2 policies and E1-3 actions are entity-authored. Double materiality assessment is a prerequisite of CSRD reporting and is not performed by this platform.',
        ),
        inventorySection(ds, ['E1-6 Gross Scope 1', 'E1-6 Gross Scope 2 (location-based)', 'E1-6 Gross Scope 3']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'TNFD':
      return [
        common.entity,
        note(
          'TNFD — LEAP applicability',
          'The TNFD LEAP approach requires location-level nature dependency and impact assessment. This platform records financial and energy evidence, not ecosystem or biodiversity data, so the Evaluate, Assess and Prepare stages are reported as not applicable to this platform rather than estimated. The GHG inventory below is supplied as contextual data only.',
        ),
        inventorySection(ds, ['Direct emissions', 'Purchased energy', 'Value chain emissions']),
        common.methodology,
        ...tail,
      ];

    case 'SBTI':
      return [
        common.entity,
        note(
          'Target-setting basis',
          'SBTi validation requires submission to, and approval by, the initiative. Nothing here constitutes a validated science-based target. The evidenced baseline and any recorded target are provided as the inputs an entity would use to prepare a submission.',
        ),
        inventorySection(ds, ['Scope 1 (base year)', 'Scope 2 (base year, location-based)', 'Scope 3 (base year)']),
        common.target,
        common.categories,
        common.methodology,
        ...tail,
      ];

    case 'UN_SDGS':
      return [
        common.entity,
        note(
          'SDG contribution reporting',
          'Emissions data is mapped to SDG 7 (affordable and clean energy), SDG 12 (responsible consumption and production) and SDG 13 (climate action) only where an evidenced record exists. No contribution is claimed for a goal without supporting data.',
        ),
        inventorySection(ds, ['SDG 13 — direct emissions', 'SDG 7 — purchased energy emissions', 'SDG 12 — value chain emissions']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'INDIA_CPCB':
      return [
        common.entity,
        note(
          'CPCB context',
          'CPCB consent and environmental compliance obligations cover stack emissions, effluent and waste parameters that are measured by accredited laboratories, not derived from invoices. This output supplies the energy and combustion record that supports an energy audit; it does not evidence compliance with any consent condition.',
        ),
        inventorySection(ds, ['Fuel combustion (direct)', 'Purchased electricity', 'Other indirect']),
        common.categories,
        common.methodology,
        ...tail,
      ];

    case 'INDIA_BRSR':
      return [
        {
          kind: 'kv',
          title: 'Section A — General disclosures',
          rows: [
            ['Name of the entity', ds.organizationName],
            ['GSTIN', ds.gstin || 'Not recorded'],
            ['Sector / industry', ds.sector || 'Not recorded'],
            ['Scale of entity', ds.size || 'Not recorded'],
            ['Reporting period', ds.periodStart && ds.periodEnd
              ? `${fmtDate(ds.periodStart, ds.locale)} — ${fmtDate(ds.periodEnd, ds.locale)}`
              : 'All recorded activity to date'],
          ],
        },
        note(
          'Section B — Management and process disclosures',
          'Policy, governance and oversight narratives for the NGRBC principles are not captured by this platform and are therefore not asserted here. Section B must be completed by the entity before filing.',
        ),
        note(
          'Section C, Principle 6 — Environment',
          'The quantitative environmental disclosures below cover greenhouse gas emissions computed from invoice-level evidence. Water, waste and biodiversity indicators under Principle 6 are outside the platform boundary and are reported as gaps.',
        ),
        inventorySection(ds, ['Direct emissions (P6 essential indicator 1)', 'Energy indirect emissions (P6 essential indicator 1)', 'Other indirect emissions (P6 leadership indicator)']),
        common.categories,
        common.methodology,
        common.target,
        ...tail,
      ];

    case 'INDIA_BRSR_CORE':
      return [
        common.entity,
        note(
          'BRSR Core — basis and assurance',
          'BRSR Core specifies a set of KPIs subject to reasonable assurance when filed with the exchange. This output is the underlying, unassured source data for those KPIs. It is not an assurance statement and does not itself satisfy the assurance requirement.',
        ),
        inventorySection(ds, ['Attribute 1 — Scope 1 emissions', 'Attribute 1 — Scope 2 emissions', 'Attribute 9 — value chain emissions']),
        note(
          'Attribute 1 — GHG intensity',
          ds.availability.intensity
            ? 'Intensity is computed from an evidenced output denominator.'
            : 'Turnover-adjusted GHG intensity requires a revenue or output denominator, which is not recorded here. It is declared a data gap and must be completed by the entity from its audited financials.',
        ),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'CBAM':
      return [
        common.entity,
        note(
          'Declarant basis',
          'Embedded emissions are derived from invoice-evidenced direct and indirect emissions for the reporting entity. Where product-level (HSN/CN mapped) data is absent, embedded emissions per good cannot be stated and are reported as a gap rather than allocated by assumption.',
        ),
        inventorySection(ds, ['Direct embedded emissions', 'Indirect (electricity) embedded emissions', 'Upstream precursor activity']),
        common.categories,
        note(
          'Default values',
          'Where an actual value is not evidenced, the EU transitional default applies at the border. This report states the evidenced actual figures only; it does not substitute a default value into the entity\'s own inventory.',
        ),
        common.methodology,
        ...tail,
      ];

    case 'LENDER_VIEW':
      return [
        common.entity,
        note(
          'Purpose of this pack',
          'Prepared for a bank or lender assessing climate data as part of credit or sustainability-linked loan review. It states the borrower\'s evidenced emissions baseline, how each figure can be traced to a source document, and where data is missing. It is not a credit assessment, a rating, or a statement of eligibility for any facility.',
        ),
        inventorySection(ds, ['Direct emissions baseline', 'Purchased energy baseline', 'Value chain exposure']),
        common.target,
        note(
          'What a KPI can be written against',
          'A sustainability-linked KPI needs a baseline the lender can re-derive. Every figure above is reproducible from the evidence register: each record carries its document hash, activity data, emission factor and factor source. Figures marked as data gaps must not be used as KPI baselines.',
        ),
        common.categories,
        common.methodology,
        ...tail,
      ];

    case 'INVESTOR_VIEW':
      return [
        common.entity,
        note(
          'Purpose of this pack',
          'Prepared for an investor or portfolio manager collecting issuer climate data. It reports absolute emissions, the share of the value chain covered, target progress where recorded, and the completeness of the underlying evidence, so the data can be assessed rather than taken on trust.',
        ),
        inventorySection(ds, ['Absolute gross Scope 1', 'Absolute gross Scope 2', 'Absolute gross Scope 3']),
        common.target,
        common.categories,
        common.methodology,
        ...tail,
      ];

    case 'GOVERNMENT_VIEW':
      return [
        common.entity,
        note(
          'Purpose of this pack',
          'Prepared as source data for a submission to a government body or registry. Entity identification, evidenced emissions and the evidence register are stated in full so the receiving body can trace any figure back to a document. This is not a filing and does not substitute for a prescribed statutory form.',
        ),
        inventorySection(ds, ['Direct emissions', 'Energy indirect emissions', 'Other indirect emissions']),
        common.categories,
        common.methodology,
        ...tail,
      ];

    case 'SENSEIBLE_SUMMARY':
      return [
        common.entity,
        note(
          'What this summary is',
          'The platform\'s own view of the verified dataset: every framework export renders these same records in that framework\'s structure. Nothing in a framework report is recomputed or restated — only reorganised and labelled to that standard\'s disclosure index.',
        ),
        inventorySection(ds, ['Direct emissions', 'Purchased energy', 'Value chain emissions']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    default:
      return [
        common.entity,
        inventorySection(ds, ['Direct emissions', 'Purchased energy', 'Value chain emissions']),
        common.categories,
        common.methodology,
        common.target,
        ...tail,
      ];
  }
}


const FOOTER_NOTE =
  'Decision-support disclosure generated from the entity\'s own evidence. Not a statutory filing and not an assurance or certification statement. Unevidenced disclosures are declared as gaps in the disclosure index.';

export function getFrameworkAssessment(fwId: string, availability: DataAvailability) {
  const fw = FRAMEWORKS[fwId];
  if (!fw) return null;
  return assessFramework(fw, availability);
}

/* ------------------------------- PDF ---------------------------------- */

export function generateFrameworkPDF(fwId: string, ds: ReportDataset): boolean {
  const fw = FRAMEWORKS[fwId];
  if (!fw) return false;
  const assessment = assessFramework(fw, ds.availability);
  const sections = buildSections(fwId, ds, assessment);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const width = pageWidth - margin * 2;
  let y = 0;

  const ensure = (needed: number) => {
    if (y + needed > pageHeight - 22) {
      doc.addPage();
      y = 22;
    }
  };

  // Cover band
  doc.setFillColor(24, 60, 42);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(doc.splitTextToSize(fw.name, width), margin, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${ds.organizationName} · ${kgL(ds.totalKg, ds.locale)} total · ${assessment.completeness}% of mapped references evidenced`, margin, 35);
  y = 54;

  sections.forEach((section) => {
    ensure(20);
    doc.setTextColor(24, 60, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(section.title, margin, y);
    y += 7;
    doc.setTextColor(45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    if (section.kind === 'text') {
      const lines = doc.splitTextToSize(section.body, width);
      ensure(lines.length * 4.6 + 4);
      doc.text(lines, margin, y);
      y += lines.length * 4.6 + 8;
      return;
    }

    if (section.kind === 'kv') {
      section.rows.forEach(([k, v]) => {
        ensure(8);
        doc.setTextColor(110);
        doc.text(k, margin, y);
        doc.setTextColor(25);
        const vLines = doc.splitTextToSize(String(v), width - 70);
        doc.text(vLines, margin + 68, y);
        y += Math.max(6, vLines.length * 4.6);
      });
      y += 6;
      return;
    }

    // table
    const colCount = section.head.length;
    const colWidth = width / colCount;
    const drawHead = () => {
      doc.setFillColor(24, 60, 42);
      doc.rect(margin, y, width, 8, 'F');
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      section.head.forEach((h, i) => doc.text(String(h), margin + 2 + i * colWidth, y + 5.5));
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(35);
    };
    ensure(20);
    drawHead();

    if (section.rows.length === 0) {
      doc.setTextColor(120);
      doc.text('No records available for this disclosure.', margin + 2, y + 3);
      y += 10;
    }

    section.rows.forEach((row, idx) => {
      if (y + 8 > pageHeight - 22) {
        doc.addPage();
        y = 22;
        drawHead();
      }
      if (idx % 2 === 0) {
        doc.setFillColor(246, 249, 246);
        doc.rect(margin, y - 3.5, width, 7.5, 'F');
      }
      doc.setTextColor(35);
      doc.setFontSize(8);
      row.forEach((cell, i) => {
        const text = String(cell);
        const clipped = doc.splitTextToSize(text, colWidth - 3)[0] ?? '';
        doc.text(clipped, margin + 2 + i * colWidth, y + 1.5);
      });
      y += 7.5;
    });

    y += 4;
    if (section.note) {
      ensure(10);
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      const noteLines = doc.splitTextToSize(section.note, width);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 4 + 6;
    }
    y += 2;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(215);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    doc.setFontSize(6.5);
    doc.setTextColor(130);
    doc.text(doc.splitTextToSize(FOOTER_NOTE, width - 30), margin, pageHeight - 13);
    doc.text(`${i}/${pages}`, pageWidth - margin, pageHeight - 13, { align: 'right' });
  }

  doc.save(`${fw.shortName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report-${ds.generatedAt.split('T')[0]}.pdf`);
  return true;
}

/* ------------------------------ Excel --------------------------------- */

export function generateFrameworkExcel(fwId: string, ds: ReportDataset): boolean {
  const fw = FRAMEWORKS[fwId];
  if (!fw) return false;
  const assessment = assessFramework(fw, ds.availability);
  const sections = buildSections(fwId, ds, assessment);

  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const sheetName = (title: string) => {
    let base = title.replace(/[\\/?*[\]:]/g, '-').substring(0, 28) || 'Sheet';
    let name = base;
    let n = 2;
    while (used.has(name)) name = `${base.substring(0, 26)}_${n++}`;
    used.add(name);
    return name;
  };

  // Cover sheet identifies the framework and the shared dataset it draws on.
  const cover: Array<Array<string | number>> = [
    [fw.name],
    ['Framework ID', fw.id],
    ['Organization', ds.organizationName],
    ['Generated', ds.generatedAt],
    ['Methodology', ds.methodologyVersion],
    ['Emission factor sources', ds.factorSources.join(', ') || 'Not recorded'],
    ['Total emissions (tCO2e)', tNum(ds.totalKg)],
    ['Base year', baseYear(ds)],
    ['Reporting locale', ds.locale],
    ['Assurance status', 'Self-reported, unassured'],
    ['Evidenced disclosure references', `${assessment.completeness}%`],
    ['Evidenced, excluding disclosures outside the platform boundary', `${assessment.evidenceableCompleteness}%`],
    ['Declared data gaps', assessment.dataGaps.length],
    ['Declared not applicable', assessment.notApplicable.length],
    [],
    [FOOTER_NOTE],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), sheetName('Cover'));

  sections.forEach((section) => {
    let aoa: Array<Array<string | number>>;
    if (section.kind === 'text') aoa = [[section.title], [section.body]];
    else if (section.kind === 'kv') aoa = [[section.title], ...section.rows.map(([k, v]) => [k, v])];
    else {
      aoa = [[section.title], section.head, ...section.rows];
      if (section.note) aoa.push([], [section.note]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName(section.title));
  });

  XLSX.writeFile(wb, `${fw.shortName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report-${ds.generatedAt.split('T')[0]}.xlsx`);
  return true;
}
