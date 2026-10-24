// Carbon credits in India: the routes a reader can take, the units people mix
// up, and BEE's own offset fees. Every fact below comes from a page already in
// the Answers library, which carries the primary source:
//   BEE Detailed Procedure for Offset Mechanism v1.0, Annexure 2 (fees),
//     https://beeindia.gov.in/WriteReadData/RTF1984/RTF-PDF-dd26de202535b101_1776055896.pdf
//     -> /answers/ccts-offset-project-fees, ccts-offset-crediting-period-length,
//        ccts-offset-bundling-small-projects, ccts-offset-project-registration-steps
//   GHG intensity target rules G.S.R. 739(E) (8 Oct 2025) and G.S.R. 25(E) (13 Jan 2026),
//     draft G.S.R. 517(E) (26 Jun 2026) -> /answers/how-many-plants-have-ccts-targets,
//     ccts-carbon-credit-certificates-formula
//   BEE approved sectors memorandum (Sep 2024) and methodology list (7 Jul 2026)
//     -> /answers/ccts-offset-approved-sectors-phase-1-2
//   BEE draft trading procedure (Oct 2026) -> /answers/ccts-certificate-trading-power-exchange
//   PAT and RECs -> /answers/pat-escerts-after-ccts, rec-vs-carbon-credit-difference
// No credit price is stated anywhere: trading had not discovered a price on
// 23 October 2026 (/answers/ccts-offset-project-worth-it-small-factory).

export const CCI_PATH = '/carbon-credits-india';

export const answer = (slug: string) => `/answers/${slug}`;

export type RouteId = 'named' | 'factory' | 'developer' | 'buyer';

export interface Situation {
  id: RouteId;
  who: string;
  /** The follow-up question for this situation, and its choices. */
  ask: string;
  choices: { id: string; label: string }[];
}

export const SITUATIONS: Situation[] = [
  {
    id: 'named', who: 'My plant has a CCTS target',
    ask: 'How is the plant tracking against its target?',
    choices: [
      { id: 'beat', label: 'Likely to beat it' },
      { id: 'miss', label: 'Likely to miss it' },
      { id: 'unsure', label: 'We have not measured yet' },
    ],
  },
  {
    id: 'factory', who: 'I run a factory or MSME with no target',
    ask: 'What changed, or will change, at the factory?',
    choices: [
      { id: 'solar', label: 'Rooftop or grid-connected solar' },
      { id: 'biogas', label: 'Biogas, biomass or waste to energy' },
      { id: 'efficiency', label: 'Efficiency: motors, kilns, boilers' },
      { id: 'nothing', label: 'Nothing yet, I want to know first' },
    ],
  },
  {
    id: 'developer', who: 'I want to start a carbon credit business',
    ask: 'Which part of the business?',
    choices: [
      { id: 'projects', label: 'Develop or aggregate projects' },
      { id: 'verify', label: 'Validate and verify projects' },
      { id: 'trade', label: 'Trade or broker credits' },
    ],
  },
  {
    id: 'buyer', who: 'I want to buy credits or offset',
    ask: 'Why do you want them?',
    choices: [
      { id: 'compliance', label: 'To meet a CCTS target' },
      { id: 'claim', label: 'For a voluntary climate claim' },
      { id: 'scope2', label: 'To report greener electricity' },
    ],
  },
];

export interface RouteCard {
  market: string;
  verdict: string;
  steps: string[];
  watch: string;
  links: { label: string; to: string }[];
}

