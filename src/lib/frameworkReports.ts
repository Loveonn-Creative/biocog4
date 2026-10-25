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
import { buildSupplierLedger, normaliseVendor, summariseCoverage, TIER_LABEL } from '@/lib/supplierLedger';
import { pdfSafe } from '@/lib/pdfText';
import {
  FRAMEWORKS,
  assessFramework,
  coveredBasis,
  coveredKind,
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
  /** Emission row id: ties the register line to History and the audit ledger. */
  emissionId?: string | null;
  activityData?: number | null;
  activityUnit?: string | null;
  emissionFactor?: number | null;
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
  /** True when no record is verified yet: every figure comes from unverified
   *  records and every output is marked as a draft, never as a verified report. */
  draft?: boolean;
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
    ? `${numFmt(locale, 2).format(v / 1000)} tCO2e`
    : `${numFmt(locale, 1).format(v)} kgCO2e`;

/** Tonnes as a locale-formatted string for table cells. */
const tL = (v: number, locale: string) => numFmt(locale, 2).format(v / 1000);

/** Raw tonnes for spreadsheet cells that must stay numeric. */
const tNum = (v: number) => Number((v / 1000).toFixed(4));

/** Activity quantities: grouped digits, at most two decimals. */
const qtyL = (v: number, locale: string) => {
  try { return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v); } catch { return String(v); }
};

const countryName = (code: string) => {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch { return code; }
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
  if (!first) return 'Not established: no dated evidence recorded';
  const year = new Date(first).getFullYear();
  return Number.isNaN(year) ? 'Not established' : String(year);
};


/** Shared entity + boundary block used by every framework. */
const entitySection = (ds: ReportDataset): Section => ({
  kind: 'kv',
  title: 'Reporting entity and boundary',
  rows: [
    ['Organization', ds.organizationName],
    ['GSTIN', ds.gstin || 'Not recorded'],
    ['Sector', ds.sector || 'Not recorded'],
    ['Organization size', ds.size || 'Not recorded'],
    ['Country of operation', countryName(ds.country)],
    ['Reporting period', ds.periodStart && ds.periodEnd
      ? `${fmtDate(ds.periodStart, ds.locale)} to ${fmtDate(ds.periodEnd, ds.locale)}`
      : 'All recorded activity to date'],
    ['Base year', baseYear(ds)],
    ['Organizational boundary', 'Operational control'],
    ['Operational boundary', 'Scope 1, Scope 2 (location-based) and evidenced Scope 3 categories'],
    ['Report generated', fmtDate(ds.generatedAt, ds.locale)],
  ],
});

// The Scope 3 line names the categories actually on record (e.g. road
// freight), so it never reads as purchased goods or precursors it is not.
const scope3Label = (ds: ReportDataset, label: string): string => {
  const cats = [...new Set(ds.categories.filter((c) => c.scope === 3 && c.co2Kg > 0).map((c) => c.category.toLowerCase()))];
  return cats.length ? `${label}: ${cats.join(', ')}` : label;
};

const inventorySection = (ds: ReportDataset, labels: [string, string, string]): Section => ({
  kind: 'table',
  title: 'GHG inventory by scope',
  head: ['Scope', 'Description', 'tCO2e', 'Share'],
  rows: [
    ['Scope 1', labels[0], tL(ds.scope1Kg, ds.locale), pctL(ds.scope1Kg, ds.totalKg, ds.locale)],
    ['Scope 2', labels[1], tL(ds.scope2Kg, ds.locale), pctL(ds.scope2Kg, ds.totalKg, ds.locale)],
    ['Scope 3', scope3Label(ds, labels[2]), tL(ds.scope3Kg, ds.locale), pctL(ds.scope3Kg, ds.totalKg, ds.locale)],
    ['Total', '', tL(ds.totalKg, ds.locale), pctL(ds.totalKg, ds.totalKg, ds.locale)],
  ],
});

