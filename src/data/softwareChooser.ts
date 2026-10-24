// "How to choose carbon accounting software in India": the criteria a buyer
// weighs, the questions each one turns into, and the maths for scoring vendors.
// No claim is made about any named vendor. Senseible's own answers must stay
// true to the code:
//   bills: AGENTS.md electricity-bill rule (billing details only, no consumer identity)
//   GST lines: HSN code first, keyword only when the unit agrees (_shared/intelligenceLibrary text)
//   factor per line and SHA-256 fingerprint: extract-document/index.ts, STATIC_CONTENT['/']
//   BRSR coverage is 'partial', CBAM 'covered': src/lib/reportFrameworks.ts
//   Download my data on Scale only: src/lib/accountExport.ts, SecurityDataCard
//   Data location: no residency claim is made (AI providers are not region-pinned).

export const SC_PATH = '/carbon-accounting-software-india';

export type Weight = 0 | 1 | 2 | 3;
export const WEIGHT_LABELS: Record<Weight, string> = { 0: 'Skip', 1: 'Nice', 2: 'Important', 3: 'Must' };

export interface Criterion {
  id: string;
  label: string;
  why: string;
  ask: string;
  redFlag: string;
  /** Senseible's own answer, or null where we make no claim. */
  senseible: string | null;
  /** Default weight for an Indian MSME or exporter. */
  start: Weight;
}

export const CRITERIA: Criterion[] = [
  { id: 'bills', label: 'Reads Indian electricity bills', start: 3,
    why: 'Electricity is the biggest line for most Indian factories, and bills differ by state and tariff.',
    ask: 'Show it reading one of our bills: units, kVAh billing, tariff category and the billing period.',
    redFlag: 'You type the kWh in by hand.',
    senseible: 'Reads units, kVAh, tariff category and sanctioned load from the bill, and leaves out consumer name, address and account numbers.' },
  { id: 'gst', label: 'Sorts GST invoice lines', start: 3,
    why: 'Fuel, freight and materials arrive as GST invoices. Sorting them by hand is where errors start.',
    ask: 'How is each invoice line assigned to Scope 1, 2 or 3? What happens when it cannot tell?',
    redFlag: 'Everything on an invoice lands in one category.',
    senseible: 'Classifies each line by its HSN code first, and by keyword only when the unit agrees.' },
  { id: 'factor', label: 'Shows the factor and source on every line', start: 3,
    why: 'An auditor or buyer will ask where each number came from.',
    ask: 'For any figure, can we see the activity, the factor, its source and version?',
    redFlag: 'Only totals, with a "methodology" PDF.',
    senseible: 'Every line shows the quantity, the emission factor and where the factor comes from.' },
  { id: 'evidence', label: 'Keeps tamper-evident evidence', start: 2,
    why: 'The same bill uploaded twice, or edited later, breaks a report.',
    ask: 'How do you stop a document being counted twice, and how do we prove a record has not changed?',
    redFlag: 'Duplicates are caught by eye.',
    senseible: 'Each file gets a SHA-256 fingerprint, so the same document is counted once.' },
  { id: 'verify', label: 'Has a review and verification step', start: 2,
    why: 'Unchecked extractions should not reach a report as if they were final.',
    ask: 'Which records are verified, which are not, and does the report say so?',
    redFlag: 'Everything is marked final as soon as it is uploaded.',
    senseible: 'Records are verified before they count as final, and reports mark anything still unverified.' },
  { id: 'brsr', label: 'BRSR figures for listed buyers', start: 2,
    why: 'Listed companies ask suppliers for BRSR energy and emissions data.',
    ask: 'Which BRSR fields does it fill, and which are left to us?',
    redFlag: '"Full BRSR" with no field list.',
    senseible: 'Fills the Principle 6 energy and emissions figures. Other BRSR sections are not covered, so our BRSR coverage is partial.' },
  { id: 'cbam', label: 'CBAM data for EU buyers', start: 1,
    why: 'EU importers need direct and indirect emissions per tonne from Indian producers.',
    ask: 'Can it produce per-tonne direct and indirect emissions for one product and period?',
    redFlag: 'A CBAM "estimate" built from country averages only.',
    senseible: "Maps your records to CBAM's direct, indirect and embedded emissions for exporters to share with EU buyers." },
  { id: 'scope3', label: 'Collects supplier (Scope 3) data', start: 1,
    why: 'Large buyers need your suppliers\' numbers, not just yours.',
    ask: 'How do suppliers send data, and how is a supplier figure kept separate from an estimate?',
    redFlag: 'Spend-based estimates presented as supplier data.',
    senseible: 'Turns supplier invoices into a Scope 3 trail with the source and a confidence level for each line.' },
  { id: 'price', label: 'Publishes its pricing', start: 2,
    why: 'Hidden pricing usually means a long sales cycle and surprise add-ons.',
    ask: 'What does a year cost for our volume, all in, including GST?',
    redFlag: '"Contact sales" for every plan.',
    senseible: 'Plans and prices are on the pricing page, with GST shown at checkout.' },
  { id: 'location', label: 'Says where data and AI processing sit', start: 1,
    why: 'Some buyers and lenders ask where documents are stored and which AI services read them.',
    ask: 'Where is the database? Which AI providers read our documents, and in which region?',
    redFlag: 'An answer about the database only, silent on AI processing.',
    senseible: null },
  { id: 'export', label: 'Lets you take your data out', start: 1,
    why: 'Your records should outlive any vendor.',
    ask: 'Can we export every record with its source and factor, on our plan?',
    redFlag: 'Export only on request, or only as PDF.',
    senseible: 'Download my data is available on the Scale plan.' },
];

export type Weights = Record<string, Weight>;
export const startWeights = (): Weights => Object.fromEntries(CRITERIA.map(c => [c.id, c.start])) as Weights;

/** The reader's checklist: weighted criteria, heaviest first, skipped ones left out. */
export function checklist(w: Weights): Criterion[] {
  return CRITERIA.filter(c => (w[c.id] ?? 0) > 0).sort((a, b) => (w[b.id] ?? 0) - (w[a.id] ?? 0));
}

export function checklistText(w: Weights): string {
  const items = checklist(w);
  const lines = ['Carbon accounting software: questions to ask', ''];
  items.forEach((c, i) => {
    lines.push(`${i + 1}. [${WEIGHT_LABELS[w[c.id]]}] ${c.label}`);
    lines.push(`   Ask: ${c.ask}`);
    lines.push(`   Red flag: ${c.redFlag}`);
  });
  return lines.join('\n');
}

export type Rating = 0 | 1 | 2;
export const RATING_LABELS: Record<Rating, string> = { 0: 'No', 1: 'Partly', 2: 'Yes' };

export interface VendorScore { score: number; dealbreakers: string[]; rated: number; total: number }

/**
 * Weighted score out of 100. A "Must" criterion rated No is a dealbreaker.
 * Unrated criteria count as No, and the result says how many were rated.
 */
export function scoreVendor(w: Weights, ratings: Record<string, Rating | undefined>): VendorScore {
  const items = checklist(w);
  let got = 0, max = 0, rated = 0;
  const dealbreakers: string[] = [];
  for (const c of items) {
    const weight = w[c.id];
    const r = ratings[c.id];
    if (r !== undefined) rated++;
    got += weight * (r ?? 0);
    max += weight * 2;
    if (weight === 3 && r === 0) dealbreakers.push(c.label);
  }
  return { score: max ? Math.round((got / max) * 100) : 0, dealbreakers, rated, total: items.length };
}
