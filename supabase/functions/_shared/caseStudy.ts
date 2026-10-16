// Customer stories: the adaptive question catalog, validation and the story
// generator, shared by the journey page (live preview) and the story-submit
// edge function (which stores exactly what the person approved). Pure: no
// Deno, zod or Supabase imports.
//
// A story is assembled only from the person's own choices and words. Every
// number carries its basis (reported, estimated, independently verified,
// calculated by Senseible), and opportunities are worded as what became
// possible, never as guaranteed outcomes.

export const CONSENT_VERSION = 'story-2026-10';

export const BUYERS = [
  { id: 'msme', label: 'MSME manufacturer or exporter', noun: 'manufacturer', short: 'MSME' },
  { id: 'enterprise', label: 'Enterprise sustainability or procurement', noun: 'enterprise team', short: 'Enterprise' },
  { id: 'finance', label: 'CFO or finance leader', noun: 'finance team', short: 'Finance' },
  { id: 'lender', label: 'Bank, green lender or climate-finance partner', noun: 'lender', short: 'Lender' },
  { id: 'importer', label: 'Importer, buyer or supply-chain leader', noun: 'supply-chain team', short: 'Supply chain' },
] as const;
export type BuyerId = (typeof BUYERS)[number]['id'];

export const STORY_INDUSTRIES = [
  { id: 'textiles', label: 'Textiles and apparel' },
  { id: 'metals', label: 'Steel, aluminium and metals' },
  { id: 'engineering', label: 'Engineering and auto parts' },
  { id: 'chemicals', label: 'Chemicals and pharma' },
  { id: 'food_agri', label: 'Food and agriculture' },
  { id: 'ceramics', label: 'Ceramics, glass and building materials' },
  { id: 'plastics', label: 'Plastics and packaging' },
  { id: 'logistics', label: 'Logistics and transport' },
  { id: 'banking', label: 'Banking and finance' },
  { id: 'retail', label: 'Retail and consumer brands' },
  { id: 'services', label: 'IT and services' },
  { id: 'other', label: 'Other' },
] as const;
export type StoryIndustryId = (typeof STORY_INDUSTRIES)[number]['id'];

type Opt = { id: string; label: string; story: string; from?: string; buyers?: BuyerId[] };

