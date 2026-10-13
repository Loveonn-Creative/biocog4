// One definition of Senseible as an entity, shared by the prerendered pages
// and the client. Every page refers to it by @id, so search and answer
// engines join articles, calculators and the home page to one organisation
// and do not confuse it with the word "sensible" or with Sensibull.
//
// Values come from the site itself: profiles are the ones linked in the
// footer (src/components/Footer.tsx), the address is the one on /contact.
// Add Crunchbase and Wikidata URLs to sameAs once those profiles exist.
import { SITE_URL } from './seoMeta';

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const ORG_SAME_AS = [
  'https://www.linkedin.com/company/senseible/',
  'https://x.com/senseible_earth',
  'https://www.instagram.com/senseible.earth/',
  'https://www.facebook.com/senseible',
];

export const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Senseible',
  alternateName: ['Senseible Earth', 'senseible.earth'],
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png`, width: 512, height: 512 },
  description: 'Carbon MRV and climate finance platform that turns MSME invoices, electricity bills and fuel records into verified Scope 1, 2 and 3 emission records for lenders, buyers and EU CBAM requests.',
  disambiguatingDescription: 'Senseible (senseible.earth) is a carbon MRV and climate finance platform for MSMEs and exporters. Not to be confused with the word sensible or with Sensibull, an options trading platform.',
  knowsAbout: ['Carbon MRV', 'Carbon accounting', 'Scope 1, 2 and 3 emissions', 'EU CBAM', 'Green finance', 'Carbon credits'],
  email: 'impact@senseible.earth',
  contactPoint: { '@type': 'ContactPoint', email: 'impact@senseible.earth', contactType: 'customer service' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Minarch Tower, Sector 44',
    addressLocality: 'Gurugram',
    addressRegion: 'Haryana',
    postalCode: '122003',
    addressCountry: 'IN',
  },
  sameAs: ORG_SAME_AS,
};

/** Refer to Senseible from any other node (publisher, author, provider). */
export const ORG_REF = { '@type': 'Organization', '@id': ORG_ID, name: 'Senseible', url: SITE_URL };

export const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: 'Senseible',
  alternateName: 'senseible.earth',
  url: SITE_URL,
  inLanguage: 'en',
  publisher: { '@id': ORG_ID },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/climate-intelligence?search={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

// About and Contact describe Senseible itself, so they point at the one entity.
const ENTITY_PAGES: Record<string, { type: 'AboutPage' | 'ContactPage'; name: string }> = {
  '/about': { type: 'AboutPage', name: 'About Senseible' },
  '/contact': { type: 'ContactPage', name: 'Contact Senseible' },
};

/**
 * The entity nodes a path carries. Used by the prerender and by RouteSEO on
 * the client, so the markup survives hydration (Helmet replaces prerendered
 * tags) and crawlers that run JavaScript see the same nodes.
 */
export function entityJsonLd(path: string): Record<string, unknown>[] {
  if (path === '/') return [ORGANIZATION, WEBSITE];
  const page = ENTITY_PAGES[path];
  if (!page) return [];
  const url = `${SITE_URL}${path}`;
  return [{ '@context': 'https://schema.org', '@type': page.type, '@id': `${url}#webpage`, url, name: page.name, isPartOf: { '@id': WEBSITE_ID }, mainEntity: { '@id': ORG_ID } }];
}
