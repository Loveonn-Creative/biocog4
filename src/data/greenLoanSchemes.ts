// /msme-green-loan-schemes: an honest comparison of the green-finance routes
// an Indian MSME can use. Every fact below is taken from an Answers page in
// src/data/answerLibrary (each of which cites its primary source); nothing is
// added here. Where a page does not state a term (rate, cap, window), the
// page says "check official terms" instead of a number. Sources per route:
//   4e:        sidbi-4e-loan-terms-and-eligibility, sidbi-energy-efficiency-loan-for-msme (sidbi.in/en/green-finance)
//   gfs:       sidbi-green-finance-scheme-loan-terms (sidbi.in/en/green-finance)
//   fmap:      sidbi-fmap-green-climate-fund-programme, fmap-eligible-energy-efficiency-technologies (SIDBI ESMS-FMAP, sector ESIAs)
//   adeetie:   adeetie-interest-subvention-rate-msme, adeetie-loan-size-and-debt-share, adeetie-eligible-clusters-list,
//              adeetie-application-steps (beeindia.gov.in, BEE ADEETIE booklet)
//   gift:      mse-gift-and-mse-spice-schemes (sidbi.in incentive schemes for green loans; rates deliberately not stated)
//   machinery: sidbi-machinery-loan-replace-old-machines (sidbi.in/en/machinery-loan)
//   solar:     rooftop-solar-loan-msme-what-banks-ask, green-loan-interest-rate-lower-or-not
//   psl:       is-renewable-energy-loan-priority-sector, psl-renewable-energy-loan-limit-2025 (RBI PSL Directions 2025)
//   working:   can-working-capital-loan-be-green, green-loan-or-sll-which-suits-msme, sustainability-linked-loan-kpi-examples (LMA principles)
//   cgtmse:    cgtmse-collateral-free-loan-limit, credit-guarantee-for-msme-green-loans-india
// Evidence items: the lists above plus energy-efficiency-loan-detailed-project-report,
// green-loan-show-money-spent-on-project and green-loan-reporting-after-disbursement.
// Facts reviewed in those pages on 15 to 23 October 2026.

export const GLS_PATH = '/msme-green-loan-schemes';

export type Need = 'efficiency' | 'solar' | 'machinery' | 'working';
export const NEEDS: { id: Need; label: string }[] = [
  { id: 'efficiency', label: 'Energy efficiency' },
  { id: 'solar', label: 'Rooftop solar' },
  { id: 'machinery', label: 'Machinery upgrade' },
  { id: 'working', label: 'Working capital' },
];

export type EvidenceId =
  | 'bills' | 'production' | 'audit' | 'quotes' | 'udyam' | 'credit' | 'financials'
  | 'consents' | 'esg' | 'monitoring' | 'roof' | 'estimate' | 'proceeds' | 'savings' | 'kpi';

export interface Evidence {
  id: EvidenceId;
  label: string;
  /** What Senseible does for this item from the owner's bills; null when it does nothing. */
  senseible: string | null;
}

// Senseible lines: bills read into verified records (extract-document);
// rooftop solar estimate from 6+ months of bills (src/lib/intelligentActions.ts).
export const EVIDENCE: Evidence[] = [
  { id: 'bills', label: '12 months of electricity bills (and fuel invoices, if you burn fuel)', senseible: 'Senseible turns these into records a lender can check' },
  { id: 'savings', label: 'Saving checked each year by a BEE-empanelled auditor', senseible: 'Senseible keeps your bills from before and after the project on file for that check' },
  { id: 'estimate', label: 'Expected yearly savings, marked as an estimate', senseible: 'Senseible estimates this from 6 or more months of bills' },
  { id: 'udyam', label: 'Udyam registration', senseible: null },
  { id: 'production', label: 'Monthly production for the same months', senseible: null },
  { id: 'audit', label: 'Energy audit and project report', senseible: null },
  { id: 'quotes', label: 'Equipment quotes or list', senseible: null },
  { id: 'credit', label: 'Clean credit history, no defaults', senseible: null },
  { id: 'financials', label: 'Three years running with cash profit (4E quick route, SPEED)', senseible: null },
  { id: 'consents', label: 'Pollution consents and worker safety', senseible: null },
  { id: 'esg', label: 'Due diligence checklist and ESG rating', senseible: null },
  { id: 'monitoring', label: 'Monitoring visits after the loan', senseible: null },
  { id: 'roof', label: 'Roof papers, sanctioned load, net metering', senseible: null },
  { id: 'proceeds', label: 'Invoices showing where the money went', senseible: null },
  { id: 'kpi', label: 'A yearly report on your targets, checked by an outside verifier', senseible: null },
];

export interface Scheme {
  id: string;
  name: string;
  /** Who runs it and what kind of help it is. */
  kind: string;
  needs: Need[];
  suits: string;
  funds: string;
  asks: EvidenceId[];
  /** Shown when the source does not list documents. */
  asksNote?: string;
  /** Terms the source states, with the rate line last. Anything else: check official terms. */
  terms: string[];
  /** Where to confirm the current terms, as a full sentence. */
  check: string;
  more: { label: string; to: string };
}