/** What hurt before. Each `story` is one sentence of the problem chapter; `from` is the short form for the summary line. */
export const PAINS: Opt[] = [
  { id: 'buyer_asked', label: 'A buyer asked for carbon data we did not have', story: 'a buyer asked for carbon data and there was nothing to send', from: 'an unanswered buyer request', buyers: ['msme', 'importer'] },
  { id: 'cbam', label: 'An EU customer asked for CBAM emissions', story: 'an EU customer asked for CBAM emissions data', from: 'a CBAM request with no data', buyers: ['msme', 'importer'] },
  { id: 'bank_asked', label: 'Our bank asked for emissions or ESG data', story: 'the bank asked for emissions data that did not exist yet', from: 'a bank request with no data', buyers: ['msme', 'finance'] },
  { id: 'no_team', label: 'No one on the team knew carbon accounting', story: 'no one on the team knew carbon accounting', from: 'no carbon expertise in-house', buyers: ['msme', 'finance'] },
  { id: 'consultant_cost', label: 'Consultant quotes were out of reach', story: 'consultant quotes for a footprint were out of reach', from: 'consultant quotes out of reach', buyers: ['msme'] },
  { id: 'scattered', label: 'Bills and invoices were scattered everywhere', story: 'bills and invoices sat scattered across files and inboxes', from: 'paperwork scattered everywhere' },
  { id: 'supplier_chasing', label: 'Chasing suppliers for data took weeks', story: 'chasing suppliers for data took weeks every cycle', from: 'weeks of supplier chasing', buyers: ['enterprise', 'importer'] },
  { id: 'spend_based', label: 'Scope 3 relied on spend-based estimates', story: 'Scope 3 rested on spend-based estimates nobody could defend', from: 'spend-based guesses', buyers: ['enterprise', 'importer'] },
  { id: 'audit_trail', label: 'Figures could not be traced to documents', story: 'reported figures could not be traced back to the documents behind them', from: 'figures with no paper trail', buyers: ['enterprise', 'finance', 'lender'] },
  { id: 'brsr_deadline', label: 'BRSR or BRSR Core was due', story: 'BRSR reporting was due and the value-chain data was missing', from: 'a BRSR deadline without data', buyers: ['enterprise', 'finance'] },
  { id: 'many_formats', label: 'Supplier data came in every format', story: 'supplier data arrived in every format imaginable', from: 'supplier data in every format', buyers: ['enterprise', 'importer'] },
  { id: 'no_baseline', label: 'We had no credible emissions baseline', story: 'there was no emissions baseline anyone could rely on', from: 'no emissions baseline', buyers: ['finance', 'msme'] },
  { id: 'lender_questions', label: 'Lenders asked climate questions we could not answer', story: 'lenders asked climate questions the team could not answer', from: 'unanswered lender questions', buyers: ['finance'] },
  { id: 'manual_reports', label: 'ESG reporting took weeks of manual work', story: 'ESG reporting took weeks of manual work', from: 'weeks of manual reporting', buyers: ['finance', 'enterprise'] },
  { id: 'unverifiable', label: 'Borrower ESG data could not be checked', story: 'borrower ESG data arrived with nothing to check it against', from: 'borrower data nobody could check', buyers: ['lender'] },
  { id: 'msme_gap', label: 'MSME borrowers had no emissions data', story: 'most MSME borrowers had no emissions data at all', from: 'borrowers with no emissions data', buyers: ['lender'] },
  { id: 'screening_slow', label: 'Green loan screening took too long', story: 'screening a green loan took far too long', from: 'slow green loan screening', buyers: ['lender'] },
  { id: 'supplier_opacity', label: 'We could not see emissions in our supply chain', story: 'emissions in the supply chain were invisible', from: 'an invisible supply chain', buyers: ['importer', 'enterprise'] },
  { id: 'customer_demand', label: 'Our customers asked for supplier emissions', story: 'customers started asking for supplier emissions', from: 'customer questions with no answers', buyers: ['importer', 'enterprise'] },
];

/** What got easier. `story` completes "With Senseible, they ...". */
export const FRICTIONS: Opt[] = [
  { id: 'upload_bills', label: 'Uploaded bills we already had', story: 'uploaded the bills and invoices they already kept' },
  { id: 'no_spreadsheets', label: 'No spreadsheets or long forms', story: 'stopped filling spreadsheets and long forms' },
  { id: 'auto_read', label: 'Documents read automatically', story: 'had documents read automatically instead of typed in' },
  { id: 'plain_language', label: 'Results in plain language', story: 'got results explained in plain language' },
  { id: 'supplier_bills', label: 'Suppliers sent bills, not questionnaires', story: 'asked suppliers for bills instead of questionnaires', buyers: ['enterprise', 'importer'] },
  { id: 'one_view', label: 'One view across sites or suppliers', story: 'brought every site and supplier into one view' },
  { id: 'meter_feed', label: 'Meter or hardware data connected', story: 'connected meter data with the Senseible team' },
  { id: 'borrower_records', label: 'Borrower records arrived ready to review', story: 'received borrower records ready to review', buyers: ['lender'] },
];

/** What became visible. `story` completes "They can now see ...". */
export const VISIBILITY: Opt[] = [
  { id: 'scope_split', label: 'Scope 1, 2 and 3 split', story: 'emissions split into Scope 1, 2 and 3' },
  { id: 'hotspots', label: 'The biggest sources', story: 'which sources drive most of their emissions' },
  { id: 'monthly', label: 'A month-by-month trend', story: 'how emissions move month by month' },
  { id: 'by_site', label: 'Emissions by site or entity', story: 'emissions for each site and entity' },
  { id: 'by_supplier', label: 'Emissions by supplier', story: 'emissions supplier by supplier', buyers: ['enterprise', 'importer', 'lender'] },
  { id: 'portfolio', label: 'Emissions across a loan book', story: 'emissions across the borrowers they finance', buyers: ['lender'] },
];

