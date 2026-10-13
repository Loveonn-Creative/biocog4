// Retired Climate Intelligence URLs and where they now live. Lovable hosting
// cannot send HTTP 301s, so each old URL gets a prerendered page with an
// instant meta refresh and a canonical to the target (treated by search
// engines as a permanent redirect), and the app redirects client-side.
// Never delete an entry: old links and bookmarks keep working through it.
import { trustSafeguards } from './trustSafeguards';

export const articleRedirects: Record<string, string> = {
  // Near-duplicate guides merged into the stronger URL.
  'logistics-scope-1-emissions-india-fleet-measurement': '/climate-intelligence/logistics-scope-1-emissions-india',
  'cbam-cost-calculator-indian-steel-msme-2026': '/climate-intelligence/cbam-compliance-cost-indian-steel-exporters-2026-2034',
  'brsr-reporting-small-manufacturer-preparation': '/climate-intelligence/brsr-reporting-requirements-india',
  'brsr-reporting-msme-india-simplified-guide': '/climate-intelligence/brsr-reporting-requirements-india',
  'export-carbon-reporting-eu-msme-emerging-markets': '/climate-intelligence/eu-cbam-explained-emerging-market-exporters',
  // Renamed to search-led slugs in October 2026 (also 308s in vercel.json).
  'climate-finance-analyst-salary-india-2026': '/climate-intelligence/climate-finance-analyst-salary-india',
  'esg-jobs-bengaluru-2026': '/climate-intelligence/esg-jobs-bangalore',
  'how-karachi-textile-exporters-access-green-loans': '/climate-intelligence/green-loan-textile-business-karachi',
  'how-karachi-textile-exporters-supply-european-markets': '/climate-intelligence/export-textiles-to-europe-from-karachi',
  'green-finance-johannesburg-steel-metals-firms': '/climate-intelligence/green-loan-steel-business-johannesburg',
  'green-finance-dhaka-gazipur-garment-exporters': '/climate-intelligence/green-loan-garment-factory-dhaka',
  'green-finance-ludhiana-raipur-steel-msmes': '/climate-intelligence/green-loan-steel-msme-ludhiana-raipur',
  'green-finance-tamil-nadu-textile-clusters': '/climate-intelligence/green-loan-textile-mill-tamil-nadu',
  'vietnam-steel-exporters-cbam-green-finance': '/climate-intelligence/finance-cbam-compliance-steel-vietnam',
  'turkish-steel-cement-exporters-cbam-green-finance': '/climate-intelligence/green-finance-steel-cement-turkey',
  'green-finance-morbi-ceramic-cluster': '/climate-intelligence/green-loan-ceramic-factory-morbi',
  'green-finance-firozabad-glass-cluster': '/climate-intelligence/finance-glass-furnace-firozabad',
  'green-finance-chattogram-steel-ship-recycling': '/climate-intelligence/green-finance-ship-recycling-chattogram',
  'green-finance-pakistan-cement-makers': '/climate-intelligence/green-loan-cement-plant-pakistan',
  'vietnam-cement-carbon-market-green-finance': '/climate-intelligence/finance-emission-cuts-cement-plant-vietnam',
  'green-finance-turkish-textile-exporters': '/climate-intelligence/green-finance-textile-exporter-turkey',
  'green-finance-south-africa-ferrochrome-smelters': '/climate-intelligence/renewable-power-ferrochrome-smelter-south-africa',
  'how-german-importers-lower-cbam-costs': '/climate-intelligence/lower-cbam-costs-importer-germany',
  'polish-steel-importers-cbam-supplier-data': '/climate-intelligence/cbam-supplier-data-steel-importer-poland',
  'italian-rerollers-cbam-slab-imports': '/climate-intelligence/cbam-cost-imported-steel-slab-italy',
  'green-finance-jalna-steel-rerolling-cluster': '/climate-intelligence/green-loan-steel-rolling-mill-jalna',
  'turkish-aluminium-extruders-cbam': '/climate-intelligence/cbam-cost-aluminium-extrusion-turkey',
  'indian-aluminium-exporters-cbam': '/climate-intelligence/cbam-aluminium-exporter-india',
  'indian-pharma-suppliers-nhs-carbon-reduction-plan': '/climate-intelligence/nhs-carbon-reduction-plan-pharma-india',
  'green-finance-gujarat-chemical-clusters': '/climate-intelligence/green-loan-chemical-plant-gujarat',
  'fertiliser-importers-cbam-germany-poland': '/climate-intelligence/cbam-fertiliser-imports-germany-poland',
  'how-cbam-certificate-price-is-set': '/climate-intelligence/cbam-certificate-price',
  'india-ccts-emission-intensity-targets-sectors': '/climate-intelligence/india-carbon-credit-trading-scheme-targets',
  'adeetie-scheme-explained-msme-energy-efficiency': '/climate-intelligence/adeetie-scheme',
  'financed-emissions-pcaf-indian-banks-nbfcs': '/climate-intelligence/financed-emissions-banks-india',
  'energy-audit-msme-india-how-to-get-one': '/climate-intelligence/energy-audit-for-msme-india',
  'green-energy-open-access-india-factories': '/climate-intelligence/green-energy-open-access-india',
  'cbam-indian-fastener-exporters': '/climate-intelligence/cbam-fastener-exporters-india',
  'south-africa-carbon-tax-cbam-deduction': '/climate-intelligence/south-africa-carbon-tax-cbam',
  // Product-feature pieces folded into /trust.
  ...Object.fromEntries(trustSafeguards.flatMap(s => s.replaces.map(slug => [slug, `/trust#${s.id}`]))),
};