/** The answer for a situation and choice. Written from the Answers pages listed above. */
export const ROUTES: Record<string, RouteCard> = {
  'named:beat': {
    market: 'CCTS compliance mechanism',
    verdict: 'You earn carbon credit certificates: target intensity minus achieved intensity, times your equivalent output for the year. One certificate is one tonne of CO2e.',
    steps: ['Keep monitoring to the plan BEE approved.', 'File Form A, verified by an accredited agency, within four months of the compliance year.', 'Certificates land in the Grid-India registry after BEE and NSC-ICM review.', 'Sell them on a power exchange, or bank them for a later year.'],
    watch: 'Trading runs through power exchanges in closed auctions. Bilateral deals are not allowed, even inside a group.',
    links: [{ label: 'How certificates are counted', to: answer('ccts-carbon-credit-certificates-formula') }, { label: 'Banking certificates', to: answer('ccts-banking-carbon-credit-certificates') }, { label: 'How trading works', to: answer('ccts-certificate-trading-power-exchange') }],
  },
  'named:miss': {
    market: 'CCTS compliance mechanism',
    verdict: 'You buy certificates for the gap: achieved intensity minus target intensity, times output. A shortfall left uncovered draws environmental compensation of twice the average traded price, set by BEE and imposed by CPCB.',
    steps: ['Find where the gap comes from: fuel, power or process.', 'Price the cuts you can still make this year against buying certificates.', 'Buy through a power exchange session and surrender on time.'],
    watch: 'Compensation is payable within 90 days of the hearing, so buying in time is usually cheaper.',
    links: [{ label: 'Penalty for missing a target', to: answer('ccts-environmental-compensation-penalty') }, { label: 'What counts inside the intensity', to: answer('ccts-emissions-excluded-from-intensity') }, { label: 'How trading works', to: answer('ccts-certificate-trading-power-exchange') }],
  },
  'named:unsure': {
    market: 'CCTS compliance mechanism',
    verdict: 'Start with the monitoring plan. Your target uses 2023-24 as the baseline, and every later year is judged against it in tonnes CO2e per tonne of output.',
    steps: ['Confirm your plant appears in the gazette schedule for your sector.', 'Submit the monitoring plan BEE asks for, with meters and data sources.', 'Put a year of fuel, power and output records in one place before the first verification.'],
    watch: 'The grid factor used for your purchased power is frozen at the baseline-year value for compliance.',
    links: [{ label: 'Monitoring plan deadline and contents', to: answer('ccts-monitoring-plan-deadline-and-contents') }, { label: 'Which plants have targets', to: answer('how-many-plants-have-ccts-targets') }, { label: 'Frozen grid factor', to: answer('ccts-grid-emission-factor-frozen-baseline') }],
  },
  'factory:solar': {
    market: 'RECs, not carbon credits, for most factories',
    verdict: 'Standalone grid-connected solar is excluded from BEE\'s renewable power methodology. Renewable energy certificates, or simply lower bills and a better Scope 2 figure, are the realistic return.',
    steps: ['Check whether your plant qualifies for RECs under the CERC rules.', 'Apply within six months of generation.', 'Report the solar in your market-based Scope 2 figure.'],
    watch: 'A REC is one megawatt-hour, not one tonne. It changes how you report electricity; it does not offset anything.',
    links: [{ label: 'REC or carbon credit', to: answer('rec-vs-carbon-credit-difference') }, { label: 'Can captive solar get RECs', to: answer('can-captive-solar-plant-get-recs') }, { label: 'Renewable methodology BM EN01.001', to: answer('bm-en01-001-renewable-power-ccts-credits') }],
  },
  'factory:biogas': {
    market: 'CCTS offset mechanism',
    verdict: 'Biogas and waste projects have approved BEE methodologies, so this is one of the few factory routes that can earn credits. Volume decides whether it pays.',
    steps: ['Match the project to an approved methodology.', 'Write the project design document and publish it for 30 days of comments.', 'Validate with one accredited agency, verify with a different one.', 'Monitor for a ten-year fixed or fifteen-year renewable crediting period.'],
    watch: 'The project must have started on or after 1 January 2025 and go beyond what the law already requires.',
    links: [{ label: 'Approved methodologies', to: answer('ccts-offset-approved-methodologies') }, { label: 'Farm biogas methodology', to: answer('bm-ag04-001-farm-biogas-digester-ccts') }, { label: 'Registration steps', to: answer('ccts-offset-project-registration-steps') }],
  },
  'factory:efficiency': {
    market: 'Savings first, credits rarely',
    verdict: 'Efficiency upgrades pay back through the power and fuel bill. On their own, a small factory\'s savings are usually too few tonnes to cover BEE fees and two agencies. Grouping with similar units changes that.',
    steps: ['Measure the saving from a year of bills before and after.', 'Ask whether an approved methodology fits the upgrade.', 'If it does, look for a cluster bundle so fees and verification are shared.'],
    watch: 'Use the fee calculator below to see the price per credit you would need just to cover BEE\'s own charges.',
    links: [{ label: 'Is a project worth it for a small factory', to: answer('ccts-offset-project-worth-it-small-factory') }, { label: 'Bundling small projects', to: answer('ccts-offset-bundling-small-projects') }],
  },
  'factory:nothing': {
    market: 'Measure before you chase credits',
    verdict: 'Every route starts from a baseline you can prove: monthly fuel, power and output with the invoices behind them. That record also answers buyers, lenders and CBAM requests.',
    steps: ['Collect twelve months of electricity bills and fuel invoices.', 'Turn them into Scope 1 and 2 figures with the factor shown for each line.', 'Then check which change, if any, has an approved methodology.'],
    watch: 'Most MSMEs are not obligated under CCTS. The offset route is the one that could apply.',
    links: [{ label: 'Can an MSME earn CCTS credits', to: answer('ccts-offset-mechanism-can-msme-earn-credits') }, { label: 'What CCTS plants ask suppliers', to: answer('msme-supplier-to-ccts-obligated-plant') }],
  },
  'developer:projects': {
    market: 'CCTS offset mechanism, or Verra and Gold Standard',
    verdict: 'Only Indian firms can register CCTS offset projects. Choose the programme by who will buy and which has a methodology for your project type, and register each tonne in one programme only.',
    steps: ['Pick project types with an approved methodology and real volume.', 'Open an account on the ICM portal as a non-obligated entity.', 'Bundle similar small sites into one project design document to share costs.', 'Budget for BEE fees plus two accredited agencies.'],
    watch: 'Twelve methodologies were approved on 7 July 2026. Ten sectors are open, but a sector without a methodology cannot register.',
    links: [{ label: 'CCTS or Verra and Gold Standard', to: answer('ccts-offset-or-verra-gold-standard-which') }, { label: 'Approved sectors', to: answer('ccts-offset-approved-sectors-phase-1-2') }, { label: 'Fees', to: answer('ccts-offset-project-fees') }],
  },
  'developer:verify': {
    market: 'Accredited carbon verification agency',
    verdict: 'Validation and verification under CCTS need BEE accreditation. The procedure sets eligibility, fees and validity, and BEE publishes the list of accredited agencies.',
    steps: ['Read the eligibility criteria for accreditation.', 'Prepare the application with the fee BEE sets.', 'Keep validation and verification roles separate: one project cannot use the same agency for both.'],
    watch: 'Accreditation has a validity period, so plan for renewal.',
    links: [{ label: 'Agency eligibility', to: answer('ccts-acv-agency-eligibility-criteria') }, { label: 'Accreditation fees and validity', to: answer('ccts-acv-accreditation-fees-and-validity') }, { label: 'Current agency list', to: answer('ccts-accredited-verification-agencies-list') }],
  },
  'developer:trade': {
    market: 'Power exchanges under CERC',
    verdict: 'CCTS certificates trade only on CERC-registered power exchanges, in closed double-sided auctions with one clearing price per session. There is no bilateral market to broker.',
    steps: ['Read BEE\'s draft trading procedure and the CERC regulations.', 'Advise clients on bidding and banking rather than private deals.'],
    watch: 'The trading procedure was still a draft in October 2026. Check whether it has been finalised.',
    links: [{ label: 'How trading works', to: answer('ccts-certificate-trading-power-exchange') }, { label: 'How credits are priced', to: '/climate-intelligence/carbon-credit-pricing-explained-vcm-compliance-2026' }],
  },
  'buyer:compliance': {
    market: 'CCTS compliance mechanism',
    verdict: 'If your plant is obligated, buy carbon credit certificates in a power exchange session and surrender them for the gap in your target.',
    steps: ['Work out the gap from your verified Form A.', 'Bid in exchange sessions before the surrender deadline.'],
    watch: 'Certificates are bought on exchanges only. Bilateral deals are not allowed.',
    links: [{ label: 'How trading works', to: answer('ccts-certificate-trading-power-exchange') }, { label: 'How certificates are counted', to: answer('ccts-carbon-credit-certificates-formula') }],
  },
  'buyer:claim': {
    market: 'Voluntary credits',
    verdict: 'Credits never reduce your own inventory. Report them separately, retire them, and say exactly what you claim. Quality differs by standard and project.',
    steps: ['Measure and cut your own emissions first.', 'Choose credits by standard, methodology and vintage.', 'Retire them in your name and disclose them apart from your inventory.'],
    watch: 'A REC is not a carbon credit. Do not use RECs to claim an offset.',
    links: [{ label: 'Verra or Gold Standard', to: answer('verra-or-gold-standard-which-to-choose') }, { label: 'Retire or cancel', to: answer('ccts-offset-retire-vs-cancel-credits') }, { label: 'VCMI claims code', to: answer('vcmi-claims-code-silver-gold-platinum') }],
  },
  'buyer:scope2': {
    market: 'Renewable energy certificates',
    verdict: 'For electricity, the instrument is a REC: one megawatt-hour of renewable power, used in a market-based Scope 2 figure. It is not an offset.',
    steps: ['Buy RECs matching the year of the electricity they cover.', 'Report location-based and market-based Scope 2 side by side.'],
    watch: 'A REC vintage can only cover certain reporting years.',
    links: [{ label: 'REC or carbon credit', to: answer('rec-vs-carbon-credit-difference') }, { label: 'Which year a REC covers', to: answer('rec-vintage-which-year-can-it-cover') }],
  },
};