/** Evidence produced. `story` completes "They now have ...". */
export const EVIDENCE: Opt[] = [
  { id: 'document_trail', label: 'Every figure traced to its document', story: 'a link from every figure to the document it came from' },
  { id: 'factor_source', label: 'Factor and source on every line', story: 'the emission factor and its source on every line' },
  { id: 'rule_checks', label: 'Records passed Senseible checks', story: 'records that passed Senseible’s verification checks (rule checks, not third-party assurance)' },
  { id: 'buyer_pack', label: 'A summary ready for a buyer', story: 'a summary ready to send to a buyer' },
  { id: 'bank_pack', label: 'Data ready for a bank or auditor', story: 'data a bank or auditor can review line by line' },
  { id: 'brsr_pack', label: 'BRSR Principle 6 data', story: 'BRSR Principle 6 data drawn from real documents', buyers: ['enterprise', 'finance'] },
  { id: 'cbam_pack', label: 'CBAM data for an EU customer', story: 'CBAM emissions data for an EU customer', buyers: ['msme', 'importer'] },
];

/** What it opened up. Worded as possibilities; `story` completes "It opened the way to ...". */
export const OPPORTUNITIES: Opt[] = [
  { id: 'buyer_reply', label: 'Replied to a buyer’s request', story: 'answering a buyer’s request with evidence' },
  { id: 'kept_buyer', label: 'Kept or won a buyer who asked', story: 'keeping a buyer who asked for carbon data' },
  { id: 'green_loan', label: 'Started a green loan conversation', story: 'a green loan conversation with their bank' },
  { id: 'reduction_plan', label: 'Found reduction actions', story: 'a list of reduction actions to work through' },
  { id: 'energy_switch', label: 'Looked at solar or efficiency', story: 'weighing solar and efficiency upgrades' },
  { id: 'credit_check', label: 'Checked carbon credit readiness', story: 'checking whether a project could become credit-ready' },
  { id: 'supplier_program', label: 'Started a supplier programme', story: 'a supplier engagement programme', buyers: ['enterprise', 'importer'] },
  { id: 'faster_screening', label: 'Screened green loans faster', story: 'faster green loan screening', buyers: ['lender'] },
];

export const BASES = [
  { id: 'reported', label: 'Reported by the customer' },
  { id: 'estimated', label: 'Estimated' },
  { id: 'independent', label: 'Independently verified' },
  { id: 'calculated', label: 'Calculated by Senseible from their documents' },
] as const;
export type BasisId = (typeof BASES)[number]['id'];

/** Numbers a person may add. Their own numbers can never be marked "calculated"; that comes only from their account. */
export const METRICS = [
  { id: 'days_saved', label: 'Days saved per reporting cycle', unit: 'days', max: 365 },
  { id: 'days_to_reply', label: 'Days to answer a buyer or bank', unit: 'days', max: 365 },
  { id: 'documents', label: 'Bills and invoices processed', unit: 'documents', max: 1_000_000 },
  { id: 'suppliers', label: 'Suppliers covered', unit: 'suppliers', max: 100_000 },
  { id: 'tco2e', label: 'Emissions now visible', unit: 't CO₂e', max: 10_000_000 },
  { id: 'reduction_pct', label: 'Reduction identified', unit: '%', max: 100 },
] as const;
export type MetricId = (typeof METRICS)[number]['id'];

export const ATTRIBUTIONS = [
  { id: 'named', label: 'My name and company' },
  { id: 'company', label: 'Company name only' },
  { id: 'anonymous', label: 'Keep us anonymous' },
] as const;
export type AttributionId = (typeof ATTRIBUTIONS)[number]['id'];

export interface StoryMetric { id: MetricId; value: number; basis: Exclude<BasisId, 'calculated'>; verifier?: string }
export interface AccountFigures { documents: number; verifiedKg: number; scope1Kg: number; scope2Kg: number; scope3Kg: number }

export interface StoryAnswers {
  buyer: BuyerId;
  industry: StoryIndustryId;
  region: string;
  pains: string[];
  moment: string;
  frictions: string[];
  visibility: string[];
  evidence: string[];
  opportunities: string[];
  metrics: StoryMetric[];
  quote: string;
  name: string;
  role: string;
  company: string;
  attribution: AttributionId;
}

export const LIMITS = { region: 60, moment: 240, quote: 400, name: 80, role: 60, company: 120, verifier: 80, picks: 3 } as const;

