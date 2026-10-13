import jsPDF from 'jspdf';
import {
  SBTI_MIN_ANNUAL_PCT, SCOPE_SHARE, formatCo2, formatInr,
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
    const lines = doc.splitTextToSize(text, W - m * 2);
    ensure(lines.length * size * 0.45 + 2);
    doc.text(lines, m, y);
    y += lines.length * size * 0.45 + 2;
  };

  doc.setFillColor(24, 60, 42);
  doc.rect(0, 0, W, 34, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('Net-zero progress report', m, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Generated ${new Date().toISOString().slice(0, 10)} · Senseible net-zero engine`, m, 25);
  y = 46;

  const f = r.feasibility;
  line('Goal', 13, true, 20);
  line(`Sector: ${r.sectorName}`);
  line(`Baseline: ${formatCo2(f.baselineCo2Kg)} ${r.baselineFromRecords ? '(from your verified records)' : '(typical for the sector; upload bills for your own)'}`);
  line(`Target: cut ${f.targetReductionPct}% (${formatCo2(f.targetReductionKg)}) to ${formatCo2(f.targetCo2Kg)}, ${r.timelineLabel}`);
  line(`Pace: ${r.pace.annualPct}% a year. ${r.pace.meets ? 'Meets' : 'Below'} the SBTi 1.5°C minimum of ${SBTI_MIN_ANNUAL_PCT}% a year (linear, Scope 1 and 2). This is a pace check, not an SBTi validation.`);
  line(`Feasibility: ${f.feasibilityNote}`);
  y += 4;

  line('Roadmap and status', 13, true, 20);
  for (const a of f.recommendedActions) {
    const cut = f.baselineCo2Kg * (a.reductionPct / 100) * SCOPE_SHARE[a.scope as 1 | 2 | 3];
    const status = r.statuses[a.id] || 'pending';
    line(`[${status === 'done' ? 'x' : status === 'in-progress' ? '~' : ' '}] ${a.title} · Scope ${a.scope} · est. cut ${formatCo2(cut)} · est. cost ${formatInr(a.estimatedCostInr)}${a.paybackMonths > 0 ? ` · payback ${a.paybackMonths} months` : ''}`);
  }
  y += 4;

  line('Progress', 13, true, 20);
  line(`${f.recommendedActions.filter(a => r.statuses[a.id] === 'done').length} of ${f.recommendedActions.length} actions done.`);
  line(`Estimated cut so far: ${formatCo2(r.cutKg)}, ${Math.round(r.progressPct)}% of the target.`);
  line(`Estimated investment for the roadmap: ${formatInr(f.totalEstimatedCost)}.`);
  y += 6;

  line('How these numbers are made', 10, true, 60);
  line(`Estimates use the engine's typical reduction per action and assumed scope shares (Scope 1 ${SCOPE_SHARE[1] * 100}%, Scope 2 ${SCOPE_SHARE[2] * 100}%, Scope 3 ${SCOPE_SHARE[3] * 100}% of the baseline). They are planning estimates, not verified reductions. A verified reduction shows up in new bills and invoices after a change is made.`, 8, false, 90);

  doc.save(`net-zero-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
