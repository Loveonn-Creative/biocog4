// Copy for the case study library (/case-studies). Stories themselves live in
// the database and appear only after the customer's consent and an editor's review.
export const CASE_STUDIES_META = {
  path: '/case-studies',
  title: 'Carbon Data Case Studies from Indian Businesses',
  description: 'Real stories from MSME exporters, enterprise teams, finance leaders and lenders: the carbon data problem they had, what changed, and the evidence they can now show.',
  h1: 'What clear carbon data changed, in customers’ own words.',
  intro: 'Real problems, the friction removed, the evidence created and what it opened up. Every story is approved by the customer, and every number says how it is known.',
};

/** Where each reader goes next after a story, by who the story is about. */
export const NEXT_STEP: Record<string, { label: string; to: string; line: string }> = {
  msme: { label: 'Upload one bill, free', to: '/', line: 'See your own numbers from the bills you already have.' },
  enterprise: { label: 'See supplier evidence', to: '/scope-3-supplier-evidence', line: 'Check how much of your Scope 3 is backed by documents.' },
  finance: { label: 'See climate finance', to: '/climate-finance', line: 'What credible operational data means for financing conversations.' },
  lender: { label: 'Partner with Senseible', to: '/partners', line: 'Traceable borrower data for screening and due diligence.' },
  importer: { label: 'See supplier evidence', to: '/scope-3-supplier-evidence', line: 'Ask suppliers for bills, not questionnaires.' },
};