export const optionsFor = (list: Opt[], buyer: BuyerId) => list.filter((o) => !o.buyers || o.buyers.includes(buyer));
const label = <T extends { id: string; label: string }>(list: readonly T[], id: string) => list.find((x) => x.id === id);

const clean = (v: unknown, max: number) => {
  if (typeof v !== 'string') return '';
  // No links, emails or phone numbers in published text; collapse whitespace.
  return v.replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '').replace(/\+?\d[\d\s-]{8,}\d/g, '')
    .replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
};
const picks = (v: unknown, list: Opt[], buyer: BuyerId) => {
  const allowed = new Set(optionsFor(list, buyer).map((o) => o.id));
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed.has(x)))].slice(0, LIMITS.picks) : [];
};

export type StoryErrors = Partial<Record<keyof StoryAnswers | 'form', string>>;

/** Cleans and checks the answers. Unknown choices are dropped, free text is stripped of links and contact details. */
export function validateStory(raw: Record<string, unknown>): { ok: true; value: StoryAnswers; errors?: undefined } | { ok: false; errors: StoryErrors; value?: undefined } {
  const errors: StoryErrors = {};
  const buyer = BUYERS.some((b) => b.id === raw.buyer) ? raw.buyer as BuyerId : null;
  if (!buyer) return { ok: false, errors: { buyer: 'Choose who you are.' } };
  const industry = STORY_INDUSTRIES.some((i) => i.id === raw.industry) ? raw.industry as StoryIndustryId : null;
  if (!industry) errors.industry = 'Choose your industry.';
  const pains = picks(raw.pains, PAINS, buyer);
  if (!pains.length) errors.pains = 'Pick at least one thing that was hard.';
  const frictions = picks(raw.frictions, FRICTIONS, buyer);
  if (!frictions.length) errors.frictions = 'Pick at least one thing that got easier.';
  const visibility = picks(raw.visibility, VISIBILITY, buyer);
  const evidence = picks(raw.evidence, EVIDENCE, buyer);
  if (!visibility.length && !evidence.length) errors.evidence = 'Pick what you can see or show now.';
  const opportunities = picks(raw.opportunities, OPPORTUNITIES, buyer);

  const metrics: StoryMetric[] = [];
  if (Array.isArray(raw.metrics)) {
    for (const m of raw.metrics.slice(0, METRICS.length)) {
      const def = METRICS.find((d) => d.id === (m as StoryMetric)?.id);
      const value = Number((m as StoryMetric)?.value);
      const basis = (m as StoryMetric)?.basis;
      if (!def || !Number.isFinite(value) || value <= 0 || value > def.max || metrics.some((x) => x.id === def.id)) continue;
      if (basis !== 'reported' && basis !== 'estimated' && basis !== 'independent') continue;
      const verifier = basis === 'independent' ? clean((m as StoryMetric).verifier, LIMITS.verifier) : '';
      if (basis === 'independent' && verifier.length < 2) { errors.metrics = 'Name who verified the figure, or mark it as reported.'; continue; }
      metrics.push({ id: def.id, value: Math.round(value * 10) / 10, basis, ...(verifier ? { verifier } : {}) });
    }
  }

  const attribution = ATTRIBUTIONS.some((a) => a.id === raw.attribution) ? raw.attribution as AttributionId : 'anonymous';
  const name = clean(raw.name, LIMITS.name);
  const company = clean(raw.company, LIMITS.company);
  if (attribution === 'named' && name.length < 2) errors.name = 'Add your name, or choose company only or anonymous.';
  if (attribution !== 'anonymous' && company.length < 2) errors.company = 'Add your company, or choose anonymous.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      buyer, industry: industry!, region: clean(raw.region, LIMITS.region), pains, moment: clean(raw.moment, LIMITS.moment),
      frictions, visibility, evidence, opportunities, metrics, quote: clean(raw.quote, LIMITS.quote),
      name, role: clean(raw.role, LIMITS.role), company, attribution,
    },
  };
}

// ---------------------------------------------------------------------------
// Story generation
// ---------------------------------------------------------------------------

