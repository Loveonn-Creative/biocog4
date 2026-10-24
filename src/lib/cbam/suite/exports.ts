// Exports. The operator emissions report mirrors the sheet names and field
// labels of the Commission's "CBAM communication template for installations"
// (version 13 Dec 2024, see TEMPLATE_SOURCE). It is Senseible's structured
// export, not the Commission's file: for submission, the values go into the
// official template. Built as plain row arrays so tests can check them without
// a spreadsheet library; the xlsx library loads only when a file is written.
import { OFFICIAL_SOURCES } from '../official';
import type { Result } from './engine';
import { TEMPLATE_SOURCE } from './templateGoods';
import type { Workbook } from './types';
import { CHECKS, INTERNAL_LABEL, MATERIALITY, VERIFICATION_SOURCE, materiality } from './verify';

export type Sheet = { name: string; rows: (string | number | null)[][] };

const n = (v: number | null | undefined, d = 6) => (v === null || v === undefined || !Number.isFinite(v) ? null : Number(v.toFixed(d)));

export function verificationStatus(w: Workbook): string {
  const v = w.verification;
  if (!v.internal.signedHash) return 'Not verified';
  if (v.mode === 'external') return `Verified by external verifier: ${v.external.company || 'name not entered'}`;
  return INTERNAL_LABEL;
}

/** Who signed and what they signed: shown with the label wherever it appears. */
export function signOffDetail(w: Workbook): string {
  const iv = w.verification.internal;
  if (!iv.signedHash) return '';
  return `${[iv.reviewerName, iv.reviewerRole].filter(Boolean).join(', ')}${iv.date ? `, ${iv.date}` : ''}. Sign-off SHA-256 ${iv.signedHash}`;
}

