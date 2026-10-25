// Copy gate for every PDF the platform generates. It renders each one from a
// fixed sample, captures every string written to the page and fails on
// jargon, filler, repeated sentences, broken values and characters the PDF
// font cannot print. Weak copy cannot reach a customer unnoticed: add a
// phrase to BANNED when a review finds a new one.
/* eslint-disable @typescript-eslint/no-explicit-any, no-control-regex -- test harness wraps the untyped jsPDF instance; the regex lists printable ranges */
import { describe, expect, it, mock } from 'bun:test';
import * as real from 'jspdf';

const captured: string[] = [];
// jsPDF defines text() and save() per instance, so wrap the class itself.
class CapturingPDF extends (real.jsPDF as any) {
  constructor(...args: any[]) {
    super(...args);
    const text = (this as any).text.bind(this);
    (this as any).text = (t: string | string[], ...rest: unknown[]) => {
      (Array.isArray(t) ? t : [t]).forEach((x) => captured.push(String(x)));
      return text(t, ...rest);
    };
    (this as any).save = () => this;
  }
}
mock.module('jspdf', () => ({ ...real, jsPDF: CapturingPDF, default: CapturingPDF }));
const jsPDF = CapturingPDF as any;
(globalThis as any).window ??= globalThis;

const BANNED: Array<[RegExp, string]> = [
  [/recomput/i, 'developer jargon'],
  [/same files?,? same id/i, 'developer jargon'],
  [/platform-mapped|mapped references/i, 'internal jargon'],
  [/not applicable to this platform/i, 'use "Not reported" for disclosures that apply to the company'],
  [/analyst or subject expert/i, 'vague: use "Verified by Senseible, expert-supervised"'],
  [/senseible carbon platform|\bplatform\b|platform boundary/i, 'internal word: name Senseible or the documents'],
  [/net-zero engine/i, 'internal word'],
  [/independently reviewed/i, 'overclaim: review is in-house'],
  [/\b(undefined|NaN|null|\[object Object\])\b/, 'broken value'],
  [/\b(leverage|seamless(ly)?|unlock|robust|cutting-edge|game-changer|holistic|synergy)\b/i, 'AI filler'],
  [/lorem ipsum|TODO|TBD|placeholder/i, 'placeholder text'],
  [/—/, 'em dash'],
  [/\bdataset\b|\bthis output\b|\bcounterparty\b|\bunevidenced\b|\basserted\b|\bmaps? to\b|entity-authored|company-authored|evidence set/i, 'internal word'],
  [/progress recorded|this record confirms|every figure traced/i, 'overclaim: progress is a planning estimate; coverage is partial'],
  [/transitional default/i, 'stale: the CBAM definitive period began 1 January 2026'],
  [/financed baseline|financed emissions/i, 'lender-side term (PCAF), wrong for a borrower'],
  [/\b[A-Z][a-z]+[A-Z][a-z]+[A-Za-z]*\b|\b[A-Za-z]+_[A-Za-z0-9_]+\b/, 'variable-style name shown to a reader'],
  [/Value chain activities from purchased goods/i, 'wrong Scope 3 label: name the categories on record'],
];
// WinAnsi-printable: ASCII, Latin-1 and the few extra glyphs Helvetica carries.
const UNPRINTABLE = /[^\x09\x0a\x0d\x20-\x7e¡-ÿ‘’“”•…€]/;

function check(name: string, strings: string[]) {
  const problems: string[] = [];
  const whole = strings.join('\n');
  for (const [re, why] of BANNED) { const m = whole.match(re); if (m) problems.push(`${why}: "${m[0]}"`); }
  const bad = whole.match(UNPRINTABLE); if (bad) problems.push(`unprintable character U+${bad[0].codePointAt(0)!.toString(16)}`);
  // A sentence of 40+ characters appearing in two different places says the same thing twice.
  // Identical whole strings (running footers, page numbers, table headers) are page furniture and allowed.
  const seen = new Map<string, string>();
  for (const s of new Set(strings)) {
    for (const sentence of s.split(/(?<=[.!?])\s+/)) {
      const k = sentence.trim().toLowerCase();
      if (k.length < 40) continue;
      if (seen.has(k) && seen.get(k) !== s) problems.push(`repeated: "${sentence.trim().slice(0, 70)}"`);
      seen.set(k, s);
    }
  }
  expect({ name, problems: [...new Set(problems)] }).toEqual({ name, problems: [] });
}