export interface StoryNumber { label: string; value: string; unit: string; basis: BasisId; basisLabel: string }
export interface Story {
  version: 1;
  buyer: BuyerId;
  industry: string;
  region: string;
  hook: string;
  dek: string;
  byline: string;
  chapters: { key: 'problem' | 'friction' | 'visibility' | 'evidence' | 'opportunity'; title: string; text: string }[];
  moment: string;
  quote: string;
  numbers: StoryNumber[];
  disclaimer: string;
}

const HOOKS: Record<string, string> = {
  buyer_asked: 'A buyer asked for carbon data. There was nothing to send.',
  cbam: 'An EU customer asked for CBAM numbers. The clock was running.',
  bank_asked: 'The bank wanted emissions data. None existed yet.',
  no_team: 'No carbon expert on the team. A carbon question on the table.',
  consultant_cost: 'The consultant quote cost more than the problem.',
  scattered: 'The data existed. It was buried in invoices.',
  supplier_chasing: 'Weeks of supplier emails for one Scope 3 number.',
  spend_based: 'A Scope 3 figure nobody could defend.',
  audit_trail: 'Numbers without a paper trail.',
  brsr_deadline: 'BRSR was due. The value-chain data was not there.',
  many_formats: 'Supplier data in every format but a usable one.',
  no_baseline: 'No baseline, and lenders were asking.',
  lender_questions: 'Climate questions from lenders, and no answers yet.',
  manual_reports: 'Weeks of spreadsheets for every ESG report.',
  unverifiable: 'Borrower ESG data with nothing behind it.',
  msme_gap: 'Small borrowers, no emissions data, a green book to build.',
  screening_slow: 'Green loans stuck in screening.',
  supplier_opacity: 'A supply chain with invisible emissions.',
  customer_demand: 'Customers asked about supplier emissions.',
};

const list = (items: string[]) => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 });

/** Who the story is about, in the form the person chose. */
export function byline(a: Pick<StoryAnswers, 'attribution' | 'name' | 'role' | 'company' | 'industry' | 'region' | 'buyer'>): string {
  const industry = label(STORY_INDUSTRIES, a.industry)?.label.toLowerCase() ?? 'industry';
  const buyer = label(BUYERS, a.buyer)!;
  const where = a.region ? ` in ${a.region}` : '';
  if (a.attribution === 'named') return `${a.name}${a.role ? `, ${a.role}` : ''}, ${a.company}`;
  if (a.attribution === 'company') return `${a.company}, ${industry}${where}`;
  return `A ${industry} ${buyer.noun}${where}`;
}

/** Builds the story from the answers alone. Same answers, same story: the preview is what gets published. */
export function generateStory(a: StoryAnswers, account?: AccountFigures | null): Story {
  const pick = (opts: Opt[], ids: string[]) => ids.map((id) => opts.find((o) => o.id === id)?.story).filter(Boolean) as string[];
  const industry = label(STORY_INDUSTRIES, a.industry)?.label ?? 'Other';
  const buyer = label(BUYERS, a.buyer)!;
  const who = a.attribution === 'anonymous' ? 'the team' : a.company;
  const pains = pick(PAINS, a.pains);
  const chapters: Story['chapters'] = [
    { key: 'problem', title: 'The problem', text: pains.map((p, i) => `${i === 0 ? 'Before Senseible, ' : ''}${i === 0 ? p : p.replace(/^./, (c) => c.toUpperCase())}.`).join(' ') },
    { key: 'friction', title: 'What got easier', text: `With Senseible, ${who === 'the team' ? 'they' : who} ${list(pick(FRICTIONS, a.frictions))}.` },
  ];
  if (a.visibility.length) chapters.push({ key: 'visibility', title: 'What they can see now', text: `They can now see ${list(pick(VISIBILITY, a.visibility))}.` });
  if (a.evidence.length) chapters.push({ key: 'evidence', title: 'The evidence', text: `They now have ${list(pick(EVIDENCE, a.evidence))}.` });
  if (a.opportunities.length) chapters.push({ key: 'opportunity', title: 'What it opened up', text: `It opened the way to ${list(pick(OPPORTUNITIES, a.opportunities))}.` });

  const numbers: StoryNumber[] = a.metrics.map((m) => {
    const def = METRICS.find((d) => d.id === m.id)!;
    const basisLabel = m.basis === 'independent' ? `Independently verified by ${m.verifier}` : label(BASES, m.basis)!.label;
    return { label: def.label, value: fmt(m.value), unit: def.unit, basis: m.basis, basisLabel };
  });
  if (account) {
    if (account.documents > 0) numbers.push({ label: 'Documents in their Senseible records', value: fmt(account.documents), unit: 'documents', basis: 'calculated', basisLabel: 'Counted from their Senseible account' });
    if (account.verifiedKg > 0) numbers.push({ label: 'Emissions that passed Senseible checks', value: fmt(account.verifiedKg / 1000), unit: 't CO₂', basis: 'calculated', basisLabel: 'Calculated by Senseible from their documents; rule checks, not third-party assurance' });
  }

  const firstPain = a.pains[0];
  const from = PAINS.find((p) => p.id === firstPain)?.from ?? 'no carbon data';
  const outcome = a.opportunities.length ? pick(OPPORTUNITIES, [a.opportunities[0]])[0] : a.evidence.length ? 'evidence they can share' : 'a clear view of their emissions';
  return {
    version: 1,
    buyer: a.buyer,
    industry,
    region: a.region,
    hook: HOOKS[firstPain] ?? 'A carbon question with no easy answer.',
    dek: `How ${byline(a).replace(/^A /, 'a ')} went from ${from} to ${outcome}.`,
    byline: byline(a),
    chapters,
    moment: a.moment,
    quote: a.quote,
    numbers,
    disclaimer: `${buyer.short} story. Figures are labelled by how they are known. This is one customer’s experience; it does not promise similar results, a loan, credit approval or carbon credits.`,
  };
}