/** The four things people call "carbon credits" in India. */
export const INSTRUMENTS = [
  { id: 'ccc', name: 'Carbon credit certificate', unit: '1 tonne CO2e', scale: 1, who: 'Plants with CCTS targets that beat them', where: 'Power exchanges, Grid-India registry', link: answer('ccts-carbon-credit-certificates-formula') },
  { id: 'offset', name: 'CCTS offset credit', unit: '1 tonne CO2e', scale: 1, who: 'Registered projects of non-obligated Indian firms', where: 'Same registry and exchanges', link: answer('ccts-offset-mechanism-can-msme-earn-credits') },
  { id: 'escert', name: 'ESCert (PAT)', unit: '1 tonne of oil equivalent saved', scale: 0.75, who: 'PAT designated consumers that beat energy targets', where: 'Power exchanges, being replaced by CCTS', link: answer('pat-escerts-after-ccts') },
  { id: 'rec', name: 'Renewable energy certificate', unit: '1 MWh of renewable power', scale: 0.55, who: 'Eligible renewable generators', where: 'Power exchanges under CERC', link: answer('rec-vs-carbon-credit-difference') },
] as const;

// BEE offset fee schedule, Annexure 2, Version 1.0 (INR, non-refundable).
export const BEE_FEES = {
  account: 5000,
  maintenancePerYear: 2000,
  registration: [{ upTo: 15000, fee: 50000 }, { upTo: 50000, fee: 100000 }, { upTo: Infinity, fee: 150000 }],
  issuancePerCredit: 5,
} as const;