const categorySection = (ds: ReportDataset): Section => ({
  kind: 'table',
  title: 'Emissions by activity category',
  head: ['Category', 'Scope', 'Activity data', 'Unit', 'Factor', 'tCO2e', 'Source'],
  rows: ds.categories.map((c) => [
    c.category,
    `Scope ${c.scope}`,
    c.activityData != null ? qtyL(c.activityData, ds.locale) : '-',
    c.activityUnit ?? '-',
    c.emissionFactor ?? '-',
    tL(c.co2Kg, ds.locale),
    c.dataQuality ? cap(c.dataQuality) : 'Not rated',
  ]),
});

const methodologySection = (ds: ReportDataset): Section => ({
  kind: 'kv',
  title: 'Quantification methodology',
  rows: [
    ['Methodology version', ds.methodologyVersion],
    ['Emission factor sources', ds.factorSources.length ? ds.factorSources.join(', ') : 'Not recorded'],
    ['Activity data source', 'Supplier invoices, bills and meter records uploaded by the company'],
    ['Calculation', 'Activity data × published emission factor. No spend-based estimates'],
    ['Gases covered', 'CO2. The grid factor (CEA) and the IPCC fuel factors cover CO2 only; CH4 and N2O are not included'],
    ['Scope 2 method', 'Location-based (grid average). No market-based figure'],
    ['Exclusions', 'Activity without a supporting document is left out'],
    ['Recalculation policy', 'Restated when a source document is corrected or a factor is superseded'],
  ],
});

/** Completeness, quality and assurance, stated uniformly for every framework. */
const dataQualitySection = (ds: ReportDataset): Section => {
  const verified = ds.evidence.filter((e) => e.verificationStatus === 'verified').length;
  const rated = ds.categories.filter((c) => Boolean(c.dataQuality)).length;
  return {
    kind: 'kv',
    title: 'Data quality and assurance',
    rows: [
      ['Evidence records', String(ds.evidence.length)],
      ['Of which verified', `${verified} of ${ds.evidence.length}`],
      ['Activity categories', String(ds.categories.length)],
      ['Categories with a source type', `${rated} of ${ds.categories.length}`],
      ['Assurance', 'None. Self-reported'],
      ['Uncertainty', 'No numeric range. Each category is rated by source type (invoice, bill or meter)'],
    ],
  };
};

// Verified records only, so the register adds up to the verified totals above.
// Each line carries its emission id, activity and factor so it can be
// checked and matched to the audit ledger export (full ids and hashes there).
const evidenceSection = (ds: ReportDataset): Section => {
  // A draft lists the unverified records its figures come from, each marked as such.
  const rows = ds.draft ? ds.evidence : ds.evidence.filter((e) => e.verificationStatus === 'verified');
  const left = ds.evidence.length - rows.length;
  const notes = [
    ds.draft ? 'Pre-verification: these records are awaiting verification.' : '',
    rows.length > 200 ? `Showing first 200 of ${rows.length} ${ds.draft ? '' : 'verified '}records.` : '',
    left > 0 ? `${left} unverified ${left === 1 ? 'record is' : 'records are'} not listed and not counted.` : '',
    'IDs and hashes show their first characters. The company holds the full values.',
  ].filter(Boolean).join(' ');
  return {
    kind: 'table',
    title: 'Evidence register',
    head: ['Emission ID', 'Evidence hash', 'Document', 'Vendor', 'Date', 'Scope', 'Activity', 'Factor', 'tCO2e'],
    rows: rows.slice(0, 200).map((e) => [
      (e.emissionId || '-').substring(0, 8),
      e.documentHash.substring(0, 12),
      e.invoiceNumber || '-',
      e.vendor || '-',
      e.invoiceDate ? fmtDate(e.invoiceDate, ds.locale) : '-',
      `Scope ${e.scope}`,
      e.activityData != null ? `${qtyL(e.activityData, ds.locale)} ${e.activityUnit || ''}`.trim() : '-',
      e.emissionFactor != null ? String(e.emissionFactor) : '-',
      tL(e.co2Kg, ds.locale),
    ]),
    note: notes,
  };
};

/** "x of y listed disclosures covered": counts only what this report lists, never the standard's full list. */
const mappedLine = (a: FrameworkAssessment): string =>
  `${a.satisfied.length} of ${a.satisfied.length + a.missingDetail.length} listed disclosures covered`;