/** How complete the story is, for the journey's progress meter (0 to 100). */
export function storyStrength(a: Partial<StoryAnswers>): number {
  let s = 0;
  if (a.buyer) s += 10;
  if (a.industry) s += 10;
  if (a.pains?.length) s += 15;
  if (a.moment && a.moment.length >= 20) s += 10;
  if (a.frictions?.length) s += 15;
  if (a.visibility?.length || a.evidence?.length) s += 15;
  if (a.opportunities?.length) s += 10;
  if (a.metrics?.length) s += 10;
  if (a.quote && a.quote.length >= 20) s += 5;
  return Math.min(100, s);
}

/** URL slug for a published story: the hook, then a short id so two similar stories never collide. */
export function storySlug(story: Pick<Story, 'hook' | 'industry'>, id: string): string {
  const words = `${story.industry} ${story.hook}`.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !['a', 'an', 'the', 'and', 'of', 'to', 'for', 'was', 'there', 'but', 'with', 'no'].includes(w));
  return `${words.slice(0, 7).join('-')}-${id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Consent (version CONSENT_VERSION). The page shows these exact words; the
// server stores a SHA-256 of the text it rebuilds, as proof of what was agreed.
// ---------------------------------------------------------------------------

const ATTRIBUTION_WORDS: Record<AttributionId, string> = { named: 'named', company: 'company only', anonymous: 'anonymous' };

export function publishConsentText(attribution: AttributionId, company: string): string {
  const who = company && attribution !== 'anonymous' ? company : 'my organisation';
  return `I agree that Senseible may publish the story shown above on senseible.earth and its own channels, as ${ATTRIBUTION_WORDS[attribution]}. I confirm the details are accurate and that I am authorised to share them for ${who}. I can withdraw at any time, and it will be taken down within 7 business days.`;
}
export const PRIVATE_CONSENT_TEXT = 'Use my answers to improve Senseible. Do not publish anything.';
export const ACCOUNT_CONSENT_TEXT = 'Include my verified emissions and document counts from my Senseible account in the story.';

/** The full consent wording for one submission, in a fixed order. */
export function consentRecord(o: { publish: boolean; attribution: AttributionId; company: string; account: boolean }): string {
  return [
    `version ${CONSENT_VERSION}`,
    o.publish ? `publish: ${publishConsentText(o.attribution, o.company)}` : `private: ${PRIVATE_CONSENT_TEXT}`,
    ...(o.account ? [`account: ${ACCOUNT_CONSENT_TEXT}`] : []),
  ].join('\n');
}

/** Stable JSON for hashing a story (keys in insertion order are already fixed by generateStory). */
export const storyJson = (s: Story) => JSON.stringify(s);
