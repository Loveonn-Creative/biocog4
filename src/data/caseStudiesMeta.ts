// Copy for the case study library (/case-studies). Stories themselves live in
// the database and appear only after the customer's consent and an editor's review.
export const CASE_STUDIES_META = {
  path: '/case-studies',
  title: 'Carbon Data Case Studies from Indian Businesses',
  description: 'Indian exporters, enterprise teams and lenders on the carbon data problem they had, what changed, and the proof they can show now.',
  h1: 'What changed for businesses like yours.',
  intro: 'Real customers, in their own words. Every number shows where it came from.',
};

/** Where each reader goes next after a story, by who the story is about. */
export const NEXT_STEP: Record<string, { label: string; to: string; line: string }> = {
  msme: { label: 'Upload one bill, free', to: '/', line: 'See your own numbers from the bills you already have.' },
  enterprise: { label: 'See supplier evidence', to: '/scope-3-supplier-evidence', line: 'Check how much of your Scope 3 is backed by documents.' },
  finance: { label: 'See climate finance', to: '/climate-finance', line: 'How bill-backed numbers help when you apply for green finance.' },
  lender: { label: 'Partner with Senseible', to: '/partners', line: 'Traceable borrower data for screening and due diligence.' },
  importer: { label: 'See supplier evidence', to: '/scope-3-supplier-evidence', line: 'Ask suppliers for bills, not questionnaires.' },
};
