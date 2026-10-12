// Enterprise lead magnet: how much of a Scope 3 Category 1 supplier base can be
// defended with evidence today, and the pace needed to close the gap before a
// reporting date. Pure arithmetic on what the visitor types; nothing assumed
// about spend distribution, so results are stated by supplier count.
//
// Method ladder (GHG Protocol Scope 3 Technical Guidance, Category 1):
// supplier-specific, hybrid, average-data and spend-based. Activity data from a
// supplier's own bills supports the hybrid method; without it, the number is
// spend x an average factor, the least specific method.

export type Pressure = 'assurance' | 'customer' | 'cbam' | 'board';

export interface EvidenceInput {
  /** Suppliers that make up about 80% of purchased-goods spend. */
  suppliers: number;
  /** Of those, how many send activity data (bills, fuel, quantities) today. */
  withData: number;
  /** Months until the figure has to be reported or defended. */
  months: number;
  pressure: Pressure;
}

export interface EvidencePlan {
  suppliers: number;
  withData: number;
  missing: number;
  /** Share of the group, by count, backed by activity data. */
  coveragePct: number;
  months: number;
  /** Suppliers to bring on per month to cover the whole group in time. */
  perMonth: number;
  /** Three equal waves over the time available, largest spend first. */
  waves: { label: string; suppliers: number; byMonth: number }[];
  /** One dot per `perDot` suppliers in the network picture (at most 60 dots). */
  perDot: number;
  dots: { evidence: number; estimate: number };
  questions: string[];
}

const int = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)));

export const PRESSURE_LABEL: Record<Pressure, string> = {
  assurance: 'Assurance or audit',
  customer: 'A customer or investor',
  cbam: 'EU buyers (CBAM)',
  board: 'Board or audit committee',
};

/** What a reviewer asks about the estimated part. Each maps to a GHG Protocol data quality indicator. */
const QUESTIONS: Record<Pressure, string[]> = {
  assurance: [
    'Which method did you use for each supplier, and why that one?',
    'Which emission factor, from which source and year, sits behind each line?',
    'Show me the document the activity number came from.',
  ],
  customer: [
    'How much of this figure is measured, and how much is estimated from spend?',
    'Which suppliers are behind your largest numbers?',
    'Will next year\'s figure be comparable with this one?',
  ],
  cbam: [
    'What are the embedded emissions per tonne of each covered good you buy?',
    'Is that actual producer data, or the EU default value?',
    'Which installation produced it, and in which period?',
  ],
  board: [
    'Which part of Scope 3 could a reviewer challenge today?',
    'What does it take, and how long, to make it defensible?',
    'Who owns supplier data, and how is it checked?',
  ],
};

export function supplierEvidencePlan(input: EvidenceInput): EvidencePlan {
  const suppliers = int(input.suppliers, 1, 20000);
  const withData = int(input.withData, 0, suppliers);
  const months = int(input.months, 1, 36);
  const missing = suppliers - withData;
  const perMonth = Math.ceil(missing / months);
  const perDot = Math.max(1, Math.ceil(suppliers / 60));
  const evidenceDots = Math.round(withData / perDot);
  const totalDots = Math.ceil(suppliers / perDot);

  // Three waves over the time available; sizes sum exactly to `missing`.
  const base = Math.floor(missing / 3), extra = missing % 3;
  const waves = ['Wave 1, largest spend', 'Wave 2', 'Wave 3'].map((label, i) => ({
    label,
    suppliers: base + (i < extra ? 1 : 0),
    byMonth: Math.max(1, Math.round((months * (i + 1)) / 3)),
  }));

  return {
    suppliers, withData, missing, months, perMonth, waves, perDot,
    coveragePct: Math.round((100 * withData) / suppliers),
    dots: { evidence: evidenceDots, estimate: Math.max(0, totalDots - evidenceDots) },
    questions: QUESTIONS[input.pressure] ?? QUESTIONS.assurance,
  };
}

/** Plain-text summary for the lead message. Counts only, no personal data. */
export function planSummary(p: EvidencePlan, pressure: Pressure): string {
  return [
    `Supplier evidence check (${PRESSURE_LABEL[pressure]}).`,
    `${p.suppliers} suppliers cover ~80% of purchased-goods spend; ${p.withData} send activity data today (${p.coveragePct}% by count).`,
    `${p.missing} to bring on in ${p.months} months: about ${p.perMonth} a month.`,
  ].join(' ');
}

/** The request an enterprise can send suppliers today. Asks for documents they already hold, not a questionnaire. */
export const SUPPLIER_REQUEST = `Subject: Energy bills for our Scope 3 reporting

Hello,

We are measuring the emissions linked to what we buy from you. Instead of a questionnaire, could you share copies of documents you already have, for the last 12 months:

1. Electricity bills for the site that makes our products
2. Fuel invoices (diesel, LPG, PNG, coal or other fuels)
3. Your total production for the same months, in the unit you use

PDFs or phone photos are fine. We use them only to calculate the emissions linked to our purchases, and we will share the result with you.

Thank you,`;