export function reportSheets(w: Workbook, r: Result, hash: string): Sheet[] {
  const i = w.installation;
  const head = (title: string): (string | number | null)[][] => [[title], [`Structured to the ${TEMPLATE_SOURCE.title} (European Commission, version ${TEMPLATE_SOURCE.version}). Senseible export, not the Commission file.`], [`Report SHA-256: ${hash}`], []];

  const A: Sheet = { name: 'A_InstData', rows: [
    ...head('A. General information, production processes and purchased precursors'),
    ['1', 'Reporting period', 'Start:', i.periodStart, 'End:', i.periodEnd],
    [],
    ['2', 'About the installation'],
    ['i.', 'Name of the installation (optional):', i.name ?? ''],
    ['ii.', 'Name of the installation (English name):', i.nameEn],
    ['iii.', 'Street, Number:', i.street],
    ['iv.', 'Economic activity:', i.economicActivity],
    ['v.', 'Post code:', i.postcode],
    ['vii.', 'City:', i.city],
    ['viii.', 'Country:', i.country],
    ['ix.', 'UNLOCODE:', i.unlocode ?? ''],
    ['x.', 'Coordinates of the main emission source (latitude):', i.latitude ?? ''],
    ['xi.', 'Coordinates of the main emission source (longitude):', i.longitude ?? ''],
    ['xii.', 'Name of authorized representative:', i.representative ?? ''],
    ['xiii.', 'Email:', i.email ?? ''],
    ['xiv.', 'Telephone:', i.phone ?? ''],
    [],
    ['3', 'Verifier of the report'],
    ...(w.verification.mode === 'external'
      ? [['(a)', 'Company Name:', w.verification.external.company], ['(c) i.', 'Accreditation Member State:', w.verification.external.accreditationState], ['(c) ii.', 'Name of the national accreditation body:', w.verification.external.accreditationBody], ['(c) iii.', 'Registration number issued by the Accreditation body:', w.verification.external.registrationNumber]]
      : [['(a)', 'Company Name:', 'Senseible'], ['', 'Status:', w.verification.internal.signedHash ? INTERNAL_LABEL : 'Not verified'], ['', 'Signed off by:', signOffDetail(w)]]),
    [],
    ['4', 'Aggregated goods categories and relevant production processes'],
    ['ID', 'Aggregated goods category', 'Route', 'Production process'],
    ...w.processes.map((p, k) => [`P${k + 1}`, p.category, p.route ?? 'All production routes', p.name]),
    [],
    ['5', 'Purchased precursors'],
    ['ID', 'Precursor', 'CN code', 'Country code', 'Basis'],
    ...w.processes.flatMap((p) => p.precursors.filter((u) => u.kind === 'purchased')).map((u, k) => [`PP${k + 1}`, u.name ?? '', u.cn ?? '', u.country ?? '', u.basis === 'default' ? 'Default value' : 'Supplier data']),
  ] };

  const B: Sheet = { name: 'B_EmInst', rows: [
    ...head('B. Source streams'),
    ['#', 'Method', 'Source stream name', 'Activity data (AD)', 'AD Unit', 'Net calorific value (NCV)', 'NCV Unit', 'Emission factor (EF)', 'EF Unit', 'Carbon content', 'C-Content Unit', 'Oxidation factor (OxF)', 'Conversion factor (ConvF)', 'Biomass content (BioC)', 'Emissions (tCO2e)', 'Source of factors', 'Evidence'],
    ...w.streams.map((s, k) => {
      const res = r.streams.find((x) => x.id === s.id);
      const method = s.method === 'factor' ? 'Combustion (platform factor)' : s.method === 'mass_balance' ? 'Mass balance' : s.method === 'process' ? 'Process Emissions' : s.method === 'measured' ? 'Measurement' : 'Combustion';
      return [k + 1, method, s.name, n(s.ad), s.adUnit, n(s.ncv ?? null), s.ncv !== undefined ? `GJ/${s.adUnit}` : null, n(s.ef ?? null), s.method === 'combustion' ? 'tCO2/TJ' : s.method === 'process' ? `tCO2/${s.adUnit}` : null, n(s.carbonContent ?? null), s.carbonContent !== undefined ? `tC/${s.adUnit}` : null, s.oxidation ?? null, s.conversion ?? null, s.biomass ?? null, n(res?.tco2e ?? null), s.factorSource, s.evidence ?? ''];
    }),
  ] };

  const C: Sheet = { name: 'C_Emissions&Energy', rows: [
    ...head('C. Installation-level GHG emissions and data quality'),
    ['Installation level data', 'Unit', 'Total direct emissions', 'Biomass emissions', 'Total indirect emissions', 'Total emissions'],
    ['Results', 'tCO2e', n(r.totals.direct), n(r.totals.biogenic), n(r.totals.indirect), n(r.totals.total)],
    ['Not assigned to CBAM processes', 'tCO2e', n(r.totals.unallocated)],
    [],
    ['General information on data quality:', w.dataQuality.general],
    ['Justification for use of default values (if relevant):', w.dataQuality.defaultJustification],
    ['Information on quality assurance:', w.dataQuality.qualityAssurance],
  ] };

  const D: Sheet = { name: 'D_Processes', rows: [
    ...head('D. Production level and attributed emissions'),
    ...w.processes.flatMap((p, k) => {
      const pr = r.processes.find((x) => x.id === p.id);
      if (!pr) return [];
      return [
        [`Production process ${k + 1}:`, p.name, p.category],
        ['(a)', 'Total production levels:', 'Unit', 'Amounts'],
        ...p.goods.map((g) => ['', `${g.name} (CN ${g.cn})`, 't', n(g.tonnes)]),
        ['', 'Total production within installation (= denominator for SEE calculation)', 't', n(pr.activity)],
        ['(b) i.', 'Produced for the market', 't', n(pr.forMarket)],
        ['(c)', "Consumed in other 'production processes' within the installation", 't', n(pr.consumedInternally)],
        ['(g)', 'Directly attributable emissions (DirEm*)', 'tCO2e', n(pr.dirEm)],
        ['(j) i.', 'Electricity consumption', 'MWh', n(pr.electricityMwh)],
        ['(j) ii.', 'Emission factor of the electricity', 'tCO2/MWh', n(p.electricity.ef)],
        ['(j) iii.', 'Source of the emission factor', '-', p.electricity.efSource ?? ''],
        ['', 'Precursors consumed', 't', 'SEE (direct)', 'SEE (indirect)', 'Basis'],
        ...pr.precursors.map((u) => ['', u.label, n(u.quantity), n(u.seeDirect), n(u.seeIndirect), u.basis]),
        ['', 'SEE (direct)', 'tCO2e/t', n(pr.seeDirect)],
        ['', 'SEE (indirect)', 'tCO2e/t', n(pr.seeIndirect)],
        [],
      ];
    }),
  ] };

  const E: Sheet = { name: 'E_PurchPrec', rows: [
    ...head('E. Purchased precursors'),
    ['Precursor', 'CN code', 'Country', 'Consumed in process', 'Amount (t)', 'SEE (direct)', 'SEE (indirect)', 'Source', 'Justification / evidence'],
    ...w.processes.flatMap((p) => p.precursors.filter((u) => u.kind === 'purchased').map((u) => {
      const pr = r.processes.find((x) => x.id === p.id)?.precursors.find((x) => x.id === u.id);
      return [u.name ?? '', u.cn ?? '', u.country ?? '', p.name, n(u.quantity), n(pr?.seeDirect ?? null), n(pr?.seeIndirect ?? null), u.basis === 'default' ? 'Default' : 'Measured', u.basis === 'default' ? (w.dataQuality.defaultJustification || 'Supplier data not available') : (u.evidence ?? '')];
    })),
  ] };

  const SP: Sheet = { name: 'Summary_Products', rows: [
    ...head('Summary of products'),
    ['Production process from which the products arise', 'Type of aggregated good or precursor', 'CN Codes', 'Product name', 'SEE (direct)', 'SEE (indirect)', 'SEE (total)', 'Unit', 'Share of emissions by default value', 'Source for electricity EF', 'Embedded electricity (MWh/t)'],
    ...r.goods.map((g) => {
      const pr = r.processes.find((x) => x.id === g.processId)!;
      const p = w.processes.find((x) => x.id === g.processId)!;
      return [pr.name, g.category, g.cn, g.name, n(g.seeDirect), n(g.seeIndirect), n(g.seeTotal), 'tCO2e/t', n(pr.defaultShare, 4), p.electricity.efSource ?? '', n(pr.embeddedElectricityPerT)];
    }),
  ] };

  const SC: Sheet = { name: 'Summary_Communication', rows: [
    ...head('Communication with reporting declarants'),
    ['Name of the installation (English name):', i.nameEn],
    ['Country:', i.country],
    ['Reporting period start:', i.periodStart],
    ['Reporting period end:', i.periodEnd],
    ['Verification:', verificationStatus(w)],
    ['Sign-off:', signOffDetail(w)],
    [],
    ['CN Codes', 'Product name', 'SEE (direct)', 'SEE (indirect)', 'SEE (total)', 'Indirect counted for CBAM', 'SEFA (tCO2e/t)', 'Unit'],
    ...r.goods.map((g) => [g.cn, g.name, n(g.seeDirect), n(g.seeIndirect), n(g.seeTotal), g.indirectCounted ? 'Yes' : 'No', n(g.sefa), 'tCO2e/t']),
    [],
    ['Total direct emissions during reporting period:', n(r.totals.direct), 'tCO2e'],
    ['Total indirect emissions during reporting period:', n(r.totals.indirect), 'tCO2e'],
    ['Total emissions during reporting period:', n(r.totals.total), 'tCO2e'],
  ] };

  const T: Sheet = { name: 'Calculation_Trail', rows: [
    ['How every number was calculated'],
    [],
    ...r.streams.map((s) => [`Source stream ${s.name}`, s.formula, n(s.tco2e), 'tCO2e']),
    [],
    ...r.processes.flatMap((p) => [[p.name], ...p.trail.map((t) => ['', t]), []]),
    ['Sources'],
    ...OFFICIAL_SOURCES.map((s) => [s.title, s.version, s.url]),
    [TEMPLATE_SOURCE.title, TEMPLATE_SOURCE.version, TEMPLATE_SOURCE.url],
  ] };

  const issues: Sheet = { name: 'Data_Checks', rows: [['Level', 'Check', 'Where'], ...r.issues.map((x) => [x.level, x.message, x.ref])] };

  return [A, B, C, D, E, SP, SC, T, issues];
}

