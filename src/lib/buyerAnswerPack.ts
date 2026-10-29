// Buyer answer pack: the emissions answers a supplier is asked for in buyer
// questionnaires (CDP Supply Chain, EcoVadis, customer portals), pre-filled
// from the same ReportDataset every Reports export uses, in the order buyers
// ask. Every answer carries its basis. Nothing is estimated or filled in: a
// question the records cannot answer says so.
//
// Read-only over existing records. It changes no figure, no verification
// state and no other report.

import type { ReportDataset } from '@/lib/frameworkReports';
import type { Scope2Summary } from '@/lib/scope2Summary';
import { pdfSafe } from '@/lib/pdfText';
import { SCOPE3_CATEGORIES } from '../../supabase/functions/_shared/scope3';

export const BUYER_PACK_REPORT = 'BUYER_PACK';

export interface PackRow {
  question: string;
  answer: string;
  basis: string;
  /** tCO2e as a number, for spreadsheet cells, when the answer is an emissions figure. */
  tonnes?: number;
  /** False when the records cannot answer the question. */
  filled: boolean;
}

export interface PackSection { title: string; rows: PackRow[]; note?: string }

export interface BuyerAnswerPack {
  draft: boolean;
  organizationName: string;
  periodLabel: string;
  generatedAt: string;
  sections: PackSection[];
}

export interface BuyerPackExtras {
  /** useScope2Summary: market-based results and renewable purchase records. */
  scope2?: Scope2Summary | null;
  /** useScope3Summary: verified invoice lines by GHG Scope 3 category (1 to 15). */
  scope3?: { enabled: boolean; categories: Array<{ category: number; kg: number; lines: number }> } | null;
}

// Wording follows the existing exports. "Verified" is explained as in the
// audit exports (govComplianceAdapter.ts, useComplianceLedger.ts), naming
// Senseible instead of "the platform" (banned in report copy); who verified is
// "Senseible, expert-supervised" as in frameworkReports.ts and the certificate.
export const VERIFIED_MEANS = '"Verified" means Senseible\'s rule checks passed against the source document; it is not third-party assurance.';
export const NO_INSTRUMENTS = 'Not available: no renewable purchase records uploaded';
const GASES = 'CO2 only. Methane and nitrous oxide from fuels add under 1% and are not included.';
const DRAFT_NOTE = 'PRE-VERIFICATION: these answers come from records read from your documents that are not verified yet. Verify them before you send this to a buyer.';
const FOOTER = 'Prepared by Senseible from your own documents. Not a statutory filing, assurance or certification statement.';

/* ------------------------------ formatting ------------------------------ */

