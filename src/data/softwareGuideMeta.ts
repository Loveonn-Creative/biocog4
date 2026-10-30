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
    title: 'Best Carbon Accounting Software for 2027',
    description: 'The best carbon accounting software for 2027: 15 tools compared on Scope 2 methods, Scope 3, bill reading, audit trail, factors and CSRD or BRSR outputs.',
    h1: 'Best carbon accounting software for 2027',
  },
  'dmrv': {
    path: '/best-digital-mrv-platforms',
    title: 'Best Digital MRV (dMRV) Platforms, Compared',
    description: 'Digital MRV tools and registry pilots for carbon projects, checked on satellite data, ground truth, registry methods, tamper-evident records, verifier support.',
    h1: 'Digital MRV platforms, compared',
  },
  'supplier-emissions': {
    path: '/best-supplier-emissions-software',
    title: 'Best Scope 3 Supplier Emissions Software for 2027',
    description: 'The best Scope 3 supplier emissions software for 2027: 13 tools compared on what suppliers send, who pays, labelled estimates, hotspots and ERP links.',
    h1: 'Best supplier emissions software for 2027',
  },
  'carbon-compliance': {
    path: '/best-carbon-compliance-software',
    title: 'Best Carbon Compliance Software for 2027',
    description: 'The best carbon compliance software for 2027, compared on CSRD, ISSB, BRSR, India’s CCTS, California SB 253, Scope 1 to 3, audit trail and XBRL.',
    h1: 'Best carbon compliance software for 2027',
  },
  'cbam': {
    path: '/best-cbam-software',
    title: 'Best CBAM Software for 2027, Compared',
    description: 'The best CBAM software for 2027, as certificate sales start in February 2027: 14 tools for EU importers and Indian exporters, from CN codes to certificates.',
    h1: 'Best CBAM software for 2027',
  },
  'brsr': {
    path: '/best-brsr-software',
    title: 'Best BRSR and BRSR Core Software for 2027',
    description: 'The best BRSR and BRSR Core software for 2027: 11 tools compared on the SEBI format, Core evidence, value chain, Indian factors, XBRL and published prices.',
    h1: 'Best BRSR and BRSR Core software for 2027',
  },
  'carbon-credits': {
    path: '/carbon-credit-platforms',
    title: 'Best Carbon Credit Platforms for 2027',
    description: 'The best carbon credit platforms for 2027: registries, exchanges and India’s CCTS compared on serial numbers, buying, public records, fees and small buyers.',
    h1: 'Best carbon credit platforms for 2027',
  },
  'green-loans': {
    path: '/green-loans-msme-india',
    title: 'Best Green Loans for Indian MSMEs in 2027',
    description: 'The best green loans for Indian MSMEs in 2027: SIDBI, IREDA, RBI rules and NBFC lenders compared on what they fund, limits, your share, tenure and papers.',
    h1: 'Best green loans for Indian MSMEs in 2027',
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
