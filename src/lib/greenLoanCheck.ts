// Guest green-loan check: the questions and the readiness result. Pure, so
// it is tested directly. The result is readiness (what a credit team will
// ask for, and what the visitor already has), never eligibility, approval or
// a rate: Senseible does not approve, provide or disburse financing.

export interface Choice { id: string; label: string }

export const BUSINESS_TYPES: Choice[] = [
  { id: 'manufacturing', label: 'Manufacturing' }, { id: 'textiles', label: 'Textiles & apparel' },
  { id: 'food', label: 'Food processing' }, { id: 'chemicals', label: 'Chemicals & plastics' },
  { id: 'engineering', label: 'Engineering & auto parts' }, { id: 'metals', label: 'Metals & casting' },
  { id: 'services', label: 'Services' }, { id: 'trading', label: 'Trading' }, { id: 'other', label: 'Something else' },
];
export const FUNDING_BANDS: Choice[] = [
  { id: 'lt10l', label: 'Up to ₹10 lakh' }, { id: '10l-50l', label: '₹10 to 50 lakh' }, { id: '50l-2cr', label: '₹50 lakh to ₹2 crore' },
  { id: '2cr-10cr', label: '₹2 to 10 crore' }, { id: 'gt10cr', label: 'Above ₹10 crore' },
];
export const TURNOVER_BANDS: Choice[] = [
  { id: 'lt1cr', label: 'Under ₹1 crore' }, { id: '1cr-5cr', label: '₹1 to 5 crore' }, { id: '5cr-25cr', label: '₹5 to 25 crore' },
  { id: '25cr-100cr', label: '₹25 to 100 crore' }, { id: 'gt100cr', label: 'Above ₹100 crore' },
];
export const USES: Choice[] = [
  { id: 'solar', label: 'Rooftop solar' }, { id: 'efficiency', label: 'Efficient machinery' }, { id: 'fuel', label: 'Cleaner fuel or electric heat' },
  { id: 'ev', label: 'Electric vehicles' }, { id: 'waste', label: 'Waste or water upgrade' }, { id: 'other', label: 'Not decided yet' },
];
export const CARBON_STATUS: Choice[] = [
  { id: 'measured', label: 'Yes, measured from our invoices and bills' },
  { id: 'estimate', label: 'A rough estimate' },
  { id: 'none', label: 'Not yet' },
];
export const YES_NO_UNSURE: Choice[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'unsure', label: 'Not sure' }];

export interface CheckAnswers {
  business?: string; funding?: string; turnover?: string; use?: string; carbon?: string; gst?: string; itr?: string;
}

export interface ReadinessLine { id: string; label: string; state: 'ready' | 'next' ; detail: string }

/** What the visitor already has and what to prepare next. No scoring, no lender claims. */
export function checkReadiness(a: CheckAnswers): { lines: ReadinessLine[]; carbonNext: boolean } {
  const lines: ReadinessLine[] = [
    a.gst === 'yes'
      ? { id: 'gst', label: 'GST registration', state: 'ready', detail: 'Your GST invoices double as the activity data for your emissions record.' }
      : { id: 'gst', label: 'GST registration', state: 'next', detail: 'Keep your registration details handy; credit teams match the business through it.' },
    a.itr === 'yes'
      ? { id: 'itr', label: 'Income tax returns', state: 'ready', detail: 'Keep the last 3 years ready to upload when you apply.' }
      : { id: 'itr', label: 'Income tax returns', state: 'next', detail: 'Gather the last 3 years of returns before you apply.' },
    a.use && a.use !== 'other'
      ? { id: 'use', label: 'A clear green use of funds', state: 'ready', detail: 'A quote for the asset or upgrade makes it concrete.' }
      : { id: 'use', label: 'A clear green use of funds', state: 'next', detail: 'Pick the project first: solar, efficient machinery, cleaner fuel or EVs.' },
    a.carbon === 'measured'
      ? { id: 'carbon', label: 'Measured carbon footprint', state: 'ready', detail: 'Bring it into Senseible to attach the evidence trail to your application.' }
      : { id: 'carbon', label: 'Measured carbon footprint', state: 'next', detail: 'The evidence of environmental benefit. Senseible measures it from your own invoices and bills, starting with one.' },
  ];
  return { lines, carbonNext: a.carbon !== 'measured' };
}

/** Plain-text summary for the review inbox. */
export function summaryText(a: CheckAnswers): string {
  const name = (list: Choice[], id?: string) => list.find((c) => c.id === id)?.label ?? 'not answered';
  return [
    'Green loan check (guest)',
    `Business: ${name(BUSINESS_TYPES, a.business)}`,
    `Funding needed: ${name(FUNDING_BANDS, a.funding)}`,
    `Recent turnover: ${name(TURNOVER_BANDS, a.turnover)}`,
    `Use of funds: ${name(USES, a.use)}`,
    `Carbon footprint: ${name(CARBON_STATUS, a.carbon)}`,
    `GST registered: ${name(YES_NO_UNSURE, a.gst)}`,
    `ITR filed for recent years: ${name(YES_NO_UNSURE, a.itr)}`,
  ].join('\n');
}