export interface FeeResult { registration: number; account: number; maintenance: number; issuance: number; total: number; credits: number; perCredit: number }

/**
 * BEE's own fees over one fixed ten-year crediting period for a project expecting
 * `tonnesPerYear` of reductions. Agency fees are not published, so they are left out
 * and the page says so.
 */
export function beeFees(tonnesPerYear: number, years = 10): FeeResult {
  const t = Math.max(0, Math.round(tonnesPerYear));
  const registration = BEE_FEES.registration.find(s => t <= s.upTo)!.fee;
  const credits = t * years;
  const account = BEE_FEES.account;
  const maintenance = BEE_FEES.maintenancePerYear * years;
  const issuance = BEE_FEES.issuancePerCredit * credits;
  const total = registration + account + maintenance + issuance;
  return { registration, account, maintenance, issuance, total, credits, perCredit: credits ? total / credits : 0 };
}

export const CCI_FAQS = [
  { question: 'What is the carbon credit price in India?', answer: 'There was no market price for CCTS certificates on 23 October 2026. Trading will run on power exchanges in closed auctions with one clearing price per session, under a BEE procedure that was still a draft. Do not plan a project on a quoted price.' },
  { question: 'How do I start a carbon credit business in India?', answer: 'Choose a role. Project developers register CCTS offset projects (only Indian firms can) or use Verra and Gold Standard. Verification agencies need BEE accreditation. There is no bilateral trading to broker: CCTS certificates trade on power exchanges only.' },
  { question: 'Can a small factory earn carbon credits?', answer: 'Only where an approved BEE methodology fits and the volume covers BEE fees plus two accredited agencies. Most small factories do better treating energy savings as the return, or grouping similar projects in one project design document.' },
  { question: 'Which companies must buy carbon credits in India?', answer: '488 plants have notified greenhouse gas intensity targets: 280 from October 2025 (aluminium, cement, chlor-alkali, pulp and paper) and 208 from January 2026 (secondary aluminium, refineries, petrochemicals, textiles). A June 2026 draft adds 255 iron and steel plants.' },
  { question: 'Is a renewable energy certificate a carbon credit?', answer: 'No. A REC is one megawatt-hour of renewable electricity, used for a market-based Scope 2 figure. A carbon credit is one tonne of CO2e reduced or removed elsewhere, and it never reduces your own inventory.' },
];