export function verifierSheets(w: Workbook, r: Result, hash: string): Sheet[] {
  const rows = materiality(w.verification.internal, r.processes);
  const contributors = [
    ...r.streams.map((s) => ({ what: `Source stream: ${s.name}`, t: s.tco2e })),
    ...r.processes.flatMap((p) => p.precursors.map((u) => ({ what: `Precursor in ${p.name}: ${u.label}`, t: u.embeddedDirect + u.embeddedIndirect }))),
    ...r.processes.map((p) => ({ what: `Electricity in ${p.name}`, t: p.indirEm })),
  ].sort((a, b) => b.t - a.t);
  const total = contributors.reduce((a, c) => a + Math.max(0, c.t), 0) || 1;
  let cum = 0;
  return [
    { name: 'Verifier_Pack', rows: [
      ['Verifier pack'], [`Report SHA-256: ${hash}`], [`Basis: ${VERIFICATION_SOURCE}`], [`Materiality: ${MATERIALITY * 100}% of SEE per good (CN code) and of SEFA`], [],
      ['Evidence index'], ['Item', 'Evidence / source'],
      ...w.streams.map((s) => [`Source stream: ${s.name}`, [s.factorSource, s.evidence].filter(Boolean).join(' | ')]),
      ...w.processes.flatMap((p) => p.precursors.filter((u) => u.kind === 'purchased').map((u) => [`Precursor: ${u.name ?? u.cn} (${p.name})`, u.basis === 'default' ? 'Commission default value with mark-up' : (u.evidence ?? '')])),
      ...w.processes.map((p) => [`Electricity: ${p.name}`, `${p.electricity.efSource ?? ''} ${p.electricity.evidence ?? ''}`.trim()]),
      [],
      ['Sampling: largest contributors first (cover at least 80% of emissions)'], ['Item', 'tCO2e', 'Cumulative share'],
      ...contributors.map((c) => { cum += Math.max(0, c.t); return [c.what, n(c.t, 3), n(cum / total, 4)]; }),
    ] },
    { name: 'Checklist', rows: [
      ['Area', 'Check', 'Done'],
      ...CHECKS.map((c) => [c.area, c.text, w.verification.internal.checklist[c.id] ? 'Yes' : 'No']),
      [], ['Site visit', w.verification.internal.siteVisit || 'not decided', w.verification.internal.siteVisitJustification],
      [], ['Misstatements', 'Process', 'Impact (tCO2e)', 'Resolved', 'Resolution'],
      ...w.verification.internal.misstatements.map((m) => [m.description, r.processes.find((p) => p.id === m.where)?.name ?? m.where, n(m.impactTco2e, 3), m.resolved ? 'Yes' : 'No', m.resolution]),
      [], ['Materiality per process', 'SEE', 'Open impact per t', 'Share of SEE', 'Material'],
      ...rows.map((x) => [x.name, n(x.see), n(x.impactPerT), n(x.share, 4), x.material ? 'Yes' : 'No']),
    ] },
  ];
}

