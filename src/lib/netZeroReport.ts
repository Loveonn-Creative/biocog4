import jsPDF from 'jspdf';
import { pdfSafe } from '@/lib/pdfText';
import {
  SBTI_MIN_ANNUAL_PCT, formatCo2, formatParam,
  type FeasibilityResult,
} from '@/lib/netZeroEngine';

export interface NetZeroReportInput {
  sectorName: string;
  baselineFromRecords: boolean;
  timelineLabel: string;
  feasibility: FeasibilityResult;
  statuses: Record<string, string>;
  pace: { annualPct: number; meets: boolean };
  cutKg: number;
  progressPct: number;
}

/** A one-to-two page PDF of the goal, the pace check, the roadmap and progress. Every estimate is labelled. */
export function downloadNetZeroReport(r: NetZeroReportInput): void {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = 18;
  let y = 0;
  const ensure = (need: number) => { if (y + need > H - 20) { doc.addPage(); y = 20; } };
  const line = (text: string, size = 10, bold = false, color = 40) => {
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(color);
    const lines = doc.splitTextToSize(pdfSafe(text), W - m * 2);
    ensure(lines.length * size * 0.45 + 2);
    doc.text(lines, m, y);
    y += lines.length * size * 0.45 + 2;
  };

  doc.setFillColor(24, 60, 42);
  doc.rect(0, 0, W, 34, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('Net-zero progress report', m, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, m, 25);
  y = 46;

  const f = r.feasibility;
  line('Goal', 13, true, 20);
  line(`Sector: ${r.sectorName}`);
  line(`Baseline: ${formatCo2(f.baselineCo2Kg)} ${r.baselineFromRecords ? '(from your verified records)' : '(from the monthly electricity and diesel use entered)'}`);
  line(`Target: cut ${f.targetReductionPct}% (${formatCo2(f.targetReductionKg)}) to ${formatCo2(f.targetCo2Kg)}, ${r.timelineLabel}`);
  line(`Pace: ${r.pace.annualPct}% a year. ${r.pace.meets ? 'Meets' : 'Below'} the SBTi 1.5°C minimum of ${SBTI_MIN_ANNUAL_PCT}% a year (linear, Scope 1 and 2). This is a pace check, not an SBTi validation.`);
  line(`Feasibility: ${f.feasibilityNote}`);
  y += 4;

  line('Roadmap and status', 13, true, 20);
  line('Actions apply in order: each percentage is of what remains after the actions above it.', 8, false, 90);
  for (const a of f.recommendedActions) {
    const status = r.statuses[a.id] || 'pending';
    line(`[${status === 'done' ? 'x' : status === 'in-progress' ? '~' : ' '}] ${a.title} · Scope ${a.scope} · est. cut ${formatCo2(a.cutKg)}`, 10, true, 30);
    line(`${a.formula} = ${Math.round(a.fraction * 1000) / 10}% of Scope ${a.scope}`, 8, false, 80);
    for (const p of a.params) {
      const yours = p.kind === 'assumption' && p.default !== undefined && p.value !== p.default;
      const origin = yours ? `your figure; default ${formatParam({ ...p, value: p.default! })}` : p.source;
      line(`${p.kind === 'constant' ? 'Constant' : 'Assumption'}: ${p.label} = ${formatParam(p)} (${origin})`, 8, false, 90);
    }
    if (a.note) line(a.note, 8, false, 90);
    y += 1;
  }
  y += 4;

  line('Progress', 13, true, 20);
  line(`${f.recommendedActions.filter(a => r.statuses[a.id] === 'done').length} of ${f.recommendedActions.length} actions done.`);
  line(`Planned cut from actions marked done: ${formatCo2(r.cutKg)}, ${Math.round(r.progressPct)}% of the target (estimate, not yet measured).`);
  line(`All ${f.recommendedActions.length} actions together: ${formatCo2(f.totalEstimatedCutKg)} cut, against a ${formatCo2(f.targetReductionKg)} target.`);
  y += 6;

  line('How these numbers are made', 10, true, 60);
  line(`Constants come from Senseible's emission factors, IPCC 2006 defaults and the GHG Protocol. Assumptions are defaults until you enter your own figure. Actions on the same scope are applied in sequence, so nothing is counted twice. These are planning estimates; a verified reduction shows in your new bills and invoices.`, 8, false, 90);

  doc.save(`net-zero-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
