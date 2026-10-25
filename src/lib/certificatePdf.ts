// The "Verified Emissions Record" (Reports page; title per owner, 25 Oct 2026). Layout flows top to
// bottom from measured text instead of fixed heights, so long names, many
// standards or a missing GSTIN never overlap the footer. Every line states
// something the records show:
// - totals are verified rows only (the caller passes the verified summary);
// - the record ID and fingerprint come from the verified source files, so
//   anyone holding the same files can recompute them (no random IDs);
// - "Verified by Senseible, expert-supervised" (owner wording, 25 Oct 2026):
//   Senseible's infrastructure verifies, under expert supervision. The date is
//   when the verification was recorded; there is no signature line.
import { jsPDF } from 'jspdf';

export interface CertificateInput {
  organizationName: string;
  gstin: string | null;
  sector: string | null;
  /** Distinct verified source files behind the totals. */
  verifiedDocCount: number;
  /** All distinct source files recorded, verified or not (coverage line). */
  totalDocCount: number;
  /** All recorded emissions, verified or not (coverage line). */
  recordedKg: number;
  /** SHA-256 over the sorted hashes of those files (hex), or null. */
  fingerprint: string | null;
  totalKg: number;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  periodStart: string | null;
  periodEnd: string | null;
  qualityGrade: string | null;
  greenScore: number | null;
  /** Standards the records evidence, with the share evidenced. */
  badges: string[];
  /** When the verification behind this record was saved. */
  reviewedAt: string | null;
  issuedAt: string;
  methodologyVersion: string;
  formatDate: (iso: string) => string;
}

const GREEN: [number, number, number] = [34, 82, 54];

/** SEN-XXXX-XXXX-XXXX from the evidence fingerprint: stable for the same files. */
export function certificateRecordId(fingerprint: string | null): string | null {
  if (!fingerprint) return null;
  const h = fingerprint.slice(0, 12).toUpperCase();
  return `SEN-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}`;
}

