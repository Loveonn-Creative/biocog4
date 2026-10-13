// Full Climate Intelligence articles, with bodies. Used at build time
// (prerender, sitemap, SEO gate), in tests and by the admin page. Public pages
// use ./articleIndex.ts and load one body at a time through ./articleBody.ts.
import { articleIndex, type CMSArticleMeta } from './articleIndex';
import b0 from './articleBodies/how-to-trace-emission-data-to-source';
import b1 from './articleBodies/maintain-historical-carbon-data-methodology-changes';
import b2 from './articleBodies/ghg-gases-warming-impact-beyond-co2';
import b3 from './articleBodies/methane-black-carbon-reductions-vs-co2';
import b4 from './articleBodies/emissions-data-hidden-in-semi-finished-imports';
import b5 from './articleBodies/reroute-supply-chains-reduce-cbam-exposure';
import b6 from './articleBodies/manufacturing-scope-1-emissions-india';
import b7 from './articleBodies/manufacturing-scope-2-emissions-india';
import b8 from './articleBodies/manufacturing-scope-3-emissions-india';
import b9 from './articleBodies/cbam-compliance-indian-exporters';
import b10 from './articleBodies/agriculture-scope-1-emissions-india';
import b11 from './articleBodies/logistics-scope-1-emissions-india';
import b12 from './articleBodies/carbon-credit-types-voluntary-markets';
import b13 from './articleBodies/brsr-reporting-requirements-india';
import b14 from './articleBodies/emission-factors-selection-guidance';
import b15 from './articleBodies/what-is-carbon-mrv-and-why-msmes-need-it-2026';
import b16 from './articleBodies/how-to-get-green-loans-india-carbon-data';
import b17 from './articleBodies/eu-cbam-explained-emerging-market-exporters';
import b18 from './articleBodies/scope-1-2-3-emissions-simple-guide-small-business';
import b19 from './articleBodies/what-is-senseible-different-from-sensibull';
import b20 from './articleBodies/how-to-calculate-carbon-footprint-electricity-bills';
import b21 from './articleBodies/brazil-cbio-india-ccts-comparing-carbon-markets';
import b22 from './articleBodies/green-finance-textile-exporters-step-by-step';
import b23 from './articleBodies/documents-needed-carbon-verification';
import b24 from './articleBodies/carbon-credits-solar-installations-monetize';
import b25 from './articleBodies/steel-aluminum-exporters-cbam-compliance-checklist';
import b26 from './articleBodies/136-billion-india-eu-fta-msme-breakthrough';
import b27 from './articleBodies/survival-of-the-greenest-cbam-litmus-test';
import b28 from './articleBodies/trading-air-for-assets-india-carbon-markets-eu-price';
import b29 from './articleBodies/mother-of-all-deals-india-eu-msmes';
import b30 from './articleBodies/great-diversification-india-eu-strategic-shield-tariff-wars';
import b31 from './articleBodies/cbam-compliance-cost-indian-steel-exporters-2026-2034';
import b32 from './articleBodies/philippine-manufacturing-sme-carbon-reporting-2026';
import b33 from './articleBodies/scope-3-calculator-bangladesh-textile-exporters';
import b34 from './articleBodies/eu-carbon-border-tax-indonesian-chemical-exports';
import b35 from './articleBodies/green-loan-eligibility-pakistani-small-businesses';
import b36 from './articleBodies/carbon-audit-checklist-singapore-manufacturing';
import b37 from './articleBodies/vietnamese-exporters-prepare-eu-cbam-90-days';
import b38 from './articleBodies/thailand-food-processing-carbon-footprint-reduction';
import b39 from './articleBodies/msme-carbon-credits-sri-lanka-invoice-to-revenue';
import b40 from './articleBodies/malaysia-palm-oil-scope-1-2-3-emission-breakdown';
import b41 from './articleBodies/how-to-file-eu-carbon-tax-report-msme-guide';
import b42 from './articleBodies/carbon-audit-small-business-india-complete-guide';
import b43 from './articleBodies/scope-3-emissions-supply-chain-msme-calculator';
import b44 from './articleBodies/indonesia-manufacturing-scope-2-electricity-emissions';
import b45 from './articleBodies/india-textile-exporters-cbam-eu-compliance-2026';
import b46 from './articleBodies/bangladesh-manufacturing-green-finance-access-guide';
import b47 from './articleBodies/philippines-food-processing-carbon-measurement-guide';
import b48 from './articleBodies/vietnam-textile-carbon-footprint-eu-buyers';
import b49 from './articleBodies/thailand-automotive-supply-chain-carbon-measurement';
import b50 from './articleBodies/india-chemical-industry-cbam-exposure-analysis';
import b51 from './articleBodies/pakistan-textile-scope-3-emissions-eu-buyers';
import b52 from './articleBodies/iso-14067-vs-ghg-protocol-product-standard-explained';
import b53 from './articleBodies/cbam-default-values-vs-actual-emissions-msme-decision-guide';
import b54 from './articleBodies/scope-2-market-based-vs-location-based-msme-guide';
import b55 from './articleBodies/biogenic-carbon-accounting-food-textile-msme';
import b56 from './articleBodies/msme-internal-carbon-price-implementation-guide';
import b57 from './articleBodies/glec-framework-explained-msme-freight-emissions';
import b58 from './articleBodies/green-hydrogen-msme-cost-economics-2026';
import b59 from './articleBodies/msme-net-zero-roadmap-12-months-no-consultants';
import b60 from './articleBodies/epa-mandatory-greenhouse-gas-reporting-msme-india';
import b61 from './articleBodies/csrd-double-materiality-assessment-msme-supplier';
import b62 from './articleBodies/tamil-nadu-msme-decarbonisation-state-incentives';
import b63 from './articleBodies/bangladesh-rmg-exporters-eu-cbam-csddd-2026';
import b64 from './articleBodies/indonesia-pertamina-rspo-palm-oil-carbon-2026';
import b65 from './articleBodies/vietnam-electronics-supply-chain-scope-3-2026';
import b66 from './articleBodies/philippines-bpo-renewable-energy-net-zero-2030';
import b67 from './articleBodies/thailand-ev-supply-chain-msme-2026';
import b68 from './articleBodies/msme-water-carbon-nexus-textile-leather';
import b69 from './articleBodies/msme-cold-chain-refrigerant-leak-carbon-2026';
import b70 from './articleBodies/msme-aluminium-recycling-scope-3-savings';
import b71 from './articleBodies/msme-data-quality-tier-1-vs-tier-2-emission-factors';
import b72 from './articleBodies/msme-circular-economy-iso-59020-reporting';
import b73 from './articleBodies/msme-sbti-fln-near-term-target-validation';
import b74 from './articleBodies/msme-voice-search-carbon-faqs-2026';
import b75 from './articleBodies/msme-greenwashing-self-audit-checklist-2026';
import b76 from './articleBodies/msme-climate-finance-instruments-comparison-2026';
import b77 from './articleBodies/carbon-accounting-frequency-msme-when-to-measure';
import b78 from './articleBodies/diy-vs-consultant-carbon-accounting-msme-decision-framework';
import b79 from './articleBodies/carbon-credit-pricing-explained-vcm-compliance-2026';
import b80 from './articleBodies/carbon-offsets-vs-carbon-credits-difference-explained';
import b81 from './articleBodies/mrv-vs-traditional-audit-carbon-verification-compared';
import b82 from './articleBodies/climate-risk-vs-esg-difference-financial-institutions';
import b83 from './articleBodies/transition-finance-vs-green-finance-borrower-guide';
import b84 from './articleBodies/spend-based-vs-activity-based-scope-3-method-choice';
import b85 from './articleBodies/supplier-emissions-data-collection-playbook-msme';
import b86 from './articleBodies/audit-grade-carbon-data-what-it-actually-means';
import b87 from './articleBodies/realistic-income-from-selling-carbon-credits-msme';
import b88 from './articleBodies/how-to-vet-a-legitimate-carbon-credit-platform';
import b89 from './articleBodies/mrv-vs-esg-reporting-where-they-overlap-and-differ';
import b90 from './articleBodies/how-to-choose-an-mrv-provider-msme-checklist';
import b91 from './articleBodies/green-loan-vs-traditional-loan-real-cost-comparison';
import b92 from './articleBodies/green-loan-rejection-reasons-and-how-to-fix-them';
import b93 from './articleBodies/carbon-careers-salary-roles-india-asia-2026';
import b94 from './articleBodies/real-world-asset-tokenisation-explained-for-msme-finance';
import b95 from './articleBodies/physical-vs-transition-climate-risk-financial-institutions';
import b96 from './articleBodies/esg-readiness-assessment-msme-step-by-step-2026';
import b97 from './articleBodies/algorithmic-bias-credit-decisions-borrower-rights-2026';
import b98 from './articleBodies/scope-3-data-quality-tiers-software-buyer-guide-2026';
import b99 from './articleBodies/climate-finance-analyst-salary-india';
import b100 from './articleBodies/esg-jobs-bangalore';
import b101 from './articleBodies/green-loan-textile-business-karachi';
import b102 from './articleBodies/export-textiles-to-europe-from-karachi';
import b103 from './articleBodies/green-loan-steel-business-johannesburg';
import b104 from './articleBodies/green-loan-garment-factory-dhaka';
import b105 from './articleBodies/green-loan-steel-msme-ludhiana-raipur';
import b106 from './articleBodies/green-loan-textile-mill-tamil-nadu';
import b107 from './articleBodies/finance-cbam-compliance-steel-vietnam';
import b108 from './articleBodies/green-finance-steel-cement-turkey';
import b109 from './articleBodies/green-loan-ceramic-factory-morbi';
import b110 from './articleBodies/finance-glass-furnace-firozabad';
import b111 from './articleBodies/green-finance-ship-recycling-chattogram';
import b112 from './articleBodies/green-loan-cement-plant-pakistan';
import b113 from './articleBodies/finance-emission-cuts-cement-plant-vietnam';
import b114 from './articleBodies/green-finance-textile-exporter-turkey';
import b115 from './articleBodies/renewable-power-ferrochrome-smelter-south-africa';
import b116 from './articleBodies/lower-cbam-costs-importer-germany';
import b117 from './articleBodies/cbam-supplier-data-steel-importer-poland';
import b118 from './articleBodies/cbam-cost-imported-steel-slab-italy';
import b119 from './articleBodies/green-loan-steel-rolling-mill-jalna';
import b120 from './articleBodies/cbam-cost-aluminium-extrusion-turkey';
import b121 from './articleBodies/cbam-aluminium-exporter-india';
import b122 from './articleBodies/nhs-carbon-reduction-plan-pharma-india';
import b123 from './articleBodies/green-loan-chemical-plant-gujarat';
import b124 from './articleBodies/cbam-fertiliser-imports-germany-poland';
import b125 from './articleBodies/cbam-certificate-price';
import b126 from './articleBodies/india-carbon-credit-trading-scheme-targets';
import b127 from './articleBodies/adeetie-scheme';
import b128 from './articleBodies/financed-emissions-banks-india';
import b129 from './articleBodies/energy-audit-for-msme-india';
import b130 from './articleBodies/green-energy-open-access-india';
import b131 from './articleBodies/cbam-fastener-exporters-india';
import b132 from './articleBodies/south-africa-carbon-tax-cbam';
import b133 from './articleBodies/green-loan-foundry-kolhapur';
import b134 from './articleBodies/rbi-green-deposits-what-banks-finance';
import b135 from './articleBodies/rooftop-solar-loan-factory-bangladesh';
import b136 from './articleBodies/rooftop-solar-net-metering-pakistan-factories';
import b137 from './articleBodies/solar-loan-for-msme-india';
import b138 from './articleBodies/green-finance-textile-recycling-panipat';
import b139 from './articleBodies/germany-supply-chain-act-lksg-indian-suppliers';
import b140 from './articleBodies/cbam-verification-non-eu-producer';
import b141 from './articleBodies/cbam-support-for-indian-msmes';
import b142 from './articleBodies/cbam-50-tonne-exemption';
import b143 from './articleBodies/become-cbam-authorised-declarant';
import b144 from './articleBodies/turkey-emissions-trading-system';
import b145 from './articleBodies/vietnam-grid-emission-factor';
import b146 from './articleBodies/eu-steel-import-quota-2026';
import b147 from './articleBodies/cbam-downstream-products-2028';
import b148 from './articleBodies/eu-forced-labour-regulation-suppliers';
import b149 from './articleBodies/digital-product-passport-textile-exporters';
import b150 from './articleBodies/wheeling-renewable-power-south-africa-factories';
import b151 from './articleBodies/pakistan-green-taxonomy';
import b152 from './articleBodies/vietnam-green-taxonomy-decision-21';