export const CHECK_TERMS = 'Rate: check official terms';

export const SCHEMES: Scheme[] = [
  {
    id: 'adeetie', name: 'ADEETIE', kind: 'BEE pays part of the interest on your bank loan',
    needs: ['efficiency', 'machinery'],
    suits: 'Udyam-registered manufacturers inside one of 60 named clusters, such as Morbi ceramics, Firozabad glass or Ludhiana forging.',
    funds: 'Cuts the interest on a loan for energy-efficient technology that saves at least 10% energy, every year the saving holds.',
    asks: ['udyam', 'bills', 'production', 'audit', 'quotes', 'savings'],
    terms: ['Interest cut: 5 points for micro and small, 3 for medium, never below a 2% net rate', 'Loans of ₹10 lakh to ₹15 crore; the cut applies to debt up to 75% of project cost, so plan at least 25% yourself', 'Audit cost refunded up to ₹75,000, or ₹1 lakh for medium', 'Runs FY 2025-26 to FY 2027-28', 'Your lender sets the rate; the cut comes off it'],
    check: 'Start at adeetie.beeindia.gov.in: register before the audit and the loan.',
    more: { label: 'ADEETIE rates', to: '/answers/adeetie-interest-subvention-rate-msme' },
  },
  {
    id: '4e', name: 'SIDBI 4E (End to End Energy Efficiency)', kind: 'SIDBI direct loan',
    needs: ['efficiency', 'machinery'],
    suits: 'A unit running for a year with a detailed audit by BEE-certified auditors, or running three years with cash profit in the last two and a 20% deposit.',
    funds: 'The measures the audit recommends, end to end: equipment, installation, civil works and commissioning.',
    asks: ['bills', 'production', 'audit', 'quotes', 'udyam', 'credit', 'consents', 'financials'],
    terms: ['Detailed route (a year running, with the audit): up to 90% of project cost, minimum loan ₹10 lakh', 'Quick route (three years running, cash profit in the last two): up to 100% if you keep at least 20% as a SIDBI fixed deposit', CHECK_TERMS],
    check: 'Ask on sidbi.in or at your SIDBI branch whether 4E is open.',
    more: { label: '4E cover and eligibility', to: '/answers/sidbi-4e-loan-terms-and-eligibility' },
  },
  {
    id: 'gfs', name: 'SIDBI Green Finance Scheme', kind: 'SIDBI direct loan',
    needs: ['solar', 'efficiency'],
    suits: 'Udyam-registered MSMEs with a clean credit record. Covers more kinds of green project than 4E, and larger loans.',
    funds: 'Rooftop or ground solar for own use, energy efficiency, efficient buildings, waste and wastewater, cleaner production.',
    asks: ['udyam', 'credit', 'consents'],
    terms: ['Up to 100% of the project', 'Up to ₹20 crore for an MSME, repaid over up to 10 years', 'Rate and security: in your sanction letter, so get it before you order equipment'],
    check: 'Check on sidbi.in (Green finance) or apply on SIDBI\'s online portal.',
    more: { label: 'Green Finance Scheme terms', to: '/answers/sidbi-green-finance-scheme-loan-terms' },
  },
  {
    id: 'fmap', name: 'SIDBI FMAP (Green Climate Fund loans)', kind: 'Through SIDBI or a partner bank or NBFC',
    needs: ['efficiency', 'solar'],
    suits: 'Low and medium risk projects in the 13 sectors SIDBI covers, such as textile, chemicals, leather and steel re-rolling.',
    funds: 'Technology upgrades from a list of 64 (drives, motors, boilers, heat recovery), rooftop solar, effluent treatment and water recycling.',
    asks: ['esg', 'consents', 'monitoring'],
    terms: ['Uses Green Climate Fund money; amount and rate in the sanction'],
    check: 'Check with SIDBI or a participating bank or NBFC.',
    more: { label: 'How FMAP works', to: '/answers/sidbi-fmap-green-climate-fund-programme' },
  },
  {
    id: 'gift', name: 'MSE-GIFT', kind: 'Incentive on a green loan, listed by SIDBI',
    needs: ['efficiency', 'solar'],
    suits: 'MSMEs borrowing for clean or green technology. Its sister scheme MSE-SPICE covers recycling and reuse for micro and small units.',
    funds: 'Helps bring the loan to a concessional rate. It comes with the loan, not on its own.',
    asks: [],
    asksNote: 'Ask whether your project and size qualify, whether loans from other lenders count, and whether the window is open.',
    terms: ['Support rate and cap: check official terms'],
    check: 'Check on sidbi.in (Incentive schemes for green loans).',
    more: { label: 'MSE-GIFT and MSE-SPICE', to: '/answers/mse-gift-and-mse-spice-schemes' },
  },
  {
    id: 'solar', name: 'Bank rooftop solar loan', kind: 'Term loan from your bank',
    needs: ['solar'],
    suits: 'A unit that owns its roof, or leases it for long enough, with past bills to size the plant.',
    funds: 'The solar plant, its design and installation.',
    asks: ['bills', 'roof', 'quotes', 'estimate'],
    terms: ['Rate set mostly by your credit profile'],
    check: 'Ask at your bank branch.',
    more: { label: 'What banks ask for on solar', to: '/answers/rooftop-solar-loan-msme-what-banks-ask' },
  },
  {
    id: 'machinery', name: 'SIDBI machinery loans (EXPRESS, SPEED)', kind: 'SIDBI direct loan',
    needs: ['machinery'],
    suits: 'A unit buying new machines, to add capacity or replace old ones, in its existing line of business. Second-hand machines do not qualify.',
    funds: 'New equipment for modernisation. It does not ask whether the machine saves energy.',
    asks: ['udyam', 'credit', 'financials'],
    terms: ['EXPRESS: up to ₹3 crore and 100% of cost, repaid over up to 60 months', 'SPEED: up to ₹1 crore new to SIDBI, ₹2 crore existing, repaid over 2 to 5 years', CHECK_TERMS],
    check: 'Check on sidbi.in (Machinery loan).',
    more: { label: 'Replacing old machines', to: '/answers/sidbi-machinery-loan-replace-old-machines' },
  },
  {
    id: 'working', name: 'Green or sustainability-linked limit', kind: 'Working capital from your bank',
    needs: ['working'],
    suits: 'Green limit: a business whose work is green, like a solar installer, or a separate limit used only for green orders. Target-linked limit: any maker, if the bank offers it.',
    funds: 'Green limit: stock and costs for eligible green work. Target-linked limit: general working capital, with a rate that moves with agreed targets.',
    asks: ['proceeds', 'bills', 'kpi'],
    terms: ['Rate: agreed with your bank; there are no standard terms'],
    check: 'Ask your bank\'s credit team.',
    more: { label: 'Can working capital be green?', to: '/answers/can-working-capital-loan-be-green' },
  },
  {
    id: 'psl', name: 'Priority sector lending', kind: 'How RBI classifies the loan, not a loan',
    needs: ['efficiency', 'solar', 'machinery', 'working'],
    suits: 'Every Udyam-registered MSME. Any bank loan to it counts, whatever it funds.',
    funds: 'Nothing directly. Banks must meet priority sector targets, so they look for these loans.',
    asks: ['udyam'],
    terms: ['Does not by itself lower your rate'],
    check: 'Ask your bank which category it reports your loan under.',
    more: { label: 'Is a solar loan priority sector?', to: '/answers/is-renewable-energy-loan-priority-sector' },
  },
  {
    id: 'cgtmse', name: 'CGTMSE cover', kind: 'Guarantee the bank takes, not a loan',
    needs: ['efficiency', 'solar', 'machinery', 'working'],
    suits: 'Micro and small enterprises short of collateral. Medium enterprises are outside it.',
    funds: 'Nothing directly. It covers part of the bank\'s loss, so the bank can lend without property as security.',
    asks: ['udyam'],
    terms: ['Loans up to ₹10 crore without collateral, if the bank opts in', 'Yearly fee, usually passed on to you: get the figure in writing'],
    check: 'Check on cgtmse.in or with your bank.',
    more: { label: 'Collateral-free limits', to: '/answers/cgtmse-collateral-free-loan-limit' },
  },
];

