// The Answers hub (/answers). One question per page, a direct answer first.
//
// Rules for every entry:
// - Each statement is backed by the product, the published legal pages, or
//   facts the company supplied (founder, Biocog). No invented features,
//   numbers, customers or certifications.
// - Questions about features Senseible does not have get a plain "no" and
//   what exists instead (status 'not-offered'); invented product names from
//   search queries are not repeated.
// - Regulation answers use only facts already verified on the site; anything
//   needing a fresh primary source waits until it can be checked.

export type AnswerTopic = 'about' | 'using' | 'compliance' | 'finance' | 'data' | 'not-offered';
export type AnswerStatus = 'available' | 'on-request' | 'not-offered';

export interface Answer {
  slug: string;
  topic: AnswerTopic;
  /** The question as people ask it. */
  q: string;
  /** Short page title, 46 characters or fewer. */
  title: string;
  /** Direct answer, 25 to 60 words: what voice and AI search quote. */
  short: string;
  /** Detail paragraphs. Markdown links allowed: [label](/path). */
  body: string[];
  status?: AnswerStatus;
  links: { label: string; to: string }[];
  sources?: { label: string; url: string }[];
}

export const ANSWER_TOPICS: Record<AnswerTopic, { label: string; line: string }> = {
  about: { label: 'About Senseible', line: 'Who we are, how to find us, and how we differ from similar names.' },
  using: { label: 'Using Senseible', line: 'From the first bill to a record you can share.' },
  compliance: { label: 'CBAM, BRSR and Scope 3', line: 'What buyers and regulators ask for, and how Senseible helps.' },
  finance: { label: 'Green finance and credits', line: 'What a verified record can and cannot do for funding.' },
  data: { label: 'Data, security and trust', line: 'How your documents and numbers are protected.' },
  'not-offered': { label: 'What Senseible does not do', line: 'Straight answers about features we do not offer.' },
};

const EUR_LEX_CBAM = 'https://eur-lex.europa.eu/eli/reg/2023/956/oj';
const EUR_LEX_CBAM_OMNIBUS = 'https://eur-lex.europa.eu/eli/reg/2025/2083/oj';

