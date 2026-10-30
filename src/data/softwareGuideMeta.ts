// Titles, descriptions and paths of the software guides, kept apart from the
// guide data so the site-wide SEO metadata can read them without loading it.

export type GuideId =
  | 'carbon-accounting' | 'dmrv' | 'supplier-emissions' | 'carbon-compliance'
  | 'cbam' | 'brsr' | 'carbon-credits' | 'green-loans' | 'tenders';

/** Written but held back until more products are verified: no route, link or SEO entry. */
export const HELD_GUIDES: readonly GuideId[] = ['dmrv', 'tenders'];

export const GUIDE_META: Record<GuideId, { path: string; title: string; description: string; h1: string }> = {
  'carbon-accounting': {
    path: '/best-carbon-accounting-software',
    title: 'Best Carbon Accounting Software, Compared',
    description: 'Fifteen carbon accounting tools checked on Scope 2 methods, Scope 3 coverage, bill reading, audit trail, factors, disclosure outputs and security.',
    h1: 'Carbon accounting software, compared',
  },
  'dmrv': {
    path: '/best-digital-mrv-platforms',
    title: 'Best Digital MRV (dMRV) Platforms, Compared',
    description: 'Digital MRV tools and registry pilots for carbon projects, checked on satellite data, ground truth, registry methods, tamper-evident records, verifier support.',
    h1: 'Digital MRV platforms, compared',
  },
  'supplier-emissions': {
    path: '/best-supplier-emissions-software',
    title: 'Best Scope 3 Supplier Emissions Software, Compared',
    description: 'Thirteen supplier emissions tools checked on what suppliers send, who pays, labelled estimates, hotspots, data quality and ERP links. Pick your supplier base.',
    h1: 'Supplier emissions software, compared',
  },
  'carbon-compliance': {
    path: '/best-carbon-compliance-software',
    title: 'Best Carbon Compliance Software: CSRD, ISSB, BRSR',
    description: 'Compliance tools checked on CSRD, ISSB, BRSR, India’s CCTS, California SB 253, built-in Scope 1 to 3, audit trail and XBRL. Pick the rules you report under.',
    h1: 'Carbon compliance software, compared',
  },
  'cbam': {
    path: '/best-cbam-software',
    title: 'Best CBAM Software for 2027, Compared',
    description: 'CBAM certificate sales start in February 2027. Fourteen CBAM tools for EU importers and non-EU exporters, checked from CN codes and plant data to certificates.',
    h1: 'CBAM software for 2027, compared',
  },
  'brsr': {
    path: '/best-brsr-software',
    title: 'Best BRSR and BRSR Core Software, Compared',
    description: 'BRSR tools checked on the full SEBI format, BRSR Core evidence, value chain data, Indian factors, XBRL, the March 2025 rule changes and published prices.',
    h1: 'BRSR software, compared',
  },
  'carbon-credits': {
    path: '/carbon-credit-platforms',
    title: 'Carbon Credit Platforms: Registries and Exchanges',
    description: 'Carbon credit registries, marketplaces, exchanges and India’s new scheme, checked on serial numbers, buying, public records, labels, fees and small buyers.',
    h1: 'Carbon credit platforms, compared',
  },
  'green-loans': {
    path: '/green-loans-msme-india',
    title: 'Green Loans for MSMEs in India: Lenders Compared',
    description: 'SIDBI, IREDA, RBI rules and NBFC green lenders compared for Indian MSMEs: what each funds, loan limits, your share, who qualifies, tenure and papers asked for.',
    h1: 'Green loans for MSMEs in India, compared',
  },
  'tenders': {
    path: '/sustainability-tender-platforms',
    title: 'Sustainability Tender Platforms: Where to Find Bids',
    description: 'Where to find public tenders that score carbon: the EU’s TED and the UK’s Find a Tender and Contracts Finder, checked on coverage, green fields and data access.',
    h1: 'Sustainability tender platforms, compared',
  },
};

/** Metadata for the guides that are live. */
export const PUBLISHED_GUIDE_META = Object.fromEntries(
  Object.entries(GUIDE_META).filter(([id]) => !HELD_GUIDES.includes(id as GuideId)),
) as Partial<typeof GUIDE_META>;
