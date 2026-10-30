import { serviceNav } from '@/data/services/nav';
import { OG_VERSION } from './ogVersion';
import { MSME_CARBON_META, SUPPLIER_EVIDENCE_META } from '@/data/leadMagnets';
import { ESG_SAMPLE_META } from '@/data/esgReportSample';
import { GUIDE_META } from '@/data/softwareGuideMeta';
import { isUnreviewedGermanPath, hreflangFor as germanHreflangFor, type Alternate } from './dePages';
import { isUnreviewedHindiPath, hindiHreflangFor } from './hiPages';
export * from './dePages';
export * from './hiPages';

/** hreflang pairs for German and Hindi pages and their English counterparts. */
export function hreflangFor(path: string): Alternate[] {
  const de = germanHreflangFor(path);
  return de.length ? de : hindiHreflangFor(path);
}
// Single source of truth for page metadata, shared by the client (SEOHead,
// RouteSEO) and the build-time prerender + validator (scripts/). Keep this file
// free of large data imports so it stays cheap in the client bundle; the full
// route list lives in ./routeRegistry.ts, which only the build imports.
export const SITE_URL = 'https://senseible.earth';
export const SITE_NAME = 'Senseible';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/default.jpg?v=${OG_VERSION}`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

// Link-preview images (public/og/, rendered by scripts/og/render-og.mjs).
// Pages not listed share the default preview.
const OG_IMAGES: Record<string, { slug: string; alt: string }> = {
  '/': { slug: 'default', alt: 'Turn invoices into verified carbon records' },
  '/platform': { slug: 'platform', alt: 'Every claim, with its source: invoices in, verified records out' },
  '/pricing': { slug: 'pricing', alt: 'Start free. Upgrade when your records grow' },
  '/trust': { slug: 'trust', alt: 'Trust, made structural: a four-layer evidence chain' },
  '/carbon-credits': { slug: 'carbon-credits', alt: 'Three gates before any credit signal' },
  '/about': { slug: 'about', alt: 'Why Senseible exists: an invoice becomes a carbon calculation' },
  '/contact': { slug: 'contact', alt: 'Talk to the Senseible team on WhatsApp or email' },
  '/decarbonize-india': { slug: 'decarbonize-india', alt: 'Decarbonize India: become an Impact Ambassador' },
  '/cbam-calculator': { slug: 'cbam-calculator', alt: 'Know your CBAM exposure, 2026 to 2034' },
  '/climate-finance': { slug: 'climate-finance', alt: 'Verified data lenders can underwrite' },
  '/industries': { slug: 'industries', alt: 'Carbon, sector by sector' },
  '/net-zero': { slug: 'net-zero', alt: 'A baseline becomes a roadmap' },
  '/careers': { slug: 'careers', alt: 'Careers at Senseible: build climate infrastructure for small businesses, with roles in engineering, applied AI, climate research, design and growth' },
  '/mission': { slug: 'mission', alt: 'Our mission: carbon accounting every MSME can use' },
  '/partners': { slug: 'partners', alt: 'Partner with Senseible: verified MSME emission data for banks, auditors, carbon credit buyers and ERP providers' },
  // CBAM cluster
  '/cbam-cost': { slug: 'cbam', alt: 'CBAM cost per tonne by sector, 2026 to 2034' },
  '/climate-intelligence/eu-cbam-explained-emerging-market-exporters': { slug: 'cbam', alt: 'EU CBAM explained for exporters: the 2026 rules' },
  '/answers/cbam-definitive-period': { slug: 'cbam', alt: 'The CBAM definitive period from 2026, and how it differs from the transitional phase' },
  '/answers/how-to-calculate-cbam-cost': { slug: 'cbam', alt: 'How to calculate CBAM cost, with a worked example' },
  // Green finance cluster
  '/green-finance': { slug: 'green-finance', alt: 'Green loans, sustainability-linked loans and green bonds backed by verified emissions' },
  '/green-loan-check': { slug: 'green-finance', alt: 'Green loan check for MSMEs: see what a lender will ask for' },
  '/msme-green-loan-schemes': { slug: 'green-finance', alt: 'Green loan schemes for MSMEs in India, compared by what the money is for' },
  // Carbon accounting and scopes
  '/carbon-accounting': { slug: 'carbon-accounting', alt: 'Carbon accounting: a Scope 1, 2 and 3 GHG inventory from your bills and invoices' },
  '/climate-intelligence/scope-1-2-3-emissions-simple-guide-small-business': { slug: 'carbon-accounting', alt: 'Scope 1, 2 and 3 emissions: a small business guide' },
  // Factors and calculators
  '/emission-factors': { slug: 'calculators', alt: 'Emission factors for Indian invoices: fuels and grid electricity' },
  '/calculators': { slug: 'calculators', alt: 'Free carbon calculators for MSMEs' },
  '/calculators/product-carbon-footprint': { slug: 'calculators', alt: 'Product carbon footprint calculator: cradle-to-gate emissions per product unit' },
  // Hubs
  '/climate-intelligence': { slug: 'guides', alt: 'Climate Intelligence: guides on CBAM, Scope 3, BRSR and green finance' },
  '/answers': { slug: 'guides', alt: 'Answers: straight answers about Senseible, carbon data and CBAM' },
  '/enterprise/pricing': { slug: 'enterprise', alt: 'Enterprise pricing: pay as you add suppliers' },
  '/enterprise': { slug: 'enterprise', alt: 'Every supplier’s emissions in one record: Scope 3 for enterprise buyers' },
  '/climate-intelligence/carbon-credit-pricing-explained-vcm-compliance-2026': { slug: 'credit-pricing', alt: 'How carbon credits are actually priced in 2026, voluntary and compliance markets' },
  '/cbam-authorised-declarant': { slug: 'cbam-calculator', alt: 'Authorised CBAM declarant: who files for your shipment and what they need from you' },
  '/cbam': { slug: 'cbam-calculator', alt: 'CBAM for Indian exporters: pay on your real number, not the EU default' },
  '/carbon-credits-india': { slug: 'credit-pricing', alt: 'Carbon credits in India: find the route that fits you' },
  '/carbon-accounting-software-india': { slug: 'calculators', alt: 'Choose carbon accounting software in India with your own scorecard' },
  // Software comparison guides
  '/best-carbon-accounting-software': { slug: 'carbon-accounting', alt: 'Carbon accounting software compared on the checks buyers ask' },
  '/best-digital-mrv-platforms': { slug: 'carbon-credits', alt: 'Digital MRV platforms for carbon projects, compared' },
  '/best-supplier-emissions-software': { slug: 'enterprise', alt: 'Scope 3 supplier emissions software, compared' },
  '/best-carbon-compliance-software': { slug: 'guides', alt: 'Carbon compliance software for CSRD, ISSB, BRSR and SB 253, compared' },
  '/best-cbam-software': { slug: 'cbam', alt: 'CBAM software for EU importers and non-EU exporters, compared' },
  '/best-brsr-software': { slug: 'guides', alt: 'BRSR and BRSR Core software, compared' },
  '/carbon-credit-platforms': { slug: 'carbon-credits', alt: 'Carbon credit registries, marketplaces and exchanges, compared' },
  '/green-loans-msme-india': { slug: 'green-finance', alt: 'Green loans for Indian MSMEs: SIDBI, IREDA and other routes compared' },
  '/sustainability-tender-platforms': { slug: 'guides', alt: 'Where to find public tenders that score carbon' },
  '/marketplace': { slug: 'marketplace', alt: 'Carbon credit marketplace: MSME credit listings with provenance and verification status' },
  '/white-paper': { slug: 'white-paper', alt: 'Senseible white paper: how an invoice becomes an emission figure' },
};

/** The preview image and its alt text for a path; the shared default when the page has none. */
export function ogImageFor(path: string): { url: string; alt: string; specific: boolean } {
  const key = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const hit = OG_IMAGES[key];
  return hit
    ? { url: `${SITE_URL}/og/${hit.slug}.jpg?v=${OG_VERSION}`, alt: hit.alt, specific: true }
    : { url: DEFAULT_OG_IMAGE, alt: 'Senseible: turn invoices into verified carbon records', specific: false };
}

export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 160;

export interface PageMeta {
  title: string;
  description: string;
}

/** Appends the brand only when the result still fits in TITLE_MAX characters. */
export function fitTitle(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim();
  if (/senseible/i.test(t)) return t;
  const branded = `${t} | ${SITE_NAME}`;
  return branded.length <= TITLE_MAX ? branded : t;
}

/** Plain-text description cut on a word boundary, markdown stripped. */
export function clampDescription(text: string, max = 155): string {
  const plain = text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.-]+$/, '');
  return `${atWord}…`;
}

/** Canonical URLs: no query, no hash, no trailing slash except the root. */
export function canonicalPath(pathname: string): string {
  const p = pathname.split(/[?#]/)[0] || '/';
  return p.length > 1 ? p.replace(/\/+$/, '') : '/';
}

export function canonicalUrl(pathname: string): string {
  const p = canonicalPath(pathname);
  return p === '/' ? `${SITE_URL}/` : `${SITE_URL}${p}`;
}

/** Signed-in, transactional or tool-state routes that must never be indexed. */
export const NOINDEX_PREFIXES = [
  '/auth', '/reset-password', '/dashboard', '/history', '/verify', '/monetize',
  '/reports', '/mrv-dashboard', '/partner', '/partner-dashboard', '/partner-profile',
  '/partner-reports', '/settings', '/profile', '/subscription', '/billing', '/team',
  '/payment-success', '/accept-invite', '/admin', '/cms-admin', '/calculators/history',
  // Private links and enterprise sign-in (owner, 26 October 2026): a supplier's
  // emailed request link must never be indexed, even if it is forwarded.
  '/supplier-request', '/supplier-share', '/enterprise/sign-in', '/enterprise/dashboard',
];

export function isNoIndexPath(pathname: string): boolean {
  const p = canonicalPath(pathname);
  return isUnreviewedGermanPath(p) || isUnreviewedHindiPath(p) || NOINDEX_PREFIXES.some(prefix => p === prefix || p.startsWith(`${prefix}/`));
}

/** Duplicate routes that render the same page as another URL. */
export const CANONICAL_ALIASES: Record<string, string> = {
  '/partner-marketplace': '/marketplace',
};

// Named reviewers. A page shows a reviewer only once it is listed in
// PAGE_REVIEWS with the date the review actually happened; never add an entry
// for a page the reviewer has not read.
export const REVIEWERS = {
  'elena-varga': { name: 'Dr. Elena Varga', role: 'Senior CBAM Policy Advisor, EU' },
} as const;

export type ReviewerId = keyof typeof REVIEWERS;

export const PAGE_REVIEWS: Record<string, { reviewer: ReviewerId; reviewedOn: string }> = {};

// Claims that must never ship: unsourced superlatives, unmeasured speed
// claims, fabricated ratings and CBAM wording that misstates who pays.
// scripts/validate-seo.mjs fails the build if any appear in built output.
export const BANNED_CLAIMS: { pattern: RegExp; reason: string }[] = [
  { pattern: /india['’]?s first/i, reason: 'Unsourced superlative' },
  // Lookbehind skips URL slugs such as "dynamic-benchmarking-400m-msmes".
  { pattern: /(?<![-/])\b400\s?(million|m\b|m\+)/i, reason: 'Unsourced market size' },
  { pattern: /\b47[\s-]?(seconds?|secs?\b|s\b)/i, reason: 'Unmeasured speed claim' },
  { pattern: /aggregateRating/, reason: 'Rating without published reviews' },
  { pattern: /trusted by (exporters|indian exporters|auditors)/i, reason: 'Unsourced endorsement' },
  { pattern: /financially active/i, reason: 'Inaccurate CBAM timeline wording' },
  { pattern: /default[\s-]value penalt/i, reason: 'CBAM default values are not penalties and exporters do not pay them' },
];

export const STATIC_PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'Senseible: Carbon MRV to Climate Finance for MSMEs',
    description: 'Upload a bill or invoice for an evidence-linked carbon report. MSMEs use the verified record for green loans, buyer and export requests, and carbon credits.',
  },
  '/platform': {
    title: 'The Senseible Platform: Verified Climate Evidence',
    description: 'How Senseible turns invoices, energy bills and freight slips into verified emission records for MSMEs, enterprise buyers, lenders and carbon credit buyers.',
  },
  '/about': {
    title: 'About Senseible: Carbon Infrastructure for MSMEs',
    description: 'Senseible builds carbon measurement, reporting and verification infrastructure that turns MSME business documents into verified, regulation-ready emission data.',
  },
  '/mission': {
    title: 'Our Mission: Carbon Accounting Every MSME Can Use',
    description: 'Why Senseible exists: making carbon verification accessible to MSMEs that are excluded from climate finance because their emissions are not measured.',
  },
  '/principles': {
    title: 'Our Principles: Deterministic, Traceable Carbon Math',
    description: 'Senseible uses deterministic calculations with published emission factors, so every number traces back to a source document and reproduces the same way.',
  },
  '/pricing': {
    title: 'Pricing: Carbon MRV Plans for MSMEs',
    description: 'Compare Senseible plans: a free Snapshot tier, Essential and Pro for growing MSMEs, and Scale for teams. Yearly and monthly billing in Indian rupees.',
  },
  '/contact': {
    title: 'Contact Senseible: Sales, Partnerships and Support',
    description: 'Talk to Senseible about carbon accounting, CBAM preparation, enterprise supplier programmes or partnerships. Based in Gurugram, India.',
  },
  '/carbon-credits': {
    title: 'Carbon Credits for MSMEs: From Records to Revenue',
    description: 'How MSMEs can turn verified emission reductions into carbon credit eligibility signals, what buyers check, and where the money realistically comes from.',
  },
  '/climate-finance': {
    title: 'Climate Finance for MSMEs: Green Loans and Signals',
    description: 'How verified emission baselines become inputs for green loans and sustainability-linked lending, and what lenders need to see from an MSME borrower.',
  },
  '/partners': {
    title: 'Partner with Senseible: Lenders, Auditors, Buyers',
    description: 'Partner programme for banks, auditors, carbon credit buyers and ERP providers that need verified MSME emission data inside their own products.',
  },
  '/india-climate-data': {
    title: 'India Climate Data: Grid Factor, CCTS, CBAM Values',
    description: 'India grid emission factor since FY 2013-14, power-sector CO2, capacity mix, CCTS targets, CBAM default values and PPAC fuel conversions. Free CSVs.',
  },
  '/white-paper': {
    title: 'Senseible White Paper: Emissions Method, AI and Audit Trail',
    description: 'How Senseible turns invoices into emission figures: GHG Protocol equations, factor governance, uncertainty, AI limits and a SHA-256 audit trail.',
  },
  '/green-loan-check': {
    title: 'Green Loan Check for MSMEs: 2-Minute Readiness',
    description: 'Answer six quick questions to see what a lender will ask for in a green loan application, and measure the carbon footprint most MSMEs are missing.',
  },
  '/msme-green-loan-schemes': {
    title: 'Green Loan Schemes for MSMEs in India, Compared',
    description: 'SIDBI 4E, Green Finance Scheme, FMAP, ADEETIE, MSE-GIFT, bank solar loans and CGTMSE: who each suits, what it funds and the papers lenders ask for.',
  },
  '/grants': {
    title: 'Climate Grants and Funding Applications',
    description: 'Apply to Senseible grant and pilot programmes for climate-tech work in emerging markets, and see what we look for in an application.',
  },
  '/decarbonize-india': {
    title: 'Decarbonize India: Impact Ambassador Program',
    description: 'Become a Climate Impact Ambassador. 90 days of selfless work getting carbon-heavy Indian MSMEs to measure, cut and commit. Pick your lane and apply.',
  },
  '/trust': {
    title: 'Trust and Technical Validation',
    description: 'How Senseible verifies emission data: evidence hashing, methodology versioning, confidence bands, framework coverage and greenwashing safeguards.',
  },
  '/enterprise/pricing': {
    title: 'Enterprise Pricing: Pay As You Add Suppliers',
    description: 'Supplier emissions priced on three things: suppliers you add, team seats and any integration you ask for. Role-based access for every team. Pilot on 10 to 15.',
  },
  '/enterprise': {
    title: 'Supplier Emissions and Scope 3 for Enterprises',
    description: 'Agents turn supplier invoices, bills and estimates into Scope 3 records with a source, factor and confidence score. Every capability is labelled honestly.',
  },
  '/careers': {
    title: 'Careers at Senseible: Build Climate Infrastructure',
    description: 'Open roles at Senseible across engineering, applied AI, climate research, design and growth, plus intern and fresher tracks. See how to apply.',
  },
  '/cbam': {
    title: 'CBAM India: Compliance for Steel and Aluminium Exporters',
    description: 'Your EU buyer pays CBAM on your emissions. Without verified plant data it is the EU default plus a mark-up. Measure, verify and share your real figure.',
  },
  '/carbon-credits-india': {
    title: 'Carbon Credits in India: How to Earn Them, What It Takes',
    description: 'Find your route into India\'s carbon market in three taps: CCTS targets, offset projects, ESCerts or RECs, what each needs, and BEE\'s fees before you earn.',
  },
  '/brsr-reporting': {
    title: 'BRSR Reporting and BRSR Core, Explained in Plain Words',
    description: 'Who must file BRSR, what the nine BRSR Core attributes ask, the 2025 value chain rules, and the bills behind your energy and emissions figures.',
  },
  '/carbon-accounting-software-india': {
    title: 'How to Choose Carbon Accounting Software in India',
    description: 'Weigh what matters, get a checklist of questions for every vendor demo, and score your shortlist: Indian bills, GST invoices, BRSR, CBAM and audit trail.',
  },
  // Software comparison guides (src/data/softwareGuides.ts)
  ...Object.fromEntries(Object.values(GUIDE_META).map(m => [m.path, { title: m.title, description: m.description }])),
  '/net-zero': {
    title: 'Net-Zero Roadmap Builder for MSMEs',
    description: 'Turn an emissions baseline into a sector-specific net-zero roadmap with reduction tasks you can track. Free five-step planner for MSMEs.',
  },
  '/cbam-authorised-declarant': {
    title: 'Authorised CBAM Declarant: What Indian Exporters Send',
    description: 'Who must be the authorised CBAM declarant, by when, how the 50-tonne threshold counts, and the verified plant data an Indian supplier sends the EU declarant.',
  },
  '/cbam-suite': {
    title: 'CBAM Suite: Embedded Emissions Report for Installations',
    description: 'Model your plant, attribute emissions to each CN code, add precursors and electricity, and export the CBAM operator report, verifier pack and buyer summary.',
  },
  '/cbam-suite/supplier-pack': {
    title: 'CBAM Supplier Data Pack for EU Buyers',
    description: 'Build the CBAM data pack your EU buyer asks for: embedded emissions per CN code, the basis for each number, and its verification status.',
  },
  '/cbam-calculator': {
    title: 'Free CBAM Calculator and Cost Estimator, 2026 to 2034',
    description: 'Free CBAM calculator: estimate EU certificate cost per tonne for steel, aluminium, cement, fertiliser and hydrogen imports, year by year from 2026 to 2034.',
  },
  '/climate-intelligence': {
    title: 'Climate Intelligence: CBAM, Scope 3 and BRSR Guides',
    description: 'Guides on carbon accounting, CBAM, Scope 3 supplier data, BRSR and green finance for MSMEs and exporters in India and emerging markets.',
  },
  '/industries': {
    title: 'Carbon Accounting by Industry',
    description: 'Carbon accounting for steel, aluminium, cement, fertilisers, textiles, chemicals, ceramics, paper, food, logistics, construction and auto parts.',
  },
  '/legal': {
    title: 'Legal: Terms, Privacy and Policies',
    description: "Senseible's legal documents: Terms of Service, Privacy Policy, Data Processing Addendum, Service Level Agreement, AI Policy and Refund Policy.",
  },
  '/marketplace': {
    title: 'Carbon Credit Marketplace: MSME Credit Listings',
    description: 'Browse carbon credit listings from MSMEs with provenance details, verification status and evidence links. For buyers who need traceable supply.',
  },
  '/intelligence': {
    title: 'Biocog Intelligence: ESG Intelligence',
    description: 'Ask about Scope 1, 2 and 3, CBAM, ESG reporting and the platform. On Pro and Scale, answers come from your own records with the evidence behind each figure.',
  },
  '/calculators': {
    title: 'Free Carbon Calculators for MSMEs',
    description: 'Free calculators for product carbon footprint, supplier Scope 3 risk, solar savings, freight emissions, carbon pricing and cloud emissions.',
  },
  '/calculators/product-carbon-footprint': {
    title: 'Product Carbon Footprint Calculator (ISO 14067)',
    description: 'Free PCF calculator following ISO 14067 and the GHG Protocol Product Standard. Cradle-to-gate emissions per product unit with a line-by-line breakdown.',
  },
  '/calculators/supplier-emissions-risk': {
    title: 'Supplier Emissions and Scope 3 Risk Calculator',
    description: 'Score supplier emissions and risk for GHG Protocol Scope 3 Category 1 using a hybrid spend and activity method, with a confidence rating per supplier.',
  },
  '/calculators/energy-transition-savings': {
    title: 'Solar ROI Calculator: Payback, IRR and CO2 Saved',
    description: 'Calculate solar, PPA or hybrid savings, payback, IRR, NPV and CO2 avoided over 25 years, using region-specific grid factors and tariffs.',
  },
  '/calculators/logistics-emissions': {
    title: 'Freight Emissions Calculator (GLEC, ISO 14083)',
    description: 'Calculate transport emissions across road, rail, sea and air, aligned with the GLEC Framework and ISO 14083, with load factor and empty-return adjustments.',
  },
  '/calculators/carbon-pricing-impact': {
    title: 'Carbon Pricing Impact Calculator: EU ETS and CBAM',
    description: 'Estimate carbon cost exposure from 2026 to 2034 using EU ETS price scenarios, the CBAM phase-in and free allocation phase-out, with sensitivity ranges.',
  },
  '/calculators/electricity-bill-carbon': {
    title: 'Electricity Bill to CO2 Calculator (India)',
    description: 'Type the kWh units on your electricity bill and get kg CO2 at the CEA grid factor Senseible uses. One bill or twelve months, free.',
  },
  '/calculators/fuel-carbon': {
    title: 'Fuel to CO2 Calculator: Diesel, LPG, CNG, PNG',
    description: 'Convert litres of diesel or petrol, kg of LPG or CNG, scm of PNG, furnace oil or coal into kg CO2, with the factor and the arithmetic shown.',
  },
  '/calculators/cloud-data-centre-emissions': {
    title: 'Cloud and Data Centre Emissions Calculator',
    description: 'Calculate server, cloud and data-centre emissions by region with location-based and market-based Scope 2 figures, using published PUE and grid factors.',
  },
  '/answers': {
    title: 'Answers: Senseible, Carbon Data and CBAM',
    description: 'Straight answers about Senseible: what it does, how to sign in, pricing, CBAM, BRSR, Scope 3, green finance, data protection and what it does not do.',
  },
  // Lead magnet pages (src/data/leadMagnets.ts). Not linked from navigation.
  [SUPPLIER_EVIDENCE_META.path]: { title: SUPPLIER_EVIDENCE_META.title, description: SUPPLIER_EVIDENCE_META.description },
  [MSME_CARBON_META.path]: { title: MSME_CARBON_META.title, description: MSME_CARBON_META.description },
  [ESG_SAMPLE_META.path]: { title: ESG_SAMPLE_META.title, description: ESG_SAMPLE_META.description },
  // Service lead pages (src/data/services).
  ...Object.fromEntries(serviceNav.map(s => [`/${s.slug}`, { title: s.title, description: s.description }])),
};

export function pageMeta(path: string): PageMeta | undefined {
  return STATIC_PAGE_META[canonicalPath(path)];
}

// --- Dynamic route families. Each takes the record from its data file. ---

export function solutionMeta(s: { title: string; regulationLabel: string; sectorLabel: string; countryName: string; painStatement: string }): PageMeta {
  const base = s.title.replace(/\s*[—|-]\s*Senseible\s*$/i, '');
  const short = `${s.regulationLabel}: ${s.sectorLabel}, ${s.countryName}`;
  return {
    title: fitTitle(base.length <= TITLE_MAX ? base : short),
    description: clampDescription(`${s.regulationLabel} for ${s.sectorLabel.toLowerCase()} in ${s.countryName}. ${s.painStatement}`),
  };
}

export function competitorMeta(c: { name: string; slug: string; category: string; description: string }): PageMeta {
  if (c.category === 'disambiguation') {
    return {
      title: fitTitle(`Senseible vs ${c.name}: Not the Same Company`),
      description: clampDescription(`Senseible is a carbon accounting platform at senseible.earth. ${c.description}`),
    };
  }
  const long = `Senseible vs ${c.name}: Carbon Accounting Compared`;
  return {
    title: fitTitle(long.length <= TITLE_MAX ? long : `Senseible vs ${c.name}`),
    description: clampDescription(`How Senseible and ${c.name} compare for MSME carbon accounting, verification and climate finance. ${c.description}`),
  };
}

export function industryMeta(i: { name: string; description: string }): PageMeta {
  return {
    title: fitTitle(`${i.name}: Carbon Accounting Guide`),
    description: clampDescription(`${i.name}: where emissions come from, what buyers ask for, and a worked example with real factors. ${i.description}`),
  };
}

export const INDUSTRIES_HUB_META: PageMeta = STATIC_PAGE_META['/industries'];

export function answerMeta(a: { title: string; short: string }): PageMeta {
  return { title: fitTitle(a.title), description: clampDescription(a.short) };
}

export function legalMeta(doc: { title: string; lastUpdated: string }): PageMeta {
  return {
    title: fitTitle(doc.title),
    description: clampDescription(`Senseible ${doc.title}, last updated ${doc.lastUpdated}. Read how the platform, your data and your rights are governed.`),
  };
}