const ENERGY_UNITS = /^(kwh|mwh|kvah|litres?|liters?|l|kg|tonnes?|t|scm|m3|mmbtu|gj)$/i;

/**
 * Energy use as recorded on the documents, so a framework row marked
 * "Evidenced" for energy always has the quantities behind it. Quantities are
 * shown in their recorded units; no calorific conversion is applied here.
 */
const energySection = (ds: ReportDataset): Section | null => {
  const rows = ds.categories
    .filter((c) => c.activityData != null && c.activityUnit && ENERGY_UNITS.test(c.activityUnit.trim()) && (c.scope === 1 || c.scope === 2))
    .map((c) => [c.category, `Scope ${c.scope}`, numFmt(ds.locale, 0).format(c.activityData as number), c.activityUnit as string, tL(c.co2Kg, ds.locale)]);
  if (rows.length === 0) return null;
  return {
    kind: 'table',
    title: 'Energy use recorded',
    head: ['Energy source', 'Scope', 'Quantity', 'Unit', 'tCO2e'],
    rows,
    note: 'Quantities as shown on bills and invoices.',
  };
};

/**
 * Supplier evidence annex: the same verified evidence, grouped by counterparty,
 * with emissions split by scope.
 * Suppliers without usable evidence are listed as declared gaps rather than
 * estimated, so a buyer or auditor can see exactly what is covered.
 */