/** Routes that fit a need first, in list order; the rest after. */
export function arrange(need: Need | null): { fit: Scheme[]; rest: Scheme[] } {
  if (!need) return { fit: SCHEMES, rest: [] };
  return { fit: SCHEMES.filter(s => s.needs.includes(need)), rest: SCHEMES.filter(s => !s.needs.includes(need)) };
}

/** How many of the given routes ask for each evidence item, most asked first. */
export function evidenceTally(schemes: Scheme[]): { item: Evidence; count: number }[] {
  return EVIDENCE
    .map(item => ({ item, count: schemes.filter(s => s.asks.includes(item.id)).length }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count || Number(Boolean(b.item.senseible)) - Number(Boolean(a.item.senseible)));
}

export const GLS_FAQS = [
  { question: 'Does Senseible give green loans?', answer: 'No. Senseible does not lend, arrange or approve loans. It turns your bills into a verified emissions record you can hand to a lender. Banks, SIDBI and scheme bodies decide.' },
  { question: 'Is a green loan cheaper than a normal loan?', answer: 'Sometimes, not always. Some schemes cut the cost, like ADEETIE\'s interest cut, but the rate still rests mostly on your repayment record, cash flow and collateral. Treat any saving as possible, not promised.' },
  { question: 'My unit is not in an ADEETIE cluster. What now?', answer: 'BEE says a second phase is planned for about 100 more clusters. Until then, look at SIDBI\'s energy efficiency loans and your state\'s efficiency schemes.' },
  { question: 'Can I combine two schemes on one project?', answer: 'Sometimes. A unit may get an audit under one programme and the loan from another, but check each scheme\'s rules before assuming they stack. Tell the bank about any subsidy, and count the energy saving once.' },
  { question: 'Do I need collateral for a green loan?', answer: 'Not always. Banks are told not to take collateral from micro and small enterprises for loans up to ₹20 lakh sanctioned from 1 April 2026, and CGTMSE cover can go up to ₹10 crore. Taking that cover is the bank\'s choice.' },
];