/** Write sheets to an .xlsx file in the browser (xlsx loads on demand). */
export async function downloadXlsx(sheets: Sheet[], filename: string): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), s.name.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

export function downloadText(text: string, filename: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** One-page PDF summary for the importer (jsPDF loads on demand). */
export async function downloadPdf(w: Workbook, r: Result, hash: string, filename: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 48;
  const line = (t: string, size = 10, gap = 14) => { doc.setFontSize(size); for (const part of doc.splitTextToSize(t, 515)) { if (y > 790) { doc.addPage(); y = 48; } doc.text(part, 40, y); y += gap; } };
  line('CBAM embedded emissions summary', 16, 22);
  line(`${w.installation.nameEn}, ${w.installation.city} (${w.installation.country})`, 11);
  line(`Reporting period ${w.installation.periodStart} to ${w.installation.periodEnd}`);
  line(verificationStatus(w));
  if (signOffDetail(w)) line(signOffDetail(w), 8, 11);
  y += 6;
  for (const g of r.goods) {
    line(`CN ${g.cn}  ${g.name}`, 11, 16);
    line(`SEE direct ${n(g.seeDirect, 4)}  |  indirect ${n(g.seeIndirect, 4)}${g.indirectCounted ? '' : ' (not counted)'}  |  t CO2e per t`, 10);
    line(`Default value with ${Math.round(g.markup * 100)}% mark-up: ${g.defaultSee === null ? 'not listed' : n(g.defaultSee, 4)}  |  SEFA ${g.sefa === null ? 'n/a' : n(g.sefa, 4)}`, 10, 20);
  }
  line(`Totals: direct ${n(r.totals.direct, 1)} t CO2e, indirect ${n(r.totals.indirect, 1)} t CO2e`);
  y += 6;
  line(`Structured to the ${TEMPLATE_SOURCE.title} (${TEMPLATE_SOURCE.version}). Report SHA-256 ${hash}`, 8, 11);
  doc.save(filename);
}
