// The loan file from /msme-green-loan-schemes: one page an MSME owner hands
// the bank's credit officer. Every scheme, term and paper comes from
// src/data/greenLoanSchemes.ts; nothing is typed here but the layout words.
// The data file speaks to the owner ("your bank"), so the file turns those
// words toward the bank (toBank) without touching a figure.
import {
  EVIDENCE, NEEDS, SCHEMES, SIZES, asksCluster, sieve,
  type Cluster, type EvidenceId, type Need, type Scheme, type Size,
} from '@/data/greenLoanSchemes';
import { cleanName, fileDate, type FileLine, type SendableFile } from './sendableFile';

export interface LoanFileInput { need: Need; size: Size | null; cluster: Cluster | null; company?: string; date?: Date }

/** Bills that set the baseline and show the saving. */
const ENERGY: EvidenceId[] = ['bills', 'estimate'];
/** What a lender asks for after the loan, not papers to attach now. */
const AFTER: EvidenceId[] = ['savings', 'proceeds', 'kpi', 'monitoring'];
const short = (s: Scheme) => s.name.replace(/\s*\(.*\)$/, '');
/** Evidence labels without their trailing aside, e.g. "(4E, SPEED)", since the file names the schemes itself. */
// Named for the bank: the document itself, not a condition, and which months.
const PAPER_FOR_BANK: Partial<Record<EvidenceId, string>> = {
  production: 'Monthly production for the same 12 months as the bills',
  financials: 'Cash profit in each of the last three years',
  proceeds: 'Invoices showing how the loan was used',
  kpi: 'A yearly report on the loan\'s agreed targets, checked by an outside verifier',
  monitoring: 'Lender monitoring visits',
  credit: 'Credit report showing no defaults',
  consents: 'Pollution control board consents and worker safety records',
  roof: 'Roof ownership or lease papers, sanctioned load, net metering approval',
};
const label = (id: EvidenceId) => PAPER_FOR_BANK[id] ?? toBank(EVIDENCE.find((e) => e.id === id)!.label.replace(/\s*\([^)]*\)$/, ''));

/** Owner-facing wording from the data file, read by the bank. Figures pass through unchanged. */
export function toBank(s: string): string {
  return s
    .replace(/^Ask whether your project and size qualify/, 'To confirm: whether the project and enterprise size qualify')
    .replace(/, so plan at least 25% yourself/, '; the borrower funds at least 25%')
    .replace(/if you keep 25% as a fixed deposit/, 'with 25% kept as a fixed deposit')
    .replace(/with your own share/, 'with the borrower\'s own share')
    .replace(/: in your sanction letter, so get it before you order equipment/, ': set in the sanction letter')
    .replace(/, usually passed on to you: get the figure in writing/, ', usually passed on to the borrower')
    .replace(/Your lender sets the rate/, 'The bank sets the rate')
    .replace(/your credit profile/g, 'the borrower\'s credit profile')
    .replace(/\byour bank loan\b/g, 'the bank loan')
    .replace(/\byour bank\b/g, 'the bank')
    .replace(/\byour rate\b/g, 'the rate')
    .replace(/\byour targets\b/g, 'the borrower\'s targets')
    .replace(/check official terms/g, 'not published; confirm at sanction');
}

export function fittingSchemes(need: Need, size: Size | null, cluster: Cluster | null): Scheme[] {
  const c = asksCluster(need) ? cluster : null;
  return SCHEMES.filter((s) => !sieve(s, need, size, c));
}

export function greenLoanFile({ need, size, cluster, company, date }: LoanFileInput): SendableFile {
  const fit = fittingSchemes(need, size, cluster);
  const c = asksCluster(need) ? cluster : null;
  const purpose = NEEDS.find((n) => n.id === need)!.label;
  const sizeLabel = SIZES.find((x) => x.id === size)?.label;
  const by = (id: EvidenceId) => fit.filter((s) => s.asks.includes(id)).map(short);
  const item = (id: EvidenceId, box: boolean) => {
    const names = by(id);
    return names.length ? `${box ? '[ ] ' : ''}${label(id)} (${names.join(', ')})` : null;
  };
  const list = (ids: EvidenceId[], box: boolean) => ids.map((id) => item(id, box)).filter(Boolean) as string[];

  const schemes: FileLine[] = fit.flatMap((s) => [
    { text: s.name, bold: true },
    { text: toBank(s.kind), indent: 1, muted: true },
    ...(s.id === 'adeetie' && c === 'unsure' ? [{ text: 'Applies only if the unit is in one of BEE\'s 60 named clusters.', indent: 1, muted: true }] : []),
    ...s.terms.map((t) => ({ text: `• ${toBank(t)}`, indent: 1 })),
    ...(s.asksNote ? [{ text: toBank(s.asksNote), indent: 1, muted: true }] : []),
  ]);

  const papers = list(EVIDENCE.map((e) => e.id).filter((id) => !ENERGY.includes(id) && !AFTER.includes(id)), true);
  const energy = list(ENERGY, true);
  const after = list(AFTER, false);
  const billsBy = by('bills');

  return {
    title: 'Green loan file',
    to: 'The credit officer',
    from: cleanName(company),
    date: fileDate(date),
    subject: [
      `Loan for: ${purpose.toLowerCase()}`,
      sizeLabel && `Enterprise: ${sizeLabel.toLowerCase()}`,
      c === 'yes' && 'In one of BEE\'s 60 named clusters',
      c === 'unsure' && 'BEE cluster: to be confirmed',
    ].filter(Boolean).join('. ') + '.',
    blocks: [
      { heading: `Schemes and cover for this project (${fit.length})`, lines: schemes },
      {
        heading: 'Energy bills: baseline and saving',
        lines: [
          ...(energy.length ? energy : [`[ ] ${label('bills')}`]),
          ...(need === 'solar' ? [] : [`[ ] Fuel invoices for the same 12 months, if the unit burns fuel${billsBy.length ? ` (${billsBy.join(', ')})` : ''}`]),
          { text: 'Bills from before the project set the baseline; bills after it show the saving.', muted: true },
          { text: 'Senseible can turn these bills into figures verified against each bill: senseible.earth/green-loan-check', muted: true },
        ],
      },
      { heading: 'Papers to attach', lines: papers },
      ...(after.length ? [{ heading: 'After the loan', lines: after }] : []),
    ],
    footer: [
      'Senseible does not lend, arrange or approve loans. Banks, SIDBI and scheme bodies decide.',
      'Terms as each scheme publishes them; confirm current terms before sanction. senseible.earth/msme-green-loan-schemes',
    ],
  };
}

export const loanFileName = (d: Date = new Date()) => `green-loan-file-${d.toISOString().slice(0, 10)}.pdf`;
