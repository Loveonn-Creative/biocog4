// Hindi pages (/hi/answers/...). Static Hindi written into data files
// (src/data/answerLibraryHi/), never a runtime translation (AGENTS.md:
// runtime translations cannot carry regulatory claims).
//
// HI_PAGES_REVIEWED: true publishes the pages (prerendered, indexed, in the
// sitemap and llms.txt, hreflang en/hi pairs, English pages link to them).
// False makes them noindex app routes the English pages do not link to.
// Owner accepted Claude's review on 24 October 2026; expert review to follow
// (docs/context/senseible.md, section 8).
export const HI_PAGES_REVIEWED = true;

/** English answer pages that have a Hindi edition (top MSME questions). */
export const HI_ANSWER_SLUGS: readonly string[] = [
  'how-to-calculate-carbon-footprint-from-invoices',
  'kvah-electricity-bill-convert-to-kwh-for-emissions',
  'power-factor-rebate-and-penalty',
  'electricity-bill-shows-only-amount-paid',
  'india-grid-emission-factor-2025-26',
  'why-some-sources-say-0-82-for-india-grid',
  'litres-in-a-tonne-of-diesel-india',
  'diesel-kg-to-litres-conversion',
  'diesel-generator-scope-1-or-scope-2',
  'diesel-generator-cost-per-kwh',
  'is-my-dg-set-oversized-wasting-diesel',
  'lpg-19-kg-cylinder-co2',
  'lpg-to-png-switch-emissions-saving',
  'can-gstr-2b-be-used-for-carbon-accounting',
  'can-ai-read-my-electricity-bill-accurately',
  'buyer-asks-for-my-scope-3',
  'brsr-supplier-questionnaire-field-by-field',
  'brsr-value-chain-data-request-msme-supplier',
  'buyer-asked-for-product-carbon-footprint-what-to-send',
  'can-i-report-only-scope-1-and-2',
  'why-did-my-emissions-go-up-this-year',
  'carbon-footprint-financial-or-calendar-year',
  'what-is-an-authorised-cbam-declarant',
  'how-to-calculate-embedded-emissions-steel-cbam',
  'does-cbam-cost-depend-on-invoice-value',
  'does-cbam-count-electricity-emissions-steel',
  'why-eu-importer-rejected-cbam-emissions-data',
  'cbam-default-value-mark-up-by-year',
  'green-loan-interest-rate-lower-or-not',
  'green-loan-principles-explained',
  'green-loan-vfd-on-pumps-and-fans',
  'carbon-baseline-before-green-loan-application',
  'bank-esg-questionnaire-for-msme-loan',
  'bank-rejected-msme-loan-reason',
  'sidbi-4e-loan-terms-and-eligibility',
  'sidbi-green-finance-scheme-loan-terms',
  'psl-renewable-energy-loan-limit-2025',
  'msme-supplier-to-ccts-obligated-plant',
  'adeetie-interest-subvention-rate-msme',
  'adeetie-eligible-clusters-list',
  'adeetie-application-steps',
  'adeetie-technology-list-energy-savings',
  'pm-surya-ghar-subsidy-for-factories-or-shops',
  'pm-surya-ghar-subsidy-per-kw',
  'diesel-pump-to-solar-pump-co2-saving',
  'does-almm-apply-to-factory-rooftop-solar',
  'how-to-hire-an-energy-auditor-msme',
  'carbon-audit-vs-energy-audit-vs-esg-audit',
  'is-my-factory-bee-designated-consumer',
  'is-my-textile-mill-covered-by-ccts',
];

const HI_SET = new Set(HI_ANSWER_SLUGS);
export const hasHindi = (slug: string): boolean => HI_SET.has(slug);
export const hindiPath = (slug: string): string => `/hi/answers/${slug}`;
export const HI_PATHS: string[] = HI_ANSWER_SLUGS.map(hindiPath);

/** hreflang pairs for a Hindi answer page or its English original; empty until reviewed. */
export function hindiHreflangFor(path: string): { hreflang: string; path: string }[] {
  if (!HI_PAGES_REVIEWED) return [];
  const m = path.match(/^\/(?:hi\/)?answers\/([a-z0-9-]+)$/);
  if (!m || !hasHindi(m[1])) return [];
  const en = `/answers/${m[1]}`;
  return [{ hreflang: 'en', path: en }, { hreflang: 'hi', path: hindiPath(m[1]) }, { hreflang: 'x-default', path: en }];
}

export function isUnreviewedHindiPath(path: string): boolean {
  return !HI_PAGES_REVIEWED && (path === '/hi' || path.startsWith('/hi/'));
}