const fmt = (v: number, digits: number) => {
  try {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
  } catch {
    return v.toFixed(digits);
  }
};
const tonnes = (kg: number) => `${fmt(kg / 1000, 2)} tCO2e`;
const tNum = (kg: number) => Number((kg / 1000).toFixed(4));
const pct = (part: number, whole: number) => `${fmt(whole > 0 ? (part / whole) * 100 : 0, 0)}%`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const date = (iso: string, locale: string) => {
  try {
    return new Date(iso).toLocaleDateString(locale || 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
};
const fyLabel = (y: string) => (y.startsWith('FY') ? `FY ${y.slice(2)}` : y);

/* ------------------------- Scope 3 categories --------------------------- */

// When the line-by-line Scope 3 results are not available, a recorded Scope 3
// activity is placed in a GHG category only where Senseible's invoice line
// rules (supabase/functions/_shared/scope3.ts, classifyLine) place it the same
// way: freight in 4, travel and hotel stays in 6, waste services in 5.
// Anything else is listed as not sorted, never guessed.
const CATEGORY_RULES: Array<[RegExp, number]> = [
  [/freight|transport|logistic|courier|shipping|cartage|haulage|truck|lorry/i, 4],
  [/travel|flight|air ?fare|air ticket|train ticket|rail ticket|bus ticket|taxi|cab hire|hotel|lodging/i, 6],
  [/waste|scrap disposal|garbage/i, 5],
];
export const ghgCategoryOf = (activity: string): number | null =>
  CATEGORY_RULES.find(([re]) => re.test(activity))?.[1] ?? null;

/* -------------------------------- builder ------------------------------- */

export function buildBuyerAnswerPack(ds: ReportDataset, extras: BuyerPackExtras = {}): BuyerAnswerPack {
  const draft = Boolean(ds.draft);
  // The records behind the figures: verified ones, or in a draft the unverified ones.
  const rows = draft ? ds.evidence : ds.evidence.filter((e) => e.verificationStatus === 'verified');
  const kind = draft ? 'unverified' : 'verified';
  const countIn = (scope: number, category?: string) =>
    rows.filter((e) => e.scope === scope && (category === undefined || e.category === category)).length;
  const records = (n: number, what = 'record') => `${plural(n, `${kind} ${what}`)}`;

  const periodLabel = ds.periodStart && ds.periodEnd
    ? `${date(ds.periodStart, ds.locale)} to ${date(ds.periodEnd, ds.locale)}`
    : 'All recorded activity to date';

  const sections: PackSection[] = [];

  // 1. Reporting period
  sections.push({
    title: '1. Reporting period',
    rows: [{
      question: 'What period do these figures cover?',
      answer: periodLabel,
      basis: 'Earliest and latest invoice or bill date in your records',
      filled: Boolean(ds.periodStart && ds.periodEnd),
    }],
  });

  // 2. Organisation basics
  const orgRows: PackRow[] = [
    { question: 'Organisation name', answer: ds.organizationName, basis: 'Your business details in Senseible', filled: true },
    ds.sector
      ? { question: 'Sector', answer: ds.sector, basis: 'Your business details in Senseible', filled: true }
      : { question: 'Sector', answer: 'Not recorded in your business details', basis: 'Your business details in Senseible', filled: false },
  ];
  if (ds.gstin) orgRows.push({ question: 'GSTIN', answer: ds.gstin, basis: 'Your business details in Senseible', filled: true });
  sections.push({ title: '2. Your organisation', rows: orgRows });

  // 3. Scope 1
  const s1 = ds.categories.filter((c) => c.scope === 1 && c.co2Kg > 0).sort((a, b) => b.co2Kg - a.co2Kg);
  const s1Rows: PackRow[] = [{
    question: 'Gross Scope 1 emissions',
    answer: tonnes(ds.scope1Kg),
    tonnes: tNum(ds.scope1Kg),
    basis: `${records(countIn(1))} (fuel invoices and bills) × published emission factors`,
    filled: true,
  }];
  if (s1.length) {
    s1Rows.push({
      question: 'Main Scope 1 sources',
      answer: s1.slice(0, 3).map((c) => `${c.category}: ${tonnes(c.co2Kg)} (${pct(c.co2Kg, ds.scope1Kg)})`).join('; '),
      basis: 'Grouped by the fuel named on each invoice',
      filled: true,
    });
  }
  sections.push({ title: '3. Scope 1: fuel burned on site', rows: s1Rows });

  // 4. Scope 2
  const s2Rows: PackRow[] = [{
    question: 'Gross Scope 2 emissions, location-based',
    answer: tonnes(ds.scope2Kg),
    tonnes: tNum(ds.scope2Kg),
    basis: `${records(countIn(2))} (electricity bills) × grid average factor for the bill's year`,
    filled: true,
  }];
  const s2 = extras.scope2;
  const instruments = s2?.enabled ? s2.instruments : [];
  if (instruments.length > 0) {
    const years = (s2?.years ?? []).filter((y) => y.market);
    const basis = `${plural(instruments.length, 'renewable purchase record')} you added (certificates, power purchase agreements or green tariffs)`;
    s2Rows.push({
      question: 'Gross Scope 2 emissions, market-based',
      answer: years.length
        ? years.map((y) => `${fyLabel(y.year)}: ${y.market!.kg === null ? 'not calculated' : tonnes(y.market!.kg)}`).join('; ')
        : 'Not calculated yet for any year',
      tonnes: years.length === 1 && years[0].market!.kg !== null ? tNum(years[0].market!.kg) : undefined,
      basis,
      filled: years.some((y) => y.market!.kg !== null),
    });
    s2Rows.push({
      question: 'Share of electricity from renewable sources',
      answer: years.length
        ? years.map((y) => `${fyLabel(y.year)}: ${pct(y.market!.instrumentKwh, y.market!.kwh)} (${fmt(y.market!.instrumentKwh, 0)} of ${fmt(y.market!.kwh, 0)} kWh)`).join('; ')
        : 'Not calculated yet for any year',
      basis: 'Electricity covered by those records, of all electricity billed',
      filled: years.length > 0,
    });
  } else {
    s2Rows.push({
      question: 'Market-based Scope 2 and renewable share',
      answer: NO_INSTRUMENTS,
      basis: 'No certificate, power purchase agreement or green tariff on record',
      filled: false,
    });
  }
  sections.push({ title: '4. Scope 2: purchased electricity', rows: s2Rows });

  // 5. Scope 3 by GHG category, categories with records only
  const s3Rows: PackRow[] = [];
  const lineCats = extras.scope3?.enabled ? extras.scope3.categories.filter((c) => c.kg > 0) : [];
  let s3Note = 'Categories with no records are left out, not reported as zero.';
  if (lineCats.length) {
    lineCats.sort((a, b) => a.category - b.category).forEach((c) => s3Rows.push({
      question: `Category ${c.category}: ${SCOPE3_CATEGORIES[c.category] ?? 'Other'}`,
      answer: tonnes(c.kg),
      tonnes: tNum(c.kg),
      basis: `${plural(c.lines, 'verified invoice line')} × approved factors`,
      filled: true,
    }));
    s3Note = `From verified invoice lines. ${s3Note}`;
  } else {
    const s3 = ds.categories.filter((c) => c.scope === 3 && c.co2Kg > 0);
    const byCat = new Map<number | null, { kg: number; n: number; names: string[] }>();
    s3.forEach((c) => {
      const k = ghgCategoryOf(c.category);
      const e = byCat.get(k) ?? { kg: 0, n: 0, names: [] };
      e.kg += c.co2Kg;
      e.n += countIn(3, c.category);
      e.names.push(c.category);
      byCat.set(k, e);
    });
    [...byCat.entries()]
      .sort(([a], [b]) => (a ?? 99) - (b ?? 99))
      .forEach(([cat, e]) => s3Rows.push({
        question: cat === null ? 'Not sorted into a GHG category yet' : `Category ${cat}: ${SCOPE3_CATEGORIES[cat]}`,
        answer: tonnes(e.kg),
        tonnes: tNum(e.kg),
        basis: `${records(e.n)}: ${e.names.join(', ').toLowerCase()}`,
        filled: cat !== null,
      }));
  }
  if (s3Rows.length) {
    s3Rows.push({
      question: 'Total Scope 3 on record',
      answer: tonnes(ds.scope3Kg),
      tonnes: tNum(ds.scope3Kg),
      basis: `${records(countIn(3))} × published emission factors`,
      filled: true,
    });
  } else {
    s3Rows.push({
      question: 'Scope 3 emissions',
      answer: 'None on record',
      basis: 'No freight, travel, waste or purchase records yet',
      filled: false,
    });
    s3Note = '';
  }
  sections.push({ title: '5. Scope 3 by GHG category', rows: s3Rows, note: s3Note || undefined });

  // 6. Methodology
  sections.push({
    title: '6. Methodology',
    rows: [
      { question: 'Standard used', answer: 'GHG Protocol Corporate Standard, operational control boundary', basis: 'How Senseible calculates every record', filled: true },
      {
        question: 'Emission factor sources',
        answer: ds.factorSources.length ? ds.factorSources.join('; ') : 'Not recorded',
        basis: 'Stored with each record',
        filled: ds.factorSources.length > 0,
      },
      { question: 'Methodology version', answer: ds.methodologyVersion, basis: 'Stored with each record', filled: true },
      { question: 'Calculation approach', answer: 'Quantity on each invoice or bill × a published emission factor. No spend-based estimates.', basis: 'Activity-based, from documents', filled: true },
      { question: 'Gases included', answer: GASES, basis: 'Emission factors used', filled: true },
    ],
  });

  // 7. Data quality and verification
  const all = ds.evidence.length;
  const verified = ds.evidence.filter((e) => e.verificationStatus === 'verified');
  const allKg = ds.evidence.reduce((a, e) => a + e.co2Kg, 0);
  const verifiedKg = verified.reduce((a, e) => a + e.co2Kg, 0);
  const qRows: PackRow[] = [
    {
      question: 'Share of records verified',
      answer: `${verified.length} of ${plural(all, 'record')} (${pct(verified.length, all)})`,
      basis: 'Verification status on each record',
      filled: all > 0,
    },
    {
      question: 'Share of emissions verified',
      answer: `${pct(verifiedKg, allKg)} of recorded tCO2e`,
      basis: 'Verified tCO2e of all tCO2e on record',
      filled: all > 0,
    },
  ];
  if (ds.verification?.status === 'verified') {
    qRows.push({ question: 'Who verified', answer: 'Senseible, expert-supervised', basis: `Latest check on ${date(ds.verification.verifiedAt ?? ds.generatedAt, ds.locale)}`, filled: true });
  }
  qRows.push(
    { question: 'What verified means', answer: VERIFIED_MEANS, basis: 'Senseible verification', filled: true },
    { question: 'Third-party assurance', answer: 'None', basis: 'No assurance statement on record', filled: true },
  );
  sections.push({ title: '7. Data quality and verification', rows: qRows });

  // 8. Targets
  sections.push({
    title: '8. Reduction target',
    rows: [ds.target
      ? {
          question: 'Emissions reduction target',
          answer: `${fmt(ds.target.targetReductionPct, 0)}% cut from ${tonnes(ds.target.baselineCo2Kg)} by ${date(ds.target.targetDate, ds.locale)}`,
          basis: 'Set by you in Net Zero. Not externally validated',
          filled: true,
        }
      : { question: 'Emissions reduction target', answer: 'No target set', basis: 'Nothing recorded in Net Zero', filled: false }],
  });

  // 9. Questions the records cannot answer
  sections.push({
    title: '9. Questions this pack cannot answer from your records',
    rows: [
      { question: 'Emissions intensity per unit of revenue', answer: 'Revenue is not recorded, so intensity cannot be worked out.', basis: 'Not in your records', filled: false },
      { question: 'Gases other than CO2 (methane, nitrous oxide, refrigerants)', answer: 'Not measured. Every figure here is CO2.', basis: 'Not in your records', filled: false },
      { question: 'Governance, climate policy and risk', answer: 'Board oversight, policies and climate risks are yours to answer.', basis: 'Not in your records', filled: false },
    ],
  });

  return { draft, organizationName: ds.organizationName, periodLabel, generatedAt: ds.generatedAt, sections };
}

/** "Field: filled" lines, for review and tests. */
export const packFieldStatus = (pack: BuyerAnswerPack) =>
  pack.sections.flatMap((s) => s.rows.map((r) => ({ section: s.title, question: r.question, filled: r.filled })));

const fileName = (pack: BuyerAnswerPack, ext: string) =>
  `buyer-answer-pack-${pack.draft ? 'pre-verification-' : ''}${pack.generatedAt.slice(0, 10)}.${ext}`;

/* --------------------------------- PDF ---------------------------------- */

export async function generateBuyerPackPDF(pack: BuyerAnswerPack): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const width = pageWidth - margin * 2;
  const cols = [0.33, 0.39, 0.28].map((f) => f * width);
  const xs = [margin, margin + cols[0], margin + cols[0] + cols[1]];
  const lineH = 3.8;
  let y = 0;
  const newPage = () => { doc.addPage(); y = 22; };

  doc.setFillColor(24, 60, 42);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(pack.draft ? 'Pre-verification: Buyer answer pack' : 'Buyer answer pack', margin, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(pdfSafe(`${pack.organizationName} · ${pack.periodLabel}`), width), margin, 30);
  y = 52;

  doc.setTextColor(45);
  doc.setFontSize(9);
  const intro = doc.splitTextToSize(
    'The emissions questions buyers ask in CDP, customer portals and supplier questionnaires, answered from your own records in the order they usually come. Copy each answer with its basis.',
    width,
  );
  doc.text(intro, margin, y);
  y += intro.length * 4.6 + 4;

  if (pack.draft) {
    const lines = doc.splitTextToSize(DRAFT_NOTE, width - 8);
    doc.setFillColor(255, 243, 214);
    doc.rect(margin, y - 4.5, width, lines.length * 4.6 + 4, 'F');
    doc.setTextColor(110, 70, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(lines, margin + 4, y);
    doc.setFont('helvetica', 'normal');
    y += lines.length * 4.6 + 6;
  }

  const drawHead = () => {
    doc.setFillColor(24, 60, 42);
    doc.rect(margin, y, width, 7, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    ['Question', 'Your answer', 'Basis'].forEach((h, i) => doc.text(h, xs[i] + 1.5, y + 4.8));
    doc.setFont('helvetica', 'normal');
    y += 9.5;
  };

  pack.sections.forEach((section) => {
    if (y + 26 > pageHeight - 22) newPage();
    doc.setTextColor(24, 60, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(pdfSafe(section.title), margin, y);
    y += 4;
    drawHead();
    section.rows.forEach((row, idx) => {
      doc.setFontSize(8);
      // Measure each cell in the weight it is drawn in (answers are bold).
      const cells = [row.question, row.answer, row.basis].map((c, i) => {
        doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
        return doc.splitTextToSize(pdfSafe(c), cols[i] - 3) as string[];
      });
      doc.setFont('helvetica', 'normal');
      const rh = Math.max(...cells.map((l) => l.length)) * lineH + 3;
      if (y + rh > pageHeight - 22) { newPage(); drawHead(); doc.setFontSize(8); }
      if (idx % 2 === 0) {
        doc.setFillColor(246, 249, 246);
        doc.rect(margin, y - 3.2, width, rh, 'F');
      }
      cells.forEach((l, i) => {
        doc.setTextColor(i === 1 ? 25 : i === 0 ? 45 : 110);
        doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
        doc.text(l, xs[i] + 1.5, y + 0.6);
      });
      doc.setFont('helvetica', 'normal');
      y += rh;
    });
    y += 2;
    if (section.note) {
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      const lines = doc.splitTextToSize(pdfSafe(section.note), width);
      if (y + lines.length * 4 > pageHeight - 22) newPage();
      doc.text(lines, margin, y + 2);
      y += lines.length * 4 + 2;
    }
    y += 7;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(215);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    doc.setFontSize(6.5);
    doc.setTextColor(130);
    doc.text(doc.splitTextToSize(FOOTER, width - 30), margin, pageHeight - 13);
    doc.text(`${i}/${pages}`, pageWidth - margin, pageHeight - 13, { align: 'right' });
  }
  doc.save(fileName(pack, 'pdf'));
}

/* -------------------------------- Excel --------------------------------- */

// Text a spreadsheet would run as a formula is stored as plain text.
const cellSafe = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

/** Rows of the single "Answers" sheet, exported for tests. */
export function buyerPackSheet(pack: BuyerAnswerPack): Array<Array<string | number>> {
  return [
    ...(pack.draft ? [[DRAFT_NOTE]] : []),
    [pack.draft ? 'Pre-verification: Buyer answer pack' : 'Buyer answer pack'],
    ['Organisation', cellSafe(pack.organizationName)],
    ['Period', pack.periodLabel],
    ['Prepared', pack.generatedAt.slice(0, 10)],
    [],
    ['Section', 'Question', 'Your answer', 'tCO2e', 'Basis'],
    ...pack.sections.flatMap((s) => [
      ...s.rows.map((r) => [s.title, r.question, cellSafe(r.answer), r.tonnes ?? '', r.basis]),
      ...(s.note ? [[s.title, '', s.note, '', '']] : []),
    ]),
    [],
    [FOOTER],
  ];
}

export async function generateBuyerPackExcel(pack: BuyerAnswerPack): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(buyerPackSheet(pack));
  ws['!cols'] = [{ wch: 34 }, { wch: 44 }, { wch: 60 }, { wch: 10 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Answers');
  XLSX.writeFile(wb, fileName(pack, 'xlsx'));
}