export function formatTonnes(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t CO2e` : `${kg.toFixed(1)} kg CO2e`;
}

/** Draws the record on a landscape A4 document. Returns the layout bounds (mm) for tests. */
export function drawCertificate(doc: jsPDF, c: CertificateInput): { contentBottom: number; footerTop: number } {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const cx = W / 2;
  const inner = W - 60; // usable width inside the border
  const footerTop = H - 44;

  // Border
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(2.5);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, W - 28, H - 28);

  // Title
  let y = 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...GREEN);
  doc.text('VERIFIED EMISSIONS RECORD', cx, y, { align: 'center' });
  y += 6;
  doc.setLineWidth(0.8);
  doc.line(cx - 70, y, cx + 70, y);

  // Measure the body on a scratch page, then centre it between the title rule and the footer.
  const titleRule = y;
  const height = drawBody(new jsPDF({ orientation: 'landscape' }), c, 0, cx, inner);
  const slack = Math.max(0, footerTop - 6 - titleRule - height);
  const contentBottom = drawBody(doc, c, titleRule + Math.min(slack * 0.4, 10), cx, inner);

  return drawFooter(doc, c, { contentBottom, footerTop, W, H, cx });
}

/** Name, statement, figures and standards, from y0 down. Returns the bottom edge. */
function drawBody(doc: jsPDF, c: CertificateInput, y0: number, cx: number, inner: number): number {
  let y = y0;
  // Who
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(70);
  doc.text('This record shows that', cx, y, { align: 'center' });

  const name = c.organizationName.charAt(0).toUpperCase() + c.organizationName.slice(1);
  let nameSize = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(nameSize);
  let nameLines: string[] = doc.splitTextToSize(name, inner - 40);
  while (nameLines.length > 2 && nameSize > 14) { nameSize -= 2; doc.setFontSize(nameSize); nameLines = doc.splitTextToSize(name, inner - 40); }
  nameLines = nameLines.slice(0, 2);
  y += 10;
  doc.setTextColor(15);
  doc.text(nameLines, cx, y, { align: 'center' });
  y += (nameLines.length - 1) * nameSize * 0.42;

  const idLine = [c.gstin ? `GSTIN ${c.gstin}` : null, c.sector].filter(Boolean).join('  |  ');
  if (idLine) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(idLine, cx, y, { align: 'center' });
  }

  // What
  const period = c.periodStart && c.periodEnd
    ? ` for ${c.formatDate(c.periodStart)} to ${c.formatDate(c.periodEnd)}`
    : '';
  // Who verified is stated once, in the footer; the body says what was measured and how it is backed.
  const body = `has measured its greenhouse gas emissions${period}, each verified figure traced to its source document.`;
  doc.setFontSize(11);
  doc.setTextColor(60);
  const bodyLines: string[] = doc.splitTextToSize(body, inner - 10);
  y += 9;
  doc.text(bodyLines, cx, y, { align: 'center' });
  y += (bodyLines.length - 1) * 5;

  // Figures: four equal columns
  y += 8;
  const boxW = Math.min(inner, 236);
  const boxX = cx - boxW / 2;
  const boxH = 30;
  doc.setFillColor(247, 251, 248);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, y, boxW, boxH, 3, 3, 'FD');
  const col = boxW / 4;
  doc.setDrawColor(214, 228, 218);
  doc.setLineWidth(0.25);
  for (let i = 1; i < 4; i++) doc.line(boxX + col * i, y + 6, boxX + col * i, y + boxH - 6);
  const cell = (i: number, label: string, value: string, note?: string) => {
    const x = boxX + col * (i + 0.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100);
    doc.text(label.toUpperCase(), x, y + 8, { align: 'center' });
    const muted = value === 'Not assessed';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(muted ? 11 : 15); doc.setTextColor(...(muted ? [120, 120, 120] as [number, number, number] : GREEN));
    doc.text(value, x, y + 18, { align: 'center' });
    if (note) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(115); doc.text(note, x, y + 24.5, { align: 'center' }); }
  };
  const kgShort = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${Math.round(kg)} kg`);
  cell(0, 'Verified emissions', formatTonnes(c.totalKg), `S1 ${kgShort(c.scope1Kg)}  S2 ${kgShort(c.scope2Kg)}  S3 ${kgShort(c.scope3Kg)}`);
  // Coverage: how much of what the company recorded this record verifies, so it never reads as the whole footprint.
  const sharePct = c.recordedKg > 0 ? Math.round((100 * c.totalKg) / c.recordedKg) : 100;
  cell(1, 'Coverage', `${c.verifiedDocCount} of ${Math.max(c.totalDocCount, c.verifiedDocCount)}`, `documents, ${Math.min(sharePct, 100)}% of recorded emissions`);
  // Grade: share of records passing the evidence checks (verify-carbon): A 90%+ with low greenwashing risk, B 75%+, C 50%+, D below.
  const GRADE_NOTE: Record<string, string> = { A: '90%+ of records passed checks', B: '75%+ of records passed checks', C: '50%+ of records passed checks', D: 'under 50% passed checks' };
  cell(2, 'Quality grade', c.qualityGrade || 'Not assessed', c.qualityGrade ? GRADE_NOTE[c.qualityGrade] : undefined);
  // Green score (_shared/greenScore.ts): share of energy-related emissions already avoided by clean sources.
  cell(3, 'Green score', c.greenScore === null ? 'Not assessed' : `${c.greenScore}/100`, c.greenScore === null ? undefined : `${c.greenScore}% of energy emissions avoided by clean power`);
  y += boxH;

  // Standards evidenced: wrap into rows that fit inside the box width
  if (c.badges.length) {
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const padX = 4, h = 7, gap = 3;
    const widths = c.badges.map((b) => doc.getTextWidth(b) + padX * 2);
    const rows: number[][] = [];
    let row: number[] = [], rowW = 0;
    widths.forEach((w, i) => {
      if (row.length && rowW + gap + w > boxW) { rows.push(row); row = []; rowW = 0; }
      rowW += (row.length ? gap : 0) + w; row.push(i);
    });
    if (row.length) rows.push(row);
    rows.forEach((r, ri) => {
      const total = r.reduce((s, i) => s + widths[i], 0) + gap * (r.length - 1);
      let x = cx - total / 2;
      const by = y + ri * (h + 2.5);
      r.forEach((i) => {
        doc.setFillColor(...GREEN);
        doc.roundedRect(x, by, widths[i], h, 1.8, 1.8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(c.badges[i], x + widths[i] / 2, by + 4.7, { align: 'center' });
        x += widths[i] + gap;
      });
    });
    y += rows.length * h + (rows.length - 1) * 2.5;
  }
  return y;
}

function drawFooter(doc: jsPDF, c: CertificateInput, { contentBottom, footerTop, W, H, cx }: { contentBottom: number; footerTop: number; W: number; H: number; cx: number }) {

  // Footer: who reviewed, when, and how to check it
  doc.setDrawColor(214, 228, 218);
  doc.setLineWidth(0.25);
  doc.line(24, footerTop, W - 24, footerTop);
  const fy = footerTop + 7;
  const label = (x: number, align: 'left' | 'center' | 'right', title: string, lines: string[]) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...GREEN);
    doc.text(title, x, fy, { align });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70);
    lines.forEach((l, i) => doc.text(l, x, fy + 5 + i * 4.2, { align }));
  };
  label(24, 'left', 'ISSUED', [c.formatDate(c.issuedAt), `Methodology ${c.methodologyVersion}`]);
  label(cx, 'center', 'VERIFIED BY SENSEIBLE', ['Expert-supervised', c.reviewedAt ? `Verified ${c.formatDate(c.reviewedAt)}` : 'Verification date not recorded']);
  const recordId = certificateRecordId(c.fingerprint);
  label(W - 24, 'right', 'RECORD ID', [recordId ?? 'Not available']);

  if (c.fingerprint) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2); doc.setTextColor(120);
    const of = c.verifiedDocCount === 1 ? '1 source file' : `${c.verifiedDocCount} source files`;
    doc.text(`Document fingerprint (SHA-256 of ${of}): ${c.fingerprint}`, cx, H - 21, { align: 'center' });
  }
  doc.setFontSize(6.2); doc.setTextColor(130);
  doc.text('Decision-support record, not a regulatory certification or statutory filing.', cx, H - 17, { align: 'center' });

  return { contentBottom, footerTop };
}