export const answers: Answer[] = [
  /* ---------------- About ---------------- */
  {
    slug: 'senseible-vs-sensibull', topic: 'about', title: 'Senseible vs Sensibull: the difference',
    q: 'How does the Senseible carbon platform differ from Sensibull options trading?',
    short: 'They are unrelated. Senseible (senseible.earth) is a climate platform that turns business bills and invoices into verified emission records. Sensibull is an options trading tool for the stock market. Senseible has no trading, stock or options features.',
    body: [
      'The names sound alike, which is why search engines sometimes mix them up. Senseible is spelled S-E-N-S-E-I-B-L-E and lives at senseible.earth.',
      'Senseible is operated by INSPYR FINNOVATION PRIVATE LIMITED and works on emissions, carbon accounting and climate finance readiness for MSMEs, exporters and the enterprises that buy from them.',
    ],
    links: [{ label: 'What Senseible does', to: '/platform' }, { label: 'Sign in to Senseible', to: '/auth' }],
  },
  {
    slug: 'is-senseible-a-trading-app', topic: 'about', title: 'Is Senseible a trading app?',
    q: 'Is Senseible a financial trading app or a climate-tech platform?',
    short: 'Senseible is a climate-tech platform, not a trading app. It reads electricity bills, fuel invoices and purchase invoices, calculates Scope 1, 2 and 3 emissions with the factor and source on every line, and helps businesses answer buyers, lenders and regulators.',
    body: [
      'Senseible does not offer stock, options, crypto or carbon-credit trading. Its terms state that it is not a carbon registry or exchange.',
    ],
    links: [{ label: 'How it works', to: '/platform' }, { label: 'Terms of Service', to: '/legal/terms' }],
  },
  {
    slug: 'senseible-login', topic: 'about', title: 'Where to sign in to Senseible',
    q: 'Where can I find the official Senseible.earth login?',
    short: 'The official sign-in page is senseible.earth/auth. You can sign in or create an account there. You can also upload a bill from the senseible.earth home page before signing up.',
    body: ['Check that the address is senseible.earth before entering your password. Senseible will never ask for your password by WhatsApp or email.'],
    links: [{ label: 'Sign in', to: '/auth' }, { label: 'Create an account', to: '/auth?mode=signup' }],
  },
  {
    slug: 'find-senseible-in-search', topic: 'about', title: 'Search shows Sensibull, not Senseible',
    q: 'Why does my search for Senseible show Sensibull, and how do I find the climate platform?',
    short: 'Search engines sometimes correct “Senseible” to similar names. Search for “Senseible carbon” or “senseible.earth”, or type senseible.earth into the address bar to reach the climate platform directly.',
    body: ['Senseible is spelled S-E-N-S-E-I-B-L-E. Sensibull is a separate trading product with no connection to Senseible.'],
    links: [{ label: 'Go to the home page', to: '/' }],
  },
  {
    slug: 'senseible-vs-sensible', topic: 'about', title: 'Senseible vs “sensible” ESG software',
    q: 'What is the difference between Senseible and “sensible” in the context of ESG software?',
    short: 'Senseible is a product name, spelled with an extra “e” and an “i”: S-E-N-S-E-I-B-L-E. Searches for the everyday word “sensible” return unrelated results. The climate platform lives at senseible.earth.',
    body: [],
    links: [{ label: 'What is Senseible?', to: '/answers/what-is-senseible' }],
  },
  {
    slug: 'what-is-senseible', topic: 'about', title: 'What is Senseible?',
    q: 'What is the Senseible platform?',
    short: 'Senseible is a climate data platform. You upload the bills and invoices a business already keeps; Senseible reads them, calculates Scope 1, 2 and 3 emissions with the emission factor and source on every line, fingerprints each document, and produces records for buyers, lenders and reports.',
    body: [
      'It is built for MSMEs and exporters, and for enterprises that need evidence from their suppliers. The engine inside it is Biocog, which applies the methods, baselines and frameworks that fit a business’s location and industry.',
    ],
    links: [{ label: 'The platform', to: '/platform' }, { label: 'What is Biocog?', to: '/answers/what-is-biocog' }],
  },
  {
    slug: 'what-is-biocog', topic: 'about', title: 'What is Biocog in Senseible?',
    q: 'What is Biocog, and how does it relate to Senseible?',
    short: 'Biocog is the engine inside Senseible. Biocog MVR is the methodology that calculates and verifies emissions; Biocog Intelligence powers the AI features; plan names such as Biocog Snapshot and Biocog Essential refer to Senseible’s subscription tiers.',
    body: [
      'Biocog methods apply the right methods, baselines and frameworks automatically based on a business’s location and industry, such as the grid factor for its country.',
      'Biocog is not a separate product to migrate from. If you see “Biocog” on your subscription page, that is the name of your Senseible plan.',
    ],
    links: [{ label: 'Plans and pricing', to: '/pricing' }, { label: 'Methodology and trust', to: '/trust' }],
  },
  {
    slug: 'who-founded-senseible', topic: 'about', title: 'Who founded Senseible?',
    q: 'Who founded Senseible, and what is its mission for MSMEs?',
    short: 'Senseible was founded by Ankit Kumar, Chief of Climate Equity and AI. Its mission is to make verified climate data affordable for small businesses, so MSMEs and exporters can answer buyers, lenders and regulators with evidence instead of estimates.',
    body: ['Senseible is operated by INSPYR FINNOVATION PRIVATE LIMITED, a company incorporated in India.'],
    links: [{ label: 'Mission', to: '/mission' }, { label: 'About', to: '/about' }],
  },
  {
    slug: 'where-is-senseible-headquartered', topic: 'about', title: 'Where is Senseible headquartered?',
    q: 'Where is Senseible headquartered, and which markets does it serve?',
    short: 'Senseible is headquartered at Minarch Tower, Sector 44, Gurugram, India. The platform is configured for 19 countries, each with its own business identifier and grid emission factor, with India as its home market.',
    body: ['Exporters in these countries use Senseible to answer requests from EU and other overseas buyers.'],
    links: [{ label: 'Where it works', to: '/platform' }, { label: 'Contact', to: '/contact' }],
  },
  {
    slug: 'contact-senseible', topic: 'about', title: 'How to contact Senseible',
    q: 'How do I contact the Senseible support team?',
    short: 'Email impact@senseible.earth, message +91 72600 64476 on WhatsApp, or use the contact form at senseible.earth/contact. The team aims to reply within 24 hours.',
    body: ['For a demo or an enterprise scoping call, choose “Enterprise & API” or “Sales & Partnerships” on the contact form.'],
    links: [{ label: 'Contact form', to: '/contact' }],
  },
  {
    slug: 'book-a-senseible-demo', topic: 'about', title: 'How to book a Senseible demo',
    q: 'How do I book a demo of Senseible?',
    short: 'Use the contact form at senseible.earth/contact and choose “Enterprise & API” or “Sales & Partnerships”. To see the product straight away, upload one electricity bill on the home page; the free plan needs no card.',
    body: [],
    links: [{ label: 'Contact form', to: '/contact' }, { label: 'Try with one bill', to: '/' }],
  },
  {
    slug: 'is-senseible-saas', topic: 'about', title: 'Is Senseible a SaaS platform?',
    q: 'Is Senseible a SaaS platform?',
    short: 'Yes. Senseible is a web platform with subscription plans: a free Snapshot plan, Essential and Pro, and custom-priced Scale for larger teams. It runs in the browser on desktop and phone, with nothing to install.',
    body: [],
    links: [{ label: 'Plans and pricing', to: '/pricing' }],
  },

  /* ---------------- Using ---------------- */
  {
    slug: 'senseible-core-features', topic: 'using', title: 'Senseible’s core features',
    q: 'What are the core features of Senseible?',
    short: 'Senseible reads bills and invoices, classifies each line to Scope 1, 2 or 3, multiplies it by a published emission factor, fingerprints the document so it cannot be counted twice, verifies the record, and turns it into reports, buyer answers and green finance readiness.',
    body: [
      'Alongside the core flow there are calculators for CBAM cost, product carbon footprint, logistics, supplier emissions risk, energy transition savings and cloud emissions.',
      'Bulk upload handles up to 10 files per batch today. ERP feeds, CSV import, email or WhatsApp intake and API access are set up for enterprises on request.',
    ],
    links: [{ label: 'The platform', to: '/platform' }, { label: 'Calculators', to: '/calculators' }],
  },
  {
    slug: 'how-senseible-calculates-emissions', topic: 'using', title: 'How Senseible calculates emissions',
    q: 'How does Senseible convert activity data into emissions?',
    short: 'Quantity times emission factor. Senseible reads the quantity on each line (kWh, litres, kg), classifies it by HSN code to Scope 1, 2 or 3, multiplies it by the published factor for your country, and shows the factor and its source against the line.',
    body: [
      'If a bill shows an amount but no quantity, Senseible reports a data gap instead of guessing from the amount. Each document is fingerprinted with SHA-256, so the same evidence cannot be counted twice.',
      'For example, 4,200 kWh of grid electricity in India at 0.710 kg CO₂ per kWh is 2,982 kg CO₂.',
    ],
    links: [{ label: 'Methodology and trust', to: '/trust' }],
  },
  {
    slug: 'scope-1-2-3-with-senseible', topic: 'using', title: 'Scope 1, 2 and 3 with Senseible',
    q: 'Can Senseible handle Scope 1, 2 and 3 reporting?',
    short: 'Yes. Fuel invoices give Scope 1, electricity bills give Scope 2, and purchase and freight invoices give Scope 3, each line classified by HSN code and calculated with a published factor. Totals carry the factor, source and document behind them.',
    body: ['Where a supplier’s own data is not available, Scope 3 lines are clearly marked with the method used, so a reviewer can see how much is measured and how much is estimated.'],
    links: [{ label: 'Scope 3 supplier evidence', to: '/scope-3-supplier-evidence' }, { label: 'Carbon accounting', to: '/carbon-accounting' }],
  },
  {
    slug: 'senseible-on-mobile', topic: 'using', title: 'Can I use Senseible on my phone?',
    q: 'Is there a Senseible mobile app?',
    short: 'Senseible runs in your phone’s browser. Open senseible.earth, sign in, and take a photo of a bill or upload a PDF; the dashboard, history and reports work the same way on a phone.',
    body: [],
    links: [{ label: 'Open Senseible', to: '/' }],
  },
  {
    slug: 'minimum-size-to-use-senseible', topic: 'using', title: 'Is there a minimum business size?',
    q: 'What is the minimum factory size required to use Senseible?',
    short: 'There is no minimum. Senseible works from a single electricity bill, so a one-person workshop and a large plant use the same flow. The free Snapshot plan reads up to 10 bills a month.',
    body: [],
    links: [{ label: 'Try with one bill', to: '/' }, { label: 'Plans', to: '/pricing' }],
  },
  {
    slug: 'net-zero-with-10-employees', topic: 'using', title: 'Starting net zero as a small business',
    q: 'How do I start a net-zero journey if I only have 10 employees?',
    short: 'Start with a baseline from the bills you already keep: twelve months of electricity bills and fuel invoices. Upload them to Senseible to get Scope 1 and 2, then use the Net-Zero engine to see which changes cut the most.',
    body: ['A baseline built from documents is also what buyers and lenders ask for first, so the same work answers their requests.'],
    links: [{ label: 'Net-Zero engine', to: '/net-zero' }, { label: 'Your carbon number', to: '/msme-carbon-number' }],
  },
  {
    slug: 'track-emissions-without-consultant', topic: 'using', title: 'Track emissions without a consultant',
    q: 'What is the most accurate way to track factory emissions without a consultant?',
    short: 'Use the quantities printed on your own bills rather than spend estimates. Electricity units, fuel litres and purchase quantities, multiplied by published factors, give a figure a buyer can check. Senseible reads these from photos or PDFs and shows the method on every line.',
    body: [],
    links: [{ label: 'Upload a bill', to: '/' }],
  },
  {
    slug: 'product-carbon-footprint', topic: 'using', title: 'Product carbon footprint (PCF)',
    q: 'What is a product carbon footprint, and can Senseible calculate one?',
    short: 'A product carbon footprint is the emissions of one unit of product, such as one gear or one tonne of steel. Senseible’s product carbon footprint calculator works it out from materials, energy and transport, using published factors.',
    body: ['For a part, you need the material weights, the energy used to make it, and how it is shipped.'],
    links: [{ label: 'Product carbon footprint calculator', to: '/calculators/product-carbon-footprint' }],
  },
  {
    slug: 'small-vendor-scope-3', topic: 'using', title: 'Scope 3 data as a small supplier',
    q: 'Can I use Senseible to provide Scope 3 data if I am a small vendor?',
    short: 'Yes. Your Scope 1 and 2 are part of your customer’s Scope 3. Build your record from your own electricity and fuel bills in Senseible, then share it with your customer, with the factor and source on every line.',
    body: [],
    links: [{ label: 'Your carbon number for buyers', to: '/msme-carbon-number' }],
  },
  {
    slug: 'handwritten-bills', topic: 'using', title: 'Handwritten or unclear bills',
    q: 'What if my bill is handwritten or hard to read?',
    short: 'Senseible flags an unclear number for you to check instead of guessing it. You can retake the photo or confirm the value before the record is verified.',
    body: [],
    links: [{ label: 'Upload a bill', to: '/' }],
  },
  {
    slug: 'tally-sap-integration', topic: 'using', title: 'Tally, SAP and ERP integration', status: 'on-request',
    q: 'How do I integrate Senseible with Tally or SAP?',
    short: 'Today, you upload documents (bills and invoices) to Senseible, up to 10 files per batch. Direct ERP feeds from Tally, SAP, Oracle or Zoho, and CSV imports, are built for enterprise customers on request.',
    body: ['Tell us which system you use and what data you hold, and we will scope it with you.'],
    links: [{ label: 'Talk to us', to: '/contact' }, { label: 'Enterprise capabilities', to: '/enterprise' }],
  },
  {
    slug: 'senseible-carbon-api', topic: 'using', title: 'Is there a Senseible carbon API?', status: 'on-request',
    q: 'What is the Senseible Carbon API, and how do developers use it?',
    short: 'API and webhook access is set up for enterprise customers on request; there is no public self-serve API yet. Ecosystem partners can bring verified MSME emission data into their own products through the partner programme.',
    body: [],
    links: [{ label: 'Partners', to: '/partners' }, { label: 'Talk to us', to: '/contact' }],
  },

  /* ---------------- Compliance ---------------- */
  {
    slug: 'senseible-and-cbam', topic: 'compliance', title: 'How Senseible helps with EU CBAM',
    q: 'How does Senseible help with EU CBAM compliance?',
    short: 'Senseible helps producers of CBAM goods give their EU buyers actual emissions data built from fuel and power bills, so buyers are not left with default values. Its CBAM calculator estimates certificate cost from 2026 to 2034.',
    body: [
      'CBAM covers cement, iron and steel, aluminium, fertilisers, hydrogen and electricity. The EU importer, as the authorised declarant, declares embedded emissions; non-EU producers do not pay CBAM directly, but their buyers need their data.',
      'Senseible has nothing to do with stock market tools.',
    ],
    links: [{ label: 'CBAM calculator', to: '/cbam-calculator' }, { label: 'Steel', to: '/industries/steel' }],
    sources: [{ label: 'Regulation (EU) 2023/956', url: EUR_LEX_CBAM }],
  },
  {
    slug: 'cbam-definitive-period', topic: 'compliance', title: 'CBAM definitive period from 2026',
    q: 'What is the CBAM definitive period, and how does it differ from the transitional phase?',
    short: 'CBAM moved from its transitional reporting phase to the definitive period on 1 January 2026. EU importers now declare embedded emissions and surrender CBAM certificates for them. Certificates for 2026 imports go on sale on 1 February 2027; the first annual declaration is due by 30 September 2027.',
    body: [
      'An importer bringing in 50 tonnes or less of covered goods in a calendar year is exempt; the threshold does not apply to electricity or hydrogen.',
    ],
    links: [{ label: 'CBAM calculator', to: '/cbam-calculator' }],
    sources: [{ label: 'Regulation (EU) 2023/956', url: EUR_LEX_CBAM }, { label: 'Regulation (EU) 2025/2083', url: EUR_LEX_CBAM_OMNIBUS }],
  },
  {
    slug: 'cbam-default-vs-actual', topic: 'compliance', title: 'CBAM default values vs actual data',
    q: 'How does Senseible handle default values versus actual data for CBAM?',
    short: 'Where an importer has no actual emissions data from the producer, EU default values are used, with a mark-up of 10% in 2026, 20% in 2027 and 30% from 2028 for steel, aluminium, cement and hydrogen, and 1% for fertilisers. Senseible builds actual data from your documents.',
    body: ['Actual data that is lower than the default value lowers your buyer’s certificate cost, which makes your goods easier to buy.'],
    links: [{ label: 'CBAM calculator', to: '/cbam-calculator' }],
    sources: [{ label: 'Regulation (EU) 2023/956', url: EUR_LEX_CBAM }],
  },
  {
    slug: 'brsr-report-senseible', topic: 'compliance', title: 'BRSR reports with Senseible',
    q: 'Can Senseible generate BRSR reports?',
    short: 'Yes, Senseible’s Reports page exports your verified emissions in a BRSR format, alongside GHG Protocol output. It prepares the emissions data; filing, assurance and the rest of a BRSR disclosure remain with your company and its advisers.',
    body: ['Listed customers also ask suppliers for figures for their own BRSR value-chain reporting; a Senseible record answers that request.'],
    links: [{ label: 'ESG reporting', to: '/esg-reporting' }],
  },
  {
    slug: 'scope-3-category-1-spend-based', topic: 'compliance', title: 'Scope 3 Category 1: spend vs activity',
    q: 'How do I calculate Scope 3 Category 1 emissions with Senseible?',
    short: 'The GHG Protocol ranks Category 1 methods from supplier-specific and hybrid to average-data and spend-based. Senseible uses suppliers’ own bills where they exist and marks spend-based lines clearly, so you can see how much of the figure is evidence.',
    body: ['The supplier evidence check shows how many of your suppliers are backed by bills today and the pace needed to close the gap.'],
    links: [{ label: 'Scope 3 supplier evidence check', to: '/scope-3-supplier-evidence' }],
  },
  {
    slug: 'auditors-and-senseible-reports', topic: 'compliance', title: 'Why auditors prefer document trails',
    q: 'Why do auditors prefer Senseible reports over manual Excel sheets?',
    short: 'Because every number traces back to a document. Senseible exports an audit trail in which each row carries the document fingerprint, date, vendor, activity data, emission factor and source, calculation and methodology version, so a reviewer can check any line.',
    body: ['Senseible is not an auditor or assurance provider; it produces the evidence an assurance provider looks for.'],
    links: [{ label: 'Trust and methodology', to: '/trust' }],
  },
  {
    slug: 'greenwashing-detection', topic: 'compliance', title: 'Can Senseible spot greenwashing?',
    q: 'Can Senseible detect greenwashing in supplier data?',
    short: 'Senseible raises explainable integrity flags: each flag says which pattern triggered it, such as a missing vendor GSTIN, an old invoice or an amount far outside the normal range, and how to resolve it. It does not label suppliers without a stated reason.',
    body: [],
    links: [{ label: 'Trust and methodology', to: '/trust' }],
  },
  {
    slug: 'verified-vs-unverified-data', topic: 'compliance', title: 'Verified vs unverified data',
    q: 'What is the difference between verified and non-verified data on Senseible?',
    short: 'A verified record has passed Senseible’s checks: a quantity and unit were read from a document, a published factor was applied, and the document was fingerprinted. Unverified lines are missing something, and the gap is named so you can fix it.',
    body: ['Verification on Senseible is a data check, not a third-party audit opinion.'],
    links: [{ label: 'Trust and methodology', to: '/trust' }],
  },

  /* ---------------- Finance ---------------- */
  {
    slug: 'green-loan-with-senseible', topic: 'finance', title: 'Green loans and Senseible data',
    q: 'Can Senseible help me get a green loan or a lower interest rate?',
    short: 'Senseible gives lenders a verified emissions baseline and a Climate Credibility Score, which green and sustainability-linked loans need before terms can be set. It does not guarantee approval or any particular interest rate; that is the lender’s decision.',
    body: ['The Green Loan Eligibility check is included from the Essential plan.'],
    links: [{ label: 'Climate finance', to: '/climate-finance' }, { label: 'Green finance', to: '/green-finance' }],
  },
  {
    slug: 'carbon-credits-with-senseible', topic: 'finance', title: 'Carbon credits with Senseible',
    q: 'Can an MSME earn carbon credits through Senseible?',
    short: 'Senseible measures and verifies the data a carbon credit starts from. Records that clear additionality, evidence linkage and methodology checks can become credit-ready signals for buyers. Senseible is not a carbon registry or exchange and does not issue credits.',
    body: ['Issuance happens through a registry under an approved methodology, with independent validation and verification.'],
    links: [{ label: 'Carbon credits', to: '/carbon-credits' }],
  },
  {
    slug: 'senseible-free-plan', topic: 'finance', title: 'Is Senseible free?',
    q: 'Does Senseible offer a free plan or free trial?',
    short: 'Yes. The Snapshot plan is free: an AI emission snapshot, a basic ESG score, 10 invoice scans a month and 90-day data backup. No card is asked for when you sign up.',
    body: [],
    links: [{ label: 'Plans', to: '/pricing' }, { label: 'Create a free account', to: '/auth?mode=signup' }],
  },
  {
    slug: 'senseible-pricing', topic: 'finance', title: 'Senseible pricing',
    q: 'What does Senseible cost for a small manufacturing unit?',
    short: 'Snapshot is free. Essential is ₹499 a month billed yearly (₹1,999 monthly) and Pro is ₹4,999 a month billed yearly (₹9,999 monthly). Scale is custom-priced for larger teams, entities and integrations.',
    body: [],
    links: [{ label: 'Compare plans', to: '/pricing' }],
  },

  /* ---------------- Data ---------------- */
  {
    slug: 'senseible-data-protection', topic: 'data', title: 'How Senseible protects your data',
    q: 'How does Senseible protect the data of Indian exporters?',
    short: 'Your records stay in your account and are visible only to you and the team you invite, enforced in the database. Data is processed under a Data Processing Addendum drafted for India’s DPDP Act, 2023 and the EU GDPR, and you decide what to share with a buyer or lender.',
    body: ['Each document is fingerprinted with SHA-256, so the same evidence cannot be counted twice.'],
    links: [{ label: 'Data Processing Addendum', to: '/legal/dpa' }, { label: 'Privacy Policy', to: '/legal/privacy' }],
  },

  /* ---------------- Not offered ---------------- */
  {
    slug: 'blockchain-carbon-certificate', topic: 'not-offered', title: 'Blockchain carbon certificates?', status: 'not-offered',
    q: 'How do I verify a Senseible carbon certificate on the blockchain?',
    short: 'Senseible does not issue blockchain certificates or carbon tokens. Each record is backed by a SHA-256 fingerprint of the original document, its emission factor and source, and the methodology version, which anyone with the record can check.',
    body: [],
    links: [{ label: 'Trust and methodology', to: '/trust' }],
  },
  {
    slug: 'sensors-fenceline-methane', topic: 'not-offered', title: 'Sensors, fenceline or methane monitoring?', status: 'not-offered',
    q: 'Does Senseible provide fenceline, methane or real-time sensor monitoring?',
    short: 'No. Senseible does not sell sensors or run fenceline, methane-leak or satellite monitoring. It works from the documents a business already keeps. For enterprises, meter data from equipment a supplier already has can be connected on request.',
    body: [],
    links: [{ label: 'Enterprise capabilities', to: '/enterprise' }],
  },
  {
    slug: 'is-senseible-a-certifier', topic: 'not-offered', title: 'Is Senseible an auditor or registry?', status: 'not-offered',
    q: 'Does Senseible provide carbon certification or audit assurance?',
    short: 'No. Senseible is not a statutory auditor, verifier, carbon registry or exchange. It produces verified, document-backed emissions data that auditors, assurance providers, lenders and buyers can check.',
    body: [],
    links: [{ label: 'Terms of Service', to: '/legal/terms' }],
  },
  {
    slug: 'carbon-wallet-or-tokens', topic: 'not-offered', title: 'Carbon wallet or carbon tokens?', status: 'not-offered',
    q: 'Does Senseible offer a carbon wallet or carbon tokens?',
    short: 'No. Senseible does not offer a carbon wallet, tokens or credit trading. It measures and verifies emissions and shows what a verified record could be worth in carbon credit or financing terms, with the price and assumptions stated.',
    body: [],
    links: [{ label: 'Carbon credits', to: '/carbon-credits' }],
  },
];

export const answerBySlug = (slug: string) => answers.find(a => a.slug === slug);