const ds: any = {
  draft: false, organizationName: 'Shree Ganesh Castings Pvt Ltd', gstin: '27ABCDE1234F1Z5', sector: 'Iron and steel casting', size: 'small',
  country: 'IN', locale: 'en-IN', generatedAt: '2026-10-25T10:00:00Z', periodStart: '2025-04-01', periodEnd: '2026-03-31',
  scope1Kg: 11260, scope2Kg: 28400, scope3Kg: 4200, totalKg: 43860,
  categories: [
    { category: 'Diesel (DG set)', scope: 1, co2Kg: 11260, activityData: 4200, activityUnit: 'litres', emissionFactor: 2.68, dataQuality: 'invoice', verified: true },
    { category: 'Grid electricity', scope: 2, co2Kg: 28400, activityData: 40000, activityUnit: 'kWh', emissionFactor: 0.71, dataQuality: 'bill', verified: true },
    { category: 'Road freight', scope: 3, co2Kg: 4200, activityData: 51000, activityUnit: 'tkm', emissionFactor: 0.0823, dataQuality: 'invoice', verified: true },
  ],
  evidence: [
    { emissionId: 'e1', documentHash: 'a1b2c3d4e5f6a7b8', invoiceNumber: 'INV-1042', vendor: 'Indian Oil', invoiceDate: '2025-06-12', co2Kg: 11260, scope: 1, category: 'Diesel (DG set)', factorSource: 'IPCC 2006', verificationStatus: 'verified', activityData: 4200, activityUnit: 'litres', emissionFactor: 2.68 },
    { emissionId: 'e2', documentHash: 'f0e1d2c3b4a59687', invoiceNumber: 'MSEDCL-07', vendor: 'MSEDCL', invoiceDate: '2025-07-31', co2Kg: 28400, scope: 2, category: 'Grid electricity', factorSource: 'CEA v21', verificationStatus: 'verified', activityData: 40000, activityUnit: 'kWh', emissionFactor: 0.71 },
    { emissionId: 'e3', documentHash: '0a9b8c7d6e5f4a3b', invoiceNumber: 'LR-5521', vendor: 'VRL Logistics', invoiceDate: '2025-08-20', co2Kg: 4200, scope: 3, category: 'Road freight', factorSource: 'GLEC', verificationStatus: 'verified', activityData: 51000, activityUnit: 'tkm', emissionFactor: 0.0823 },
  ],
  availability: { scope1: true, scope2: true, scope3: true, intensity: false, targets: true, governance: false, risks: false, energy: true, productLevel: false },
  methodologyVersion: 'v3.2', factorSources: ['IPCC 2006 Guidelines', 'CEA CO2 Baseline Database v21'],
  verification: { status: 'verified', score: 0.92, greenwashingRisk: 'low', cctsEligible: null, cbamCompliant: null, verifiedAt: '2026-09-30T10:00:00Z' },
  target: { baselineCo2Kg: 43860, targetReductionPct: 30, targetDate: '2031-03-31', progressPct: 12 },
};

describe('copy gate: framework reports', async () => {
  const { generateFrameworkPDF } = await import('../src/lib/frameworkReports');
  const { FRAMEWORKS } = await import('../src/lib/reportFrameworks');
  for (const id of Object.keys(FRAMEWORKS)) {
    it(id, () => { captured.length = 0; generateFrameworkPDF(id, ds); check(id, [...captured]); });
  }
});

describe('copy gate: net-zero report', () => {
  it('net zero', async () => {
    const { downloadNetZeroReport } = await import('../src/lib/netZeroReport');
    const { calculateFeasibility, sbtiPace, estimatedCutKg } = await import('../src/lib/netZeroEngine');
    const f = calculateFeasibility({ scope1Kg: 11260, scope2Kg: 28400, scope3Kg: 4200, totalKg: 43860 }, 30, 36, 'steel');
    const statuses = Object.fromEntries(f.recommendedActions.slice(0, 1).map((a: any) => [a.id, 'done']));
    const cutKg = estimatedCutKg(f.baselineCo2Kg, f.recommendedActions, statuses);
    captured.length = 0;
    downloadNetZeroReport({ sectorName: 'Manufacturing', baselineFromRecords: true, timelineLabel: 'by March 2029', feasibility: f, statuses,
      pace: sbtiPace(30, 36), cutKg, progressPct: (100 * cutKg) / f.targetReductionKg });
    check('net zero', [...captured]);
  });
});

describe('copy gate: verified emissions record', () => {
  it('certificate', async () => {
    const { drawCertificate } = await import('../src/lib/certificatePdf');
    captured.length = 0;
    const doc = new jsPDF({ orientation: 'landscape' });
    const r = drawCertificate(doc, {
      organizationName: 'Shree Ganesh Castings Pvt Ltd', gstin: '27ABCDE1234F1Z5', sector: 'Iron and steel casting', verifiedDocCount: 14, totalDocCount: 20, recordedKg: 53500,
      fingerprint: 'a'.repeat(64), totalKg: 43860, scope1Kg: 11260, scope2Kg: 28400, scope3Kg: 4200, periodStart: '2025-04-01', periodEnd: '2026-03-31',
      qualityGrade: 'A', greenScore: 12, badges: ['GHG Protocol: 4 of 5 disclosures'], reviewedAt: '2026-09-30T10:00:00Z', issuedAt: '2026-10-25T10:00:00Z',
      methodologyVersion: 'v3.2', formatDate: (s: string) => s.slice(0, 10),
    });
    check('certificate', [...captured]);
    expect(r.contentBottom).toBeLessThan(r.footerTop - 4);
  });
});