export { cmsCategories } from './articleIndex';

export interface CMSArticle extends Omit<CMSArticleMeta, 'excerpt'> {
  excerpt?: string;
  content: string;
}

const BODIES: Record<string, string> = {
  'how-to-trace-emission-data-to-source': b0,
  'maintain-historical-carbon-data-methodology-changes': b1,
  'ghg-gases-warming-impact-beyond-co2': b2,
  'methane-black-carbon-reductions-vs-co2': b3,
  'emissions-data-hidden-in-semi-finished-imports': b4,
  'reroute-supply-chains-reduce-cbam-exposure': b5,
  'manufacturing-scope-1-emissions-india': b6,
  'manufacturing-scope-2-emissions-india': b7,
  'manufacturing-scope-3-emissions-india': b8,
  'cbam-compliance-indian-exporters': b9,
  'agriculture-scope-1-emissions-india': b10,
  'logistics-scope-1-emissions-india': b11,
  'carbon-credit-types-voluntary-markets': b12,
  'brsr-reporting-requirements-india': b13,
  'emission-factors-selection-guidance': b14,
  'what-is-carbon-mrv-and-why-msmes-need-it-2026': b15,
  'how-to-get-green-loans-india-carbon-data': b16,
  'eu-cbam-explained-emerging-market-exporters': b17,
  'scope-1-2-3-emissions-simple-guide-small-business': b18,
  'what-is-senseible-different-from-sensibull': b19,
  'how-to-calculate-carbon-footprint-electricity-bills': b20,
  'brazil-cbio-india-ccts-comparing-carbon-markets': b21,
  'green-finance-textile-exporters-step-by-step': b22,
  'documents-needed-carbon-verification': b23,
  'carbon-credits-solar-installations-monetize': b24,
  'steel-aluminum-exporters-cbam-compliance-checklist': b25,
  '136-billion-india-eu-fta-msme-breakthrough': b26,
  'survival-of-the-greenest-cbam-litmus-test': b27,
  'trading-air-for-assets-india-carbon-markets-eu-price': b28,
  'mother-of-all-deals-india-eu-msmes': b29,
  'great-diversification-india-eu-strategic-shield-tariff-wars': b30,
  'cbam-compliance-cost-indian-steel-exporters-2026-2034': b31,
  'philippine-manufacturing-sme-carbon-reporting-2026': b32,
  'scope-3-calculator-bangladesh-textile-exporters': b33,
  'eu-carbon-border-tax-indonesian-chemical-exports': b34,
  'green-loan-eligibility-pakistani-small-businesses': b35,
  'carbon-audit-checklist-singapore-manufacturing': b36,
  'vietnamese-exporters-prepare-eu-cbam-90-days': b37,
  'thailand-food-processing-carbon-footprint-reduction': b38,
  'msme-carbon-credits-sri-lanka-invoice-to-revenue': b39,
  'malaysia-palm-oil-scope-1-2-3-emission-breakdown': b40,
  'how-to-file-eu-carbon-tax-report-msme-guide': b41,
  'carbon-audit-small-business-india-complete-guide': b42,
  'scope-3-emissions-supply-chain-msme-calculator': b43,
  'indonesia-manufacturing-scope-2-electricity-emissions': b44,
  'india-textile-exporters-cbam-eu-compliance-2026': b45,
  'bangladesh-manufacturing-green-finance-access-guide': b46,
  'philippines-food-processing-carbon-measurement-guide': b47,
  'vietnam-textile-carbon-footprint-eu-buyers': b48,
  'thailand-automotive-supply-chain-carbon-measurement': b49,
  'india-chemical-industry-cbam-exposure-analysis': b50,
  'pakistan-textile-scope-3-emissions-eu-buyers': b51,
  'iso-14067-vs-ghg-protocol-product-standard-explained': b52,
  'cbam-default-values-vs-actual-emissions-msme-decision-guide': b53,
  'scope-2-market-based-vs-location-based-msme-guide': b54,
  'biogenic-carbon-accounting-food-textile-msme': b55,
  'msme-internal-carbon-price-implementation-guide': b56,
  'glec-framework-explained-msme-freight-emissions': b57,
  'green-hydrogen-msme-cost-economics-2026': b58,
  'msme-net-zero-roadmap-12-months-no-consultants': b59,
  'epa-mandatory-greenhouse-gas-reporting-msme-india': b60,
  'csrd-double-materiality-assessment-msme-supplier': b61,
  'tamil-nadu-msme-decarbonisation-state-incentives': b62,
  'bangladesh-rmg-exporters-eu-cbam-csddd-2026': b63,
  'indonesia-pertamina-rspo-palm-oil-carbon-2026': b64,
  'vietnam-electronics-supply-chain-scope-3-2026': b65,
  'philippines-bpo-renewable-energy-net-zero-2030': b66,
  'thailand-ev-supply-chain-msme-2026': b67,
  'msme-water-carbon-nexus-textile-leather': b68,
  'msme-cold-chain-refrigerant-leak-carbon-2026': b69,
  'msme-aluminium-recycling-scope-3-savings': b70,
  'msme-data-quality-tier-1-vs-tier-2-emission-factors': b71,
  'msme-circular-economy-iso-59020-reporting': b72,
  'msme-sbti-fln-near-term-target-validation': b73,
  'msme-voice-search-carbon-faqs-2026': b74,
  'msme-greenwashing-self-audit-checklist-2026': b75,
  'msme-climate-finance-instruments-comparison-2026': b76,
  'carbon-accounting-frequency-msme-when-to-measure': b77,
  'diy-vs-consultant-carbon-accounting-msme-decision-framework': b78,
  'carbon-credit-pricing-explained-vcm-compliance-2026': b79,
  'carbon-offsets-vs-carbon-credits-difference-explained': b80,
  'mrv-vs-traditional-audit-carbon-verification-compared': b81,
  'climate-risk-vs-esg-difference-financial-institutions': b82,
  'transition-finance-vs-green-finance-borrower-guide': b83,
  'spend-based-vs-activity-based-scope-3-method-choice': b84,
  'supplier-emissions-data-collection-playbook-msme': b85,
  'audit-grade-carbon-data-what-it-actually-means': b86,
  'realistic-income-from-selling-carbon-credits-msme': b87,
  'how-to-vet-a-legitimate-carbon-credit-platform': b88,
  'mrv-vs-esg-reporting-where-they-overlap-and-differ': b89,
  'how-to-choose-an-mrv-provider-msme-checklist': b90,
  'green-loan-vs-traditional-loan-real-cost-comparison': b91,
  'green-loan-rejection-reasons-and-how-to-fix-them': b92,
  'carbon-careers-salary-roles-india-asia-2026': b93,
  'real-world-asset-tokenisation-explained-for-msme-finance': b94,
  'physical-vs-transition-climate-risk-financial-institutions': b95,
  'esg-readiness-assessment-msme-step-by-step-2026': b96,
  'algorithmic-bias-credit-decisions-borrower-rights-2026': b97,
  'scope-3-data-quality-tiers-software-buyer-guide-2026': b98,
  'climate-finance-analyst-salary-india': b99,
  'esg-jobs-bangalore': b100,
  'green-loan-textile-business-karachi': b101,
  'export-textiles-to-europe-from-karachi': b102,
  'green-loan-steel-business-johannesburg': b103,
  'green-loan-garment-factory-dhaka': b104,
  'green-loan-steel-msme-ludhiana-raipur': b105,
  'green-loan-textile-mill-tamil-nadu': b106,
  'finance-cbam-compliance-steel-vietnam': b107,
  'green-finance-steel-cement-turkey': b108,
  'green-loan-ceramic-factory-morbi': b109,
  'finance-glass-furnace-firozabad': b110,
  'green-finance-ship-recycling-chattogram': b111,
  'green-loan-cement-plant-pakistan': b112,
  'finance-emission-cuts-cement-plant-vietnam': b113,
  'green-finance-textile-exporter-turkey': b114,
  'renewable-power-ferrochrome-smelter-south-africa': b115,
  'lower-cbam-costs-importer-germany': b116,
  'cbam-supplier-data-steel-importer-poland': b117,
  'cbam-cost-imported-steel-slab-italy': b118,
  'green-loan-steel-rolling-mill-jalna': b119,
  'cbam-cost-aluminium-extrusion-turkey': b120,
  'cbam-aluminium-exporter-india': b121,
  'nhs-carbon-reduction-plan-pharma-india': b122,
  'green-loan-chemical-plant-gujarat': b123,
  'cbam-fertiliser-imports-germany-poland': b124,
  'cbam-certificate-price': b125,
  'india-carbon-credit-trading-scheme-targets': b126,
  'adeetie-scheme': b127,
  'financed-emissions-banks-india': b128,
  'energy-audit-for-msme-india': b129,
  'green-energy-open-access-india': b130,
  'cbam-fastener-exporters-india': b131,
  'south-africa-carbon-tax-cbam': b132,
  'green-loan-foundry-kolhapur': b133,
  'rbi-green-deposits-what-banks-finance': b134,
  'rooftop-solar-loan-factory-bangladesh': b135,
  'rooftop-solar-net-metering-pakistan-factories': b136,
  'solar-loan-for-msme-india': b137,
  'green-finance-textile-recycling-panipat': b138,
  'germany-supply-chain-act-lksg-indian-suppliers': b139,
  'cbam-verification-non-eu-producer': b140,
  'cbam-support-for-indian-msmes': b141,
  'cbam-50-tonne-exemption': b142,
  'become-cbam-authorised-declarant': b143,
  'turkey-emissions-trading-system': b144,
  'vietnam-grid-emission-factor': b145,
  'eu-steel-import-quota-2026': b146,
  'cbam-downstream-products-2028': b147,
  'eu-forced-labour-regulation-suppliers': b148,
  'digital-product-passport-textile-exporters': b149,
  'wheeling-renewable-power-south-africa-factories': b150,
  'pakistan-green-taxonomy': b151,
  'vietnam-green-taxonomy-decision-21': b152,
};