const supplierAnnexSection = (ds: ReportDataset): Section | null => {
  const rows = ds.draft ? ds.evidence : ds.evidence.filter((e) => e.verificationStatus === 'verified');
  const suppliers = buildSupplierLedger(
    rows.map((e) => ({
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

  // Emissions per supplier and scope, from the same rows, so no supplier is
  // shown under a scope it does not belong to.
  const byScope = new Map<string, [number, number, number]>();
  rows.forEach((e) => {
    const key = normaliseVendor(e.vendor);
    if (!key) return;
    const t = byScope.get(key) ?? [0, 0, 0];
    if (e.scope >= 1 && e.scope <= 3) t[e.scope - 1] += e.co2Kg;
    byScope.set(key, t);
  });
  const coverage = summariseCoverage(suppliers);
  const cell = (kg: number) => (kg > 0 ? tL(kg, ds.locale) : '-');

  return {
    kind: 'table',
    title: 'Supplier evidence annex',
    head: ['Supplier', 'Documents', 'Verified', 'Scope 1 tCO2e', 'Scope 2 tCO2e', 'Scope 3 tCO2e', 'Evidence basis'],
    rows: suppliers.slice(0, 100).map((s) => {
      const [s1, s2, s3] = byScope.get(s.key) ?? [0, 0, 0];
      return [s.name, s.documentCount, s.verifiedCount, cell(s1), cell(s2), cell(s3), TIER_LABEL[s.tier]];
    }),
    note:
      `${coverage.evidencedCount} of ${coverage.supplierCount} suppliers carry usable evidence.` +
      (suppliers.length > 100 ? ` Showing the first 100 of ${suppliers.length} suppliers.` : ''),
  };
};


const verificationSection = (ds: ReportDataset): Section => ({
  kind: 'kv',
  title: 'Verification status',
  rows: ds.verification
    ? [
        ds.verification.status === 'verified'
          ? ['Verified by', 'Senseible, expert-supervised']
          : ['Status', cap(ds.verification.status)],
        ['Records passing evidence checks', ds.verification.score === null ? 'Not scored' : `${Math.round(ds.verification.score * 100)}%`],
        ['Overclaim risk (Senseible check)', ds.verification.greenwashingRisk ? cap(ds.verification.greenwashingRisk) : 'Not assessed'],
        ['Verified on', fmtDate(ds.verification.verifiedAt, ds.locale)],
      ]
    : [['Status', 'Not verified yet']],
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
          // progress_pct comes from Net Zero actions marked done: a planning estimate, not a measured cut.
          ...(ds.target.progressPct ? [['Planned cut from actions marked done', `${ds.target.progressPct}% of the target (estimate, not yet measured)`] as [string, string]] : []),
          ['Validation', 'Set by the company. Not externally validated'],
        ],
      }
    : {
        kind: 'text',
        title: 'Reduction target',
        body: 'No reduction target recorded.',
      };

const COVERED_STATUS = { evidenced: 'Evidenced', stated: 'Stated by company', provided: 'Provided' } as const;

const gapSection = (assessment: FrameworkAssessment): Section => {
  const metricOf = (ref: string) => assessment.framework.metricsMapping[ref];
  return {
    kind: 'table',
    title: 'Disclosure index',
    head: ['Disclosure', 'Status', 'Basis'],
    rows: [
      ...assessment.satisfied.map((r) => [r, COVERED_STATUS[coveredKind(metricOf(r))], coveredBasis(metricOf(r))]),
      ...assessment.missingDetail.map((m) => [m.reference, m.classification === 'data_gap' ? 'Data gap' : 'Not covered', m.reason]),
    ],
    note:
      'Limited to the disclosures listed, not every disclosure in the standard.' +
      (assessment.dataGaps.length ? ' A data gap closes when the missing record is uploaded.' : ''),
  };
};


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
    quality: dataQualitySection(ds),
  };

  const note = (title: string, body: string): Section => ({ kind: 'text', title, body });

  /** Standard tail every framework view shares. */
  const supplierAnnex = supplierAnnexSection(ds);
  const energy = energySection(ds);
  const tail: Section[] = [
    ...(energy ? [energy] : []),
    common.index,
    common.quality,
    ...(supplierAnnex ? [supplierAnnex] : []),
    common.verification,
    common.evidence,
  ];

  const supersededNote = assessment.framework.supersededBy
    ? [note('Standard status', assessment.framework.note || '')]
    : [];

  switch (fwId) {
    case 'GHG_PROTOCOL':
      return [
        common.entity,
        note(
          'Basis of preparation',
          'Prepared using the GHG Protocol Corporate Standard, with operational control as the boundary.',
        ),
        inventorySection(ds, ['Direct emissions', 'Purchased electricity (location-based)', 'Value chain']),
        common.categories,
        common.methodology,
        common.target,
        ...tail,
      ];

    case 'ISO_14064':
      return [
        common.entity,
        note(
          'Clause 5: Boundaries',
          'The organizational boundary is operational control. Emissions are split by ISO 14064-1 category.',
        ),
        inventorySection(ds, ['Category 1: Direct GHG emissions', 'Category 2: Indirect from imported energy', 'Categories 3 to 6: Other indirect']),
        common.categories,
        note(
          'Clause 6: Quantification',
          'Activity data from invoices, bills and meter records, multiplied by a published emission factor. No modelled or extrapolated activity.',
        ),
        common.methodology,
        common.target,
        note(
          'Verification (ISO 14064-3)',
          'Not verified to ISO 14064-3. Senseible\'s own check is described under Verification status.',
        ),
        ...tail,
      ];

    case 'ISO_14067':
      return [
        common.entity,
        note(
          'Functional unit and product system',
          ds.availability.productLevel
            ? 'Emissions are attributed to the goods named on HSN/CN coded purchase and dispatch records. The functional unit is the unit on the dispatch record; a good without a dispatch quantity is left as a gap.'
            : 'No product footprint: there is no production data per product (HSN/CN code). The site totals below are context, not a product footprint.',
        ),
        inventorySection(ds, ['Site direct emissions', 'Site electricity', 'Site value chain']),
        common.categories,
        ...(ds.availability.productLevel
          ? [note('Life cycle stages', 'Cradle-to-gate, limited to stages backed by documents. Use phase, distribution beyond recorded freight and end-of-life are not covered and not modelled.')]
          : []),
        common.methodology,
        ...tail,
      ];

    case 'GRI_305':
      return [
        common.entity,
        note(
          'GRI 305: Reporting approach',
          'Reported with reference to GRI 305. Not covered: 305-6 ozone-depleting substances and 305-7 NOx and SOx. Biogenic CO2 is not recorded.',
        ),
        inventorySection(ds, ['305-1 Direct (Scope 1) GHG emissions', '305-2 Energy indirect (Scope 2) GHG emissions', '305-3 Other indirect (Scope 3) GHG emissions']),
        common.categories,
        ...(ds.availability.intensity ? [note('305-4 GHG emissions intensity', 'Intensity uses the recorded production output.')] : []),
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'SASB':
      return [
        common.entity,
        note(
          'SASB: Applicability',
          'SASB metric codes depend on your industry standard. This report covers emissions and energy only.',
        ),
        inventorySection(ds, ['Gross global Scope 1 emissions', 'Electricity (context)', 'Value chain (context)']),
        common.categories,
        common.methodology,
        ...tail,
      ];

    case 'TCFD':
      return [
        common.entity,
        ...supersededNote,
        note(
          'Governance, strategy and risk management',
          'You write these three pillars. This report covers metrics and targets.',
        ),
        inventorySection(ds, ['Direct emissions', 'Electricity (location-based)', 'Value chain']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'ISSB_S1':
      return [
        common.entity,
        note(
          'What this report covers',
          'Metrics and targets, from your own records. You write governance, strategy and risk management.',
        ),
        inventorySection(ds, ['Direct emissions', 'Electricity (location-based)', 'Value chain']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'ISSB_S2':
      return [
        common.entity,
        note(
          'What this report covers',
          'Scope 1, 2 and 3 totals from your records. Scope 2 is location-based only. You write scenario analysis, the transition plan and physical risk.',
        ),
        inventorySection(ds, ['Direct emissions', 'Electricity (location-based)', 'Value chain']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'CDP':
      return [
        common.entity,
        note(
          'What this report covers',
          'Figures for CDP\'s emissions questions only. Governance, risk and strategy answers are yours; verification needs a third party.',
        ),
        inventorySection(ds, ['Direct emissions', 'Electricity (location-based)', 'Value chain']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'CSRD_ESRS':
      return [
        common.entity,
        note(
          'ESRS E1: Climate change',
          'This report covers energy (E1-5), gross Scope 1, 2 and 3 emissions (E1-6) and any target you set (E1-4). You write the transition plan (E1-1), policies (E1-2), actions (E1-3) and the double materiality assessment.',
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
          'What this report covers',
          'No nature disclosures: TNFD needs site location and nature data, which Senseible does not hold. Your emissions are in the GHG Protocol report.',
        ),
        common.index,
      ];

    case 'SBTI':
      return [
        common.entity,
        note(
          'Target-setting basis',
          'Not an SBTi target. SBTi validates targets after submission; this report gives your base year emissions and any target you set.',
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
          'What this report covers',
          'Measured emissions and any reduction target for SDG 13, recorded energy use for SDG 7. It claims no progress on any goal.',
        ),
        inventorySection(ds, ['Direct emissions', 'Electricity', 'Value chain']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'INDIA_CPCB':
      return [
        common.entity,
        note(
          'What this report covers',
          'The fuel and energy record an energy audit needs. It does not show compliance with any consent condition: stack, effluent and waste readings come from accredited laboratories.',
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
          title: 'Section A: General disclosures',
          rows: [
            ['Name of the entity', ds.organizationName],
            ['GSTIN', ds.gstin || 'Not recorded'],
            ['Sector / industry', ds.sector || 'Not recorded'],
            ['Scale of entity', ds.size || 'Not recorded'],
            ['Reporting period', ds.periodStart && ds.periodEnd
              ? `${fmtDate(ds.periodStart, ds.locale)} to ${fmtDate(ds.periodEnd, ds.locale)}`
              : 'All recorded activity to date'],
          ],
        },
        note(
          'Section B: Management and process disclosures',
          'Section B is yours to write before filing.',
        ),
        note(
          'Section C, Principle 6: Environment',
          'Greenhouse gas emissions from your invoices and bills. Not covered: water, waste and biodiversity indicators.',
        ),
        inventorySection(ds, ['Principle 6: Scope 1 emissions', 'Principle 6: Scope 2 emissions', 'Principle 6: Scope 3 emissions (leadership indicator)']),
        common.categories,
        common.methodology,
        common.target,
        ...tail,
      ];

    case 'INDIA_BRSR_CORE':
      return [
        common.entity,
        note(
          'BRSR Core: basis and assurance',
          'BRSR Core KPIs need reasonable assurance when filed. This report is the unassured source data.',
        ),
        inventorySection(ds, ['Attribute 1: Scope 1 emissions', 'Attribute 1: Scope 2 emissions', 'Scope 3 (outside BRSR Core)']),
        ...(ds.availability.intensity ? [note('Attribute 1: GHG intensity', 'Intensity uses the recorded production output.')] : []),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    case 'CBAM':
      return [
        common.entity,
        note(
          'What these figures are',
          'Site-level direct and electricity emissions from your invoices and bills. Embedded emissions per good need production data by CN code; without it they are left as a gap, not allocated.',
        ),
        inventorySection(ds, ['Direct emissions', 'Electricity (indirect)', 'Other value chain (not part of CBAM)']),
        common.categories,
        note(
          'Default values',
          'Without actual data per good, EU default values apply at the border. This report uses actual figures only and adds no default.',
        ),
        common.methodology,
        ...tail,
      ];

    case 'LENDER_VIEW':
      return [
        common.entity,
        note(
          'Purpose of this pack',
          'For credit or sustainability-linked loan review: the borrower\'s emissions baseline from its own documents, and what is missing. Not a credit assessment, a rating or a statement of eligibility for any facility.',
        ),
        inventorySection(ds, ['Direct emissions baseline', 'Electricity baseline', 'Value chain']),
        common.target,
        note(
          'Using these figures as a KPI baseline',
          'Each figure traces to the evidence register: document hash, activity data and emission factor. Write a KPI only against figures marked Evidenced.',
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
          'For investors reviewing the company\'s climate data: total emissions, Scope 3, any target, and the document behind each figure.',
        ),
        inventorySection(ds, ['Direct emissions', 'Electricity (location-based)', 'Value chain']),
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
          'Supporting data for a government submission. Every figure traces to a document in the evidence register.',
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
          'Your verified records on one page. Every framework report uses the same figures.',
        ),
        inventorySection(ds, ['Direct emissions', 'Electricity', 'Value chain']),
        common.categories,
        common.target,
        common.methodology,
        ...tail,
      ];

    default:
      return [
        common.entity,
        inventorySection(ds, ['Direct emissions', 'Electricity', 'Value chain']),
        common.categories,
        common.methodology,
        common.target,
        ...tail,
      ];
  }
}


const DRAFT_NOTE = 'PRE-VERIFICATION: these figures are measured from your uploaded documents and are awaiting verification. Do not submit this as a verified report.';
const FOOTER_NOTE =
  'Decision-support disclosure from the company\'s own documents. Not a statutory filing, assurance or certification statement.';

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
  doc.text(doc.splitTextToSize(ds.draft ? `Pre-verification: ${fw.name}` : fw.name, width), margin, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(pdfSafe(`${ds.organizationName} · ${kgL(ds.totalKg, ds.locale)} total · ${mappedLine(assessment)}`), margin, 35);
  y = 54;
  if (ds.draft) {
    doc.setFillColor(255, 243, 214);
    const draftLines = doc.splitTextToSize(DRAFT_NOTE, width - 8);
    doc.rect(margin, y - 6, width, draftLines.length * 4.6 + 6, 'F');
    doc.setTextColor(110, 70, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(draftLines, margin + 4, y);
    doc.setFont('helvetica', 'normal');
    y += draftLines.length * 4.6 + 8;
  }

  sections.forEach((section) => {
    ensure(20);
    doc.setTextColor(24, 60, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(pdfSafe(section.title), margin, y);
    y += 7;
    doc.setTextColor(45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    if (section.kind === 'text') {
      const lines = doc.splitTextToSize(pdfSafe(section.body), width);
      ensure(lines.length * 4.6 + 4);
      doc.text(lines, margin, y);
      y += lines.length * 4.6 + 8;
      return;
    }

    if (section.kind === 'kv') {
      section.rows.forEach(([k, v]) => {
        ensure(8);
        doc.setTextColor(110);
        doc.text(pdfSafe(k), margin, y);
        doc.setTextColor(25);
        const vLines = doc.splitTextToSize(pdfSafe(String(v)), width - 70);
        doc.text(vLines, margin + 68, y);
        y += Math.max(6, vLines.length * 4.6);
      });
      y += 6;
      return;
    }

    // table: columns sized to their content, cells wrap (up to 3 lines) instead of being cut
    const cellText = (v: unknown) => pdfSafe(String(v));
    doc.setFontSize(8);
    const natural = section.head.map((h, i) => {
      let w = doc.getTextWidth(cellText(h));
      section.rows.slice(0, 60).forEach((r) => { w = Math.max(w, doc.getTextWidth(cellText(r[i] ?? ''))); });
      return Math.min(Math.max(w + 4, 14), 70);
    });
    const naturalTotal = natural.reduce((a, b) => a + b, 0);
    const widths = natural.map((w) => (w / naturalTotal) * width);
    const xs = widths.map((_, i) => margin + widths.slice(0, i).reduce((a, b) => a + b, 0));
    const lineH = 3.6;
    const drawHead = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const headLines = section.head.map((h, i) => (doc.splitTextToSize(cellText(h), widths[i] - 3) as string[]).slice(0, 2));
      const hh = Math.max(...headLines.map((l) => l.length)) * lineH + 4.4;
      doc.setFillColor(24, 60, 42);
      doc.rect(margin, y, width, hh, 'F');
      doc.setTextColor(255);
      headLines.forEach((l, i) => doc.text(l, xs[i] + 1.5, y + 4.8));
      y += hh + 2.5;
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
      doc.setFontSize(8);
      const cellLines = row.map((cell, i) => (doc.splitTextToSize(cellText(cell), widths[i] - 3) as string[]).slice(0, 3));
      const rh = Math.max(1, ...cellLines.map((l) => l.length)) * lineH + 3.2;
      if (y + rh > pageHeight - 22) {
        doc.addPage();
        y = 22;
        drawHead();
      }
      if (idx % 2 === 0) {
        doc.setFillColor(246, 249, 246);
        doc.rect(margin, y - 3.2, width, rh, 'F');
      }
      doc.setTextColor(35);
      doc.setFontSize(8);
      cellLines.forEach((l, i) => doc.text(l, xs[i] + 1.5, y + 0.6));
      y += rh;
    });

    y += 4;
    if (section.note) {
      ensure(10);
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      const noteLines = doc.splitTextToSize(pdfSafe(section.note), width);
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
    doc.text(doc.splitTextToSize(ds.draft ? `${DRAFT_NOTE} ${FOOTER_NOTE}` : FOOTER_NOTE, width - 30), margin, pageHeight - 13);
    doc.text(`${i}/${pages}`, pageWidth - margin, pageHeight - 13, { align: 'right' });
  }

  doc.save(`${fw.shortName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${ds.draft ? 'pre-verification' : 'report'}-${ds.generatedAt.split('T')[0]}.pdf`);
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
    const base = title.replace(/[\\/?*[\]:]/g, '-').substring(0, 28) || 'Sheet';
    let name = base;
    let n = 2;
    while (used.has(name)) name = `${base.substring(0, 26)}_${n++}`;
    used.add(name);
    return name;
  };

  // Cover sheet identifies the framework and the shared dataset it draws on.
  const cover: Array<Array<string | number>> = [
    ...(ds.draft ? [[DRAFT_NOTE]] : []),
    [ds.draft ? `Pre-verification: ${fw.name}` : fw.name],
    ['Framework ID', fw.id],
    ['Organization', ds.organizationName],
    ['Generated', ds.generatedAt],
    ['Methodology', ds.methodologyVersion],
    ['Emission factor sources', ds.factorSources.join(', ') || 'Not recorded'],
    ['Total emissions (tCO2e)', tNum(ds.totalKg)],
    ['Base year', baseYear(ds)],
    ['Assurance', 'None. Self-reported'],
    ['Listed disclosures covered', mappedLine(assessment)],
    ['Data gaps', assessment.dataGaps.length],
    ['Not covered', assessment.notApplicable.length],
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

  XLSX.writeFile(wb, `${fw.shortName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${ds.draft ? 'pre-verification' : 'report'}-${ds.generatedAt.split('T')[0]}.xlsx`);
  return true;
}
