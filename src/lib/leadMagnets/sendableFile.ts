// One-page files the free tools hand out (/msme-green-loan-schemes,
// /brsr-reporting, /cbam-authorised-declarant). Each is built in the browser
// from the page's data file and what the visitor tapped or typed; nothing is
// sent anywhere. Builders return plain text so tests can read every line; the
// PDF is drawn by drawSendable, which shrinks the type until it fits one page.
/* eslint-disable @typescript-eslint/no-explicit-any -- jsPDF instance passed in from the caller or the test harness */

export type FileLine = string | { text: string; bold?: boolean; indent?: number; muted?: boolean };
export interface FileTable { head: string[]; widths: number[]; rows: string[][] }
export interface FileBlock { heading: string; lines?: FileLine[]; table?: FileTable }
export interface SendableFile {
  title: string;
  /** Who the file is addressed to. */
  to: string;
  /** The sender, only when the visitor typed it. */
  from?: string;
  date: string;
  subject?: string;
  blocks: FileBlock[];
  footer: string[];
}

/** "30 October 2026". */
export function fileDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Text the PDF's standard font can print: rupee as Rs, typographic dashes as hyphens. */
export function pdfSafe(s: string): string {
  return s
    .replace(/\u20b9\s?/g, 'Rs ')
    .replace(/[\u2010-\u2013\u2212]/g, '-')
    .replace(/\u00a0/g, ' ')
    // eslint-disable-next-line no-control-regex -- lists the printable ranges
    .replace(/[^\x09\x0a\x0d\x20-\x7e\u00a1-\u00ff\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]/g, '');
}

/** A typed company name, trimmed and kept short, or undefined. */
export function cleanName(s: string | undefined): string | undefined {
  const t = (s ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return t || undefined;
}

/** Every line of the file as plain text, in reading order (tests and previews). */
export function fileText(f: SendableFile): string[] {
  const out = [f.title, `To: ${f.to}`];
  if (f.from) out.push(`From: ${f.from}`);
  out.push(`Date: ${f.date}`);
  if (f.subject) out.push(f.subject);
  for (const b of f.blocks) {
    out.push(b.heading);
    for (const l of b.lines ?? []) out.push(typeof l === 'string' ? l : l.text);
    if (b.table) { out.push(b.table.head.join(' | ')); b.table.rows.forEach((r) => out.push(r.join(' | '))); }
  }
  return [...out, ...f.footer];
}

const W = 210, H = 297, M = 15;
const INK: [number, number, number] = [28, 33, 31];
const MUTED: [number, number, number] = [102, 108, 105];
const RULE: [number, number, number] = [214, 210, 202];

/** Lays the file out at one body size. With draw false it only measures. Returns the last y used. */
function layout(doc: any, f: SendableFile, fs: number, accent: [number, number, number], draw: boolean): number {
  const lh = fs * 0.3528 * 1.38;
  const text = (t: string | string[], x: number, y: number, opts?: any) => { if (draw) doc.text(t, x, y, opts); };
  const font = (style: 'normal' | 'bold', size: number, color: [number, number, number]) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); if (draw) doc.setTextColor(...color);
  };
  const wrap = (s: string, w: number) => doc.splitTextToSize(pdfSafe(s) || ' ', w) as string[];

  // Title band
  if (draw) { doc.setFillColor(...accent); doc.rect(0, 0, W, 22, 'F'); }
  font('bold', 17, [255, 255, 255]);
  text(pdfSafe(f.title), M, 14);

  let y = 31;
  const meta: [string, string][] = [['To', f.to], ...(f.from ? [['From', f.from] as [string, string]] : []), ['Date', f.date]];
  for (const [k, v] of meta) {
    font('bold', fs, INK); text(`${k}:`, M, y);
    font('normal', fs, INK);
    const lines = wrap(v, W - 2 * M - 16);
    text(lines, M + 16, y); y += lines.length * lh;
  }
  if (f.subject) {
    y += lh * 0.4;
    font('bold', fs, INK);
    const lines = wrap(f.subject, W - 2 * M);
    text(lines, M, y); y += lines.length * lh;
  }

  for (const b of f.blocks) {
    y += lh * 0.9;
    font('bold', fs + 2, accent); text(pdfSafe(b.heading), M, y); y += lh * 1.25;
    for (const l of b.lines ?? []) {
      const o = typeof l === 'string' ? { text: l } : l;
      // "[ ] item" prints as a tick box the reader can mark.
      const box = o.text.startsWith('[ ] ');
      const x = M + (o.indent ?? 0) * 4 + (box ? 5 : 0);
      if (box && draw) { doc.setDrawColor(...accent); doc.setLineWidth(0.3); doc.rect(x - 5, y - fs * 0.3528 * 0.78, fs * 0.3528 * 0.85, fs * 0.3528 * 0.85); }
      font(o.bold ? 'bold' : 'normal', fs, o.muted ? MUTED : INK);
      const lines = wrap(box ? o.text.slice(4) : o.text, W - M - x);
      text(lines, x, y); y += lines.length * lh;
    }
    if (b.table) {
      const { head, widths, rows } = b.table;
      const total = widths.reduce((a, c) => a + c, 0);
      const cw = widths.map((w) => (w / total) * (W - 2 * M));
      const row = (cells: string[], bold: boolean) => {
        font(bold ? 'bold' : 'normal', fs, bold ? accent : INK);
        const wrapped = cells.map((c, i) => wrap(c, cw[i] - 2.5));
        // Body rows keep two lines of room so a blank value can be written in by hand.
        const h = Math.max(bold ? 1 : 2, ...wrapped.map((w) => w.length)) * lh;
        let x = M;
        wrapped.forEach((w, i) => { if (cells[i]) text(w, x, y); x += cw[i]; });
        y += h - lh * 0.35;
        if (draw) { doc.setDrawColor(...RULE); doc.setLineWidth(0.2); doc.line(M, y, W - M, y); }
        y += lh * 1.05;
      };
      row(head, true);
      rows.forEach((r) => row(r, false));
    }
  }
  return y;
}

/** Draws the file on one A4 page: tries body sizes from 10 pt down until it fits. */
export function drawSendable(doc: any, f: SendableFile, accent: [number, number, number] = [26, 127, 85]): { fontSize: number; bottom: number } {
  const footerTop = H - 8 - (f.footer.length - 1) * 4.2;
  let fs = 10;
  for (const size of [10, 9.5, 9, 8.5, 8, 7.5, 7]) {
    fs = size;
    if (layout(doc, f, size, accent, false) <= footerTop - 6) break;
  }
  const bottom = layout(doc, f, fs, accent, true);
  doc.setDrawColor(...RULE); doc.setLineWidth(0.2); doc.line(M, footerTop - 4.5, W - M, footerTop - 4.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
  f.footer.forEach((line, i) => doc.text(pdfSafe(line), M, footerTop + i * 4.2));
  return { fontSize: fs, bottom };
}

/** Builds the PDF in the browser and saves it. */
export async function downloadSendablePdf(f: SendableFile, fileName: string, accent?: [number, number, number]): Promise<void> {
  const { default: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: f.title, creator: 'Senseible' });
  drawSendable(doc, f, accent);
  doc.save(fileName);
}

/** A cell that a spreadsheet will not run as a formula. */
export function csvCell(v: string): string {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Saves text as a file in the browser. */
export function downloadText(content: string, fileName: string, type: string): void {
  const blob = new Blob([type.startsWith('text/csv') ? '\ufeff' + content : content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