export const cmsArticles: CMSArticle[] = articleIndex.map(a => ({ ...a, content: BODIES[a.slug] }));

// Get featured articles for landing page
export const getFeaturedArticles = (limit: number = 15): CMSArticle[] => {
  return cmsArticles
    .filter(article => article.featured)
    .slice(0, limit);
};

// Get article by slug
export const getArticleBySlug = (slug: string): CMSArticle | undefined => {
  return cmsArticles.find(article => article.slug === slug);
};

// Get articles by category
export const getArticlesByCategory = (category: string): CMSArticle[] => {
  return cmsArticles.filter(article => article.category === category);
};

// Search articles
export const searchArticles = (query: string): CMSArticle[] => {
  const lowerQuery = query.toLowerCase();
  return cmsArticles.filter(article => 
    article.title.toLowerCase().includes(lowerQuery) ||
    article.subtitle.toLowerCase().includes(lowerQuery) ||
    article.content.toLowerCase().includes(lowerQuery) ||
    article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

// Get related articles
export const getRelatedArticles = (articleId: string, limit: number = 3): CMSArticle[] => {
  const article = cmsArticles.find(a => a.id === articleId);
  if (!article) return [];
  
  return cmsArticles
    .filter(a => a.id !== articleId && a.category === article.category)
    .slice(0, limit);
};
