// Climate Intelligence article index: everything except the article bodies,
// so the hub and article pages do not download all 150+ bodies. Bodies are in
// ./articleBodies/<slug>.ts, loaded on demand by ./articleBody.ts; the full
// list with bodies (build, tests, admin) is ./cmsContent.ts.

export interface CMSArticleMeta {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  /** Plain-text opening of the article, for cards and search (no markdown). */
  excerpt: string;
  tags: string[];
  category: string;
  createdAt: string;
  /** Last substantive revision (YYYY-MM-DD). Drives "Updated" and sitemap lastmod. */
  updatedAt?: string;
  featured?: boolean;
}

// Helper to create slug from title
const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
};

// Categories for organizing content
export const cmsCategories = [
  { id: 'data-traceability', name: 'Data Traceability & Verification', icon: 'FileCheck' },
  { id: 'carbon-standards', name: 'Carbon Accounting Standards', icon: 'Scale' },
  { id: 'multi-gas', name: 'Multi-Gas Climate Accounting', icon: 'Cloud' },
  { id: 'supply-chain', name: 'Supply Chain Emissions', icon: 'Truck' },
  { id: 'regulations', name: 'Carbon Regulations', icon: 'Landmark' },
  { id: 'manufacturing', name: 'Manufacturing Emissions', icon: 'Factory' },
  { id: 'agriculture', name: 'Agriculture Emissions', icon: 'Leaf' },
  { id: 'logistics', name: 'Logistics & Transport', icon: 'Navigation' },
  { id: 'regional', name: 'Regional Guidelines', icon: 'Globe' },
  { id: 'careers', name: 'Climate Careers', icon: 'Briefcase' },
  { id: 'green-finance', name: 'Green Finance', icon: 'Landmark' },
];

export const articleIndex: CMSArticleMeta[] = [
  {
    id: '1',
    slug: 'how-to-trace-emission-data-to-source',
    title: 'How can we trace every emission number back to raw sensor or invoice data?',
    subtitle: 'Data Traceability & Verification',
    excerpt: "Traceability requires a structured data management system that logs every emission calculation to its source document or measurement. Start by establishing a data hierarchy: raw inputs like fuel…",

    tags: ['data traceability', 'emission verification', 'audit trail', 'GHG accounting', 'ISO 14064'],
    category: 'data-traceability',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '2',
    slug: 'maintain-historical-carbon-data-methodology-changes',
    title: 'How do we maintain historical carbon data when methodologies change?',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "Maintain parallel datasets rather than overwriting historical records. When a methodology changes, such as an update to GHG Protocol guidance or new emission factors published by national…",

    tags: ['methodology changes', 'historical data', 'GHG Protocol', 'data versioning', 'TCFD'],
    category: 'carbon-standards',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '3',
    slug: 'ghg-gases-warming-impact-beyond-co2',
    title: 'What is GHG-6 and how do we calculate warming impact beyond CO2?',
    subtitle: 'Multi-Gas Climate Accounting',
    excerpt: "There is no standard called GHG-6 in climate science or carbon accounting frameworks. You may be referring to the six greenhouse gases covered under the Kyoto Protocol and tracked in corporate…",

    tags: ['GHG gases', 'Global Warming Potential', 'CO2 equivalent', 'IPCC', 'Kyoto Protocol'],
    category: 'multi-gas',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '4',
    slug: 'methane-black-carbon-reductions-vs-co2',
    title: 'Do methane and black carbon reductions count differently from CO2?',
    subtitle: 'Short-Lived Climate Pollutants',
    excerpt: "Yes, they count differently in impact and in most accounting frameworks. Methane is a recognized greenhouse gas under the GHG Protocol and is converted to CO2 equivalent using its Global Warming…",

    tags: ['methane', 'black carbon', 'short-lived pollutants', 'GWP', 'climate impact'],
    category: 'multi-gas',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '5',
    slug: 'emissions-data-hidden-in-semi-finished-imports',
    title: 'What emissions data is hidden inside semi-finished imports?',
    subtitle: 'Embodied Carbon in Supply Chain',
    excerpt: "Semi-finished goods like steel billets, aluminum ingots, chemical intermediates, or pre-fabricated components carry embodied emissions from upstream production processes that are not visible on the…",

    tags: ['embodied carbon', 'Scope 3', 'supply chain emissions', 'CBAM', 'semi-finished goods'],
    category: 'supply-chain',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '6',
    slug: 'reroute-supply-chains-reduce-cbam-exposure',
    title: 'Can we reroute supply chains to reduce CBAM exposure legally?',
    subtitle: 'Carbon Border Adjustment Mechanism',
    excerpt: "Yes, rerouting supply chains to reduce CBAM exposure is legal, but the mechanism is designed to prevent simple circumvention. CBAM applies to certain goods imported into the EU based on their…",

    tags: ['CBAM', 'supply chain optimization', 'EU carbon border tax', 'carbon compliance', 'trade regulations'],
    category: 'regulations',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '7',
    slug: 'manufacturing-scope-1-emissions-india',
    title: 'How do Manufacturing firms calculate Scope 1 emissions in India?',
    subtitle: 'Manufacturing Scope 1 Calculation in India',
    excerpt: "Manufacturing firms calculate Scope 1 emissions, which are direct emissions from owned or controlled sources, by identifying and quantifying fuel combustion in furnaces, boilers, generators, company…",

    tags: ['Scope 1', 'manufacturing', 'India', 'GHG accounting', 'emission calculation'],
    category: 'manufacturing',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '8',
    slug: 'manufacturing-scope-2-emissions-india',
    title: 'How do Manufacturing firms calculate Scope 2 emissions in India?',
    subtitle: 'Manufacturing Scope 2 Calculation in India',
    excerpt: "Manufacturing firms calculate Scope 2 emissions, which are indirect emissions from purchased electricity, heat, or steam, by identifying and quantifying purchased electricity for production…",

    tags: ['Scope 2', 'manufacturing', 'India', 'GHG accounting', 'emission calculation'],
    category: 'manufacturing',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '9',
    slug: 'manufacturing-scope-3-emissions-india',
    title: 'How do Manufacturing firms calculate Scope 3 emissions in India?',
    subtitle: 'Manufacturing Scope 3 Calculation in India',
    excerpt: "Manufacturing firms calculate Scope 3 emissions, which are all other indirect emissions in the value chain, by identifying and quantifying raw material extraction and production, supplier emissions,…",

    tags: ['Scope 3', 'manufacturing', 'India', 'GHG accounting', 'value chain emissions'],
    category: 'manufacturing',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '10',
    slug: 'cbam-compliance-indian-exporters',
    title: 'CBAM for Indian Exporters: What Changed on 1 January 2026',
    subtitle: 'CBAM Readiness for Indian Businesses',
    excerpt: "From 1 January 2026, EU buyers of Indian steel, aluminium, cement, fertilisers and hydrogen owe CBAM certificates on the embedded emissions. The buyer pays, but needs your plant's verified emissions…",

    tags: ['CBAM India', 'Indian exporters', 'steel', 'aluminium', 'fertilisers', 'CCTS'],
    category: 'regulations',
    createdAt: '2025-01-01',
    updatedAt: '2026-10-11',
    featured: true
  },
  {
    id: '11',
    slug: 'agriculture-scope-1-emissions-india',
    title: 'How do Agriculture firms calculate Scope 1 emissions in India?',
    subtitle: 'Agriculture Scope 1 Calculation in India',
    excerpt: "Agriculture firms calculate Scope 1 emissions, which are direct emissions from owned or controlled sources, by identifying and quantifying fuel in tractors and equipment, enteric fermentation from…",

    tags: ['Scope 1', 'agriculture', 'India', 'GHG accounting', 'farm emissions'],
    category: 'agriculture',
    createdAt: '2025-01-01'
  },
  {
    id: '12',
    slug: 'logistics-scope-1-emissions-india',
    title: 'Fleet and Logistics Scope 1 Emissions in India: How to Measure From Fuel Invoices',
    subtitle: 'Logistics Scope 1 Calculation in India',
    excerpt: "A fleet's Scope 1 emissions are the fuel its own vehicles burn. Multiply litres of diesel from fuel invoices by an emission factor of about 2.645 kgCO2 per litre: a truck using 3,000 litres a month…",

    tags: ['logistics', 'Scope 1', 'fleet', 'diesel', 'India', 'GLEC'],
    category: 'logistics',
    createdAt: '2025-01-01',
    updatedAt: '2026-10-11'
  },
  {
    id: '13',
    slug: 'carbon-credit-types-voluntary-markets',
    title: 'What are the different types of carbon credits in voluntary markets?',
    subtitle: 'Understanding Voluntary Carbon Markets',
    excerpt: "Voluntary carbon markets offer several types of credits based on the project methodology and verification standard. By Project Type: 1. Renewable Energy: Wind, solar, hydro projects displacing fossil…",

    tags: ['carbon credits', 'voluntary markets', 'Verra', 'Gold Standard', 'offset types'],
    category: 'carbon-standards',
    createdAt: '2025-01-01'
  },
  {
    id: '14',
    slug: 'brsr-reporting-requirements-india',
    title: 'BRSR Reporting Requirements in India: Who Reports, BRSR Core and Value-Chain Rules',
    subtitle: 'Business Responsibility and Sustainability Reporting',
    excerpt: "SEBI requires the top 1,000 listed companies by market capitalisation to file a Business Responsibility and Sustainability Report (BRSR) every year. Under SEBI's circular of 28 March 2025, BRSR Core…",

    tags: ['BRSR', 'BRSR Core', 'SEBI', 'value chain', 'India', 'MSME suppliers'],
    category: 'regulations',
    createdAt: '2025-01-01',
    updatedAt: '2026-10-11'
  },
  {
    id: '15',
    slug: 'emission-factors-selection-guidance',
    title: 'How do we select the right emission factors for our calculations?',
    subtitle: 'Emission Factor Selection Guide',
    excerpt: "Emission factor selection directly impacts the accuracy and credibility of your GHG inventory. Follow this hierarchy for choosing factors. Hierarchy of Data Quality: 1. Supplier-specific: Direct…",

    tags: ['emission factors', 'data quality', 'GHG inventory', 'calculation accuracy', 'databases'],
    category: 'carbon-standards',
    createdAt: '2025-01-01'
  },
  {
    id: '16',
    slug: 'what-is-carbon-mrv-and-why-msmes-need-it-2026',
    title: 'What is Carbon MRV and Why MSMEs Need It in 2026?',
    subtitle: 'Understanding Measurement, Reporting, and Verification',
    excerpt: "Carbon MRV stands for Measurement, Reporting, and Verification: the three-step process that transforms raw business data into credible climate claims. For MSMEs in India and emerging markets, MRV is…",

    tags: ['carbon MRV', 'MSME', '2026 compliance', 'CBAM', 'climate reporting', 'senseible'],
    category: 'regulations',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '17',
    slug: 'how-to-get-green-loans-india-carbon-data',
    title: 'How to Get Green Loans in India Using Carbon Data',
    subtitle: 'Unlocking Preferential Financing for MSMEs',
    excerpt: "Banks in India are increasingly offering green loans with lower interest rates for businesses that can demonstrate sustainability. The key? Verified carbon data. For green bonds,…",

    tags: ['green loans', 'India', 'RBI', 'sustainable finance', 'MSME financing', 'carbon data'],
    category: 'regulations',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '18',
    slug: 'eu-cbam-explained-emerging-market-exporters',
    title: 'EU CBAM Explained: What Exporters in Emerging Markets Need to Know in 2026',
    subtitle: 'Carbon Border Adjustment Mechanism Guide',
    excerpt: "Since 1 January 2026, EU importers of steel, aluminium, cement, fertilisers, hydrogen and electricity owe CBAM certificates on the emissions embedded in those goods. The importer pays, not the…",

    tags: ['CBAM', 'EU CBAM', 'exporters', 'embedded emissions', 'authorised declarant', '2026'],
    category: 'regulations',
    createdAt: '2025-01-15',
    updatedAt: '2026-10-11',
    featured: true
  },
  {
    id: '19',
    slug: 'scope-1-2-3-emissions-simple-guide-small-business',
    title: 'Scope 1 vs Scope 2 vs Scope 3: A Simple Guide for Small Businesses',
    subtitle: 'Understanding GHG Protocol Scopes',
    excerpt: "Every carbon footprint calculation starts with understanding the three scopes. Here's what they mean for your small business. If you want the inventory built for you from bills and invoices, see…",

    tags: ['Scope 1', 'Scope 2', 'Scope 3', 'GHG Protocol', 'small business', 'carbon footprint'],
    category: 'carbon-standards',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '20',
    slug: 'what-is-senseible-different-from-sensibull',
    title: 'What is Senseible and How is It Different from Sensibull?',
    subtitle: 'Brand Disambiguation: Climate MRV vs Options Trading',
    excerpt: "Senseible and Sensibull are completely different companies in unrelated industries. Here's the distinction. Senseible (senseible.earth): - Climate technology platform for carbon MRV - Helps MSMEs…",

    tags: ['senseible', 'sensibull', 'brand disambiguation', 'carbon MRV', 'options trading', 'FAQ'],
    category: 'data-traceability',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '21',
    slug: 'how-to-calculate-carbon-footprint-electricity-bills',
    title: 'How to Calculate a Carbon Footprint From Electricity Bills (With a Worked Example)',
    subtitle: 'Step-by-Step Scope 2 Calculation',
    excerpt: "To turn an electricity bill into emissions, multiply the kWh billed by your country's grid emission factor. In India, the Central Electricity Authority's CO2 Baseline Database v22.0 gives 0.675 tCO2…",

    tags: ['Scope 2', 'electricity', 'grid emission factor', 'India', 'CEA', 'carbon footprint'],
    category: 'manufacturing',
    createdAt: '2025-01-15',
    updatedAt: '2026-10-11',
    featured: true
  },
  {
    id: '22',
    slug: 'brazil-cbio-india-ccts-comparing-carbon-markets',
    title: 'Brazil CBIO vs India CCTS: Comparing Carbon Markets',
    subtitle: 'Emerging Market Carbon Trading Schemes',
    excerpt: "Brazil's CBIO and India's CCTS represent two different approaches to carbon markets in emerging economies. Understanding both helps MSMEs position for global trade. India's CCTS (Carbon Credit…",

    tags: ['CBIO', 'CCTS', 'Brazil', 'India', 'carbon markets', 'emerging markets', 'carbon trading'],
    category: 'regulations',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '23',
    slug: 'green-finance-textile-exporters-step-by-step',
    title: 'Green Finance for Textile Exporters: Step by Step Guide',
    subtitle: 'Unlocking Climate Finance for Textile MSMEs',
    excerpt: "India's textile sector is a major exporter, with significant exposure to EU sustainability requirements. Here's how textile MSMEs can access green finance. Why Textiles Face Pressure: - EU Strategy…",

    tags: ['textiles', 'green finance', 'exports', 'India', 'sustainable textiles', 'MSME financing'],
    category: 'manufacturing',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '24',
    slug: 'documents-needed-carbon-verification',
    title: 'What Documents Do I Need for Carbon Verification?',
    subtitle: 'Complete Checklist for MRV',
    excerpt: "Carbon verification requires evidence. Here's exactly what documents you need to calculate and verify your emissions. Scope 1 Documents (Direct Emissions): - Fuel purchase invoices (diesel, petrol,…",

    tags: ['carbon verification', 'documents', 'MRV checklist', 'evidence', 'carbon accounting'],
    category: 'data-traceability',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '26',
    slug: 'carbon-credits-solar-installations-monetize',
    title: 'Carbon Credits for Solar Installations: How to Monetize',
    subtitle: 'Turning Solar Power into Revenue',
    excerpt: "Solar installations reduce grid electricity consumption, which means fewer emissions. These reductions can potentially be monetized as carbon credits. How Solar Creates Carbon Value: Every kWh of…",

    tags: ['solar', 'carbon credits', 'renewable energy', 'monetization', 'rooftop solar', 'India'],
    category: 'carbon-standards',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '27',
    slug: 'steel-aluminum-exporters-cbam-compliance-checklist',
    title: 'Steel and Aluminum Exporters: CBAM Compliance Checklist',
    subtitle: 'EU Carbon Border Adjustment Readiness',
    excerpt: "Steel and aluminum are priority sectors under EU CBAM. If you export to Europe, compliance preparation must start now. Why Steel and Aluminum First: - High carbon intensity, especially for…",

    tags: ['steel', 'aluminum', 'CBAM', 'exports', 'EU compliance', 'carbon intensity', 'checklist'],
    category: 'regulations',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '28',
    slug: '136-billion-india-eu-fta-msme-breakthrough',
    title: 'The $136 Billion Breakthrough: How the India-EU FTA Just Rewrote the Rulebook for Indian MSMEs',
    subtitle: 'India-EU Free Trade Agreement Impact Analysis',
    excerpt: "The India-EU FTA negotiations are reshaping trade access for Indian exporters. Here's what MSMEs need to understand. The Scale: - EU is one of India's largest trading partners - $136 billion in…",

    tags: ['India-EU FTA', 'trade agreement', 'exports', 'MSME', 'sustainability', 'trade policy'],
    category: 'regulations',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '29',
    slug: 'survival-of-the-greenest-cbam-litmus-test',
    title: 'Survival of the Greenest: Why the EUs Carbon Tax (CBAM) is the Ultimate Litmus Test for Indian Industry',
    subtitle: 'CBAM as Competitive Filter',
    excerpt: "CBAM isn't just a tax; it's a filter that will separate competitive exporters from obsolete ones. Here's the reality. The Selection Pressure: CBAM certificates are priced off the EU ETS carbon price,…",

    tags: ['CBAM', 'competition', 'survival', 'Indian industry', 'carbon tax', 'exports', 'steel'],
    category: 'regulations',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '30',
    slug: 'trading-air-for-assets-india-carbon-markets-eu-price',
    title: 'Trading Air for Assets: Can Indias New Carbon Markets Shield Exporters from Europes Carbon Price?',
    subtitle: 'India CCTS vs EU ETS Price Dynamics',
    excerpt: "India's CCTS creates a domestic carbon market. Can it protect exporters from EU's much higher carbon prices? The Price Gap: - EU ETS: a market price set by the EU's cap-and-trade system - India CCTS:…",

    tags: ['CCTS', 'EU ETS', 'carbon pricing', 'CBAM', 'carbon markets', 'India', 'exports'],
    category: 'regulations',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '31',
    slug: 'mother-of-all-deals-india-eu-msmes',
    title: 'The "Mother of All Deals" & MSMEs in India',
    subtitle: 'India-EU FTA Impact on Small Business',
    excerpt: "The India-EU FTA has been called \"the mother of all deals\" for Indian trade. What does it mean for MSMEs? The Stakes: - EU is one of the world's largest economies - 450 million consumers - Strict…",

    tags: ['India-EU FTA', 'MSME', 'trade', 'sustainability', 'market access', 'small business'],
    category: 'regulations',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '32',
    slug: 'great-diversification-india-eu-strategic-shield-tariff-wars',
    title: 'The Great Diversification: Why the India-EU Pact is New Delhis Strategic Shield Against Global Tariff Wars',
    subtitle: 'Trade Diversification and Sustainability',
    excerpt: "In an era of trade wars and protectionism, the India-EU FTA represents strategic diversification. Sustainability is the entry ticket. The Geopolitical Context: - US-China tensions disrupting supply…",

    tags: ['diversification', 'India-EU', 'tariff wars', 'trade strategy', 'sustainability', 'geopolitics'],
    category: 'regulations',
    createdAt: '2025-01-15',
    featured: true
  },
  {
    id: '48',
    slug: 'cbam-compliance-cost-indian-steel-exporters-2026-2034',
    title: 'CBAM Cost for Indian Steel Exporters: 2026 to 2034, Year by Year',
    subtitle: 'Carbon Regulations',
    excerpt: "For 1,000 tonnes of Indian blast-furnace steel at 2.1 tCO2 per tonne, the estimated CBAM cost to the EU importer is about €63,000 in 2026 with verified data, rising to about €173,000 in 2034, at the…",

    tags: ['CBAM cost', 'steel', 'India', 'BF-BOF', 'EAF', 'CBAM calculator'],
    category: 'regulations',
    createdAt: '2026-04-10',
    updatedAt: '2026-10-11',
    featured: true
  },
  {
    id: '49',
    slug: 'philippine-manufacturing-sme-carbon-reporting-2026',
    title: 'How Philippine Manufacturing SMEs Can Start Carbon Reporting in 2026',
    subtitle: 'Regional Guidelines',
    excerpt: "The Philippines Department of Trade and Industry (DTI) is progressively aligning with international ESG disclosure requirements. SEC Memorandum Circular No. 4 (2019) already mandates sustainability…",

    tags: ['Philippines', 'carbon reporting', 'SME', 'DTI', 'manufacturing', 'SEC-ESG'],
    category: 'regional',
    createdAt: '2026-04-09'
  },
  {
    id: '50',
    slug: 'scope-3-calculator-bangladesh-textile-exporters',
    title: 'Scope 3 for Bangladesh Textile Exporters: What EU Buyers Need and How to Calculate It',
    subtitle: 'Supply Chain Emissions',
    excerpt: "For an EU fashion brand, your factory's Scope 1 and 2 emissions are part of its Scope 3, Category 1 (purchased goods). Bangladesh shipped US$19.71 billion of garments to the EU in FY 2024-25, about…",

    tags: ['Scope 3', 'Bangladesh', 'RMG', 'textiles', 'EU buyers', 'VSME'],
    category: 'supply-chain',
    createdAt: '2026-04-08',
    updatedAt: '2026-10-11'
  },
  {
    id: '51',
    slug: 'eu-carbon-border-tax-indonesian-chemical-exports',
    title: 'EU Carbon Border Tax Impact on Indonesian Chemical Exports',
    subtitle: 'Carbon Regulations',
    excerpt: "Indonesia exports chemicals and fertilizers to the EU. Under CBAM, hydrogen and ammonia (as a fertiliser) are covered goods, while organic chemicals are not; since the definitive period began on 1…",

    tags: ['Indonesia', 'CBAM', 'chemical', 'EU carbon tax', 'OJK', 'PROPER'],
    category: 'regulations',
    createdAt: '2026-04-07'
  },
  {
    id: '52',
    slug: 'green-loan-eligibility-pakistani-small-businesses',
    title: 'Green Loan Eligibility for Pakistani Small Businesses: What Banks Need',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "State Bank of Pakistan (SBP) Green Banking Guidelines encourage banks to expand lending to green projects. For SMEs, this can mean access to preferential financing for businesses with verified…",

    tags: ['Pakistan', 'green loan', 'SBP', 'small business', 'SECP', 'green finance'],
    category: 'carbon-standards',
    createdAt: '2026-04-06'
  },
  {
    id: '53',
    slug: 'carbon-audit-checklist-singapore-manufacturing',
    title: 'Carbon Audit Checklist for Singapore Manufacturing Companies',
    subtitle: 'Data Traceability & Verification',
    excerpt: "Singapore Carbon Tax Act imposes SGD 25 per tonne on facilities emitting more than 25,000 tCO2e annually, rising to SGD 45 by 2026 and potentially SGD 80 by 2030. Even SMEs below the threshold…",

    tags: ['Singapore', 'carbon audit', 'manufacturing', 'Carbon Tax Act', 'SGX', 'NEA'],
    category: 'data-traceability',
    createdAt: '2026-04-05'
  },
  {
    id: '54',
    slug: 'vietnamese-exporters-prepare-eu-cbam-90-days',
    title: 'CBAM for Vietnamese Steel Exporters: A 90-Day Readiness Plan',
    subtitle: 'Carbon Regulations',
    excerpt: "Vietnamese steel and aluminium exporters to the EU now supply buyers who owe CBAM certificates on every tonne of embedded emissions above the free-allocation adjustment, from 1 January 2026. In 90…",

    tags: ['CBAM Vietnam', 'Vietnamese exporters', 'steel', 'aluminium', 'readiness plan'],
    category: 'regulations',
    createdAt: '2026-04-04',
    updatedAt: '2026-10-11'
  },
  {
    id: '55',
    slug: 'thailand-food-processing-carbon-footprint-reduction',
    title: 'Thailand Food Processing Sector: Carbon Footprint Reduction Guide',
    subtitle: 'Manufacturing Emissions',
    excerpt: "Thailand is the world largest exporter of canned tuna and a significant processed food supplier to Europe, Japan, and the US. TGO Carbon Footprint for Organization (CFO) certification is increasingly…",

    tags: ['Thailand', 'food processing', 'carbon footprint', 'TGO', 'refrigeration', 'reduction'],
    category: 'manufacturing',
    createdAt: '2026-04-03'
  },
  {
    id: '56',
    slug: 'msme-carbon-credits-sri-lanka-invoice-to-revenue',
    title: 'MSME Carbon Credits in Sri Lanka: From Invoice to Revenue',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "Sri Lankan MSMEs in apparel, tea processing, and rubber manufacturing can monetize verified emission reductions as carbon credits. Credit prices in the voluntary carbon market vary widely by…",

    tags: ['Sri Lanka', 'carbon credits', 'MSME', 'CEA', 'apparel', 'monetization'],
    category: 'carbon-standards',
    createdAt: '2026-04-02'
  },
  {
    id: '57',
    slug: 'malaysia-palm-oil-scope-1-2-3-emission-breakdown',
    title: 'Malaysia Palm Oil Sector: Scope 1, 2, 3 Emission Breakdown',
    subtitle: 'Manufacturing Emissions',
    excerpt: "Malaysia is the world second-largest palm oil producer. RSPO and MSPO certification increasingly require carbon accounting. EU Deforestation Regulation (EUDR) adds urgency. Scope 1: Methane from palm…",

    tags: ['Malaysia', 'palm oil', 'Scope 1 2 3', 'RSPO', 'EUDR', 'Bursa ESG'],
    category: 'manufacturing',
    createdAt: '2026-04-01'
  },
  {
    id: '58',
    slug: 'how-to-file-eu-carbon-tax-report-msme-guide',
    title: 'How the CBAM Declaration Works, and What Exporters Must Provide',
    subtitle: 'Carbon Regulations',
    excerpt: "Exporters do not file CBAM declarations. The EU importer, as an authorised CBAM declarant, files one annual declaration by 30 September for the previous year's imports; the first, for 2026, is due by…",

    tags: ['CBAM declaration', 'authorised declarant', 'CBAM Registry', 'exporters', 'reporting'],
    category: 'regulations',
    createdAt: '2026-03-30',
    updatedAt: '2026-10-11'
  },
  {
    id: '60',
    slug: 'carbon-audit-small-business-india-complete-guide',
    title: 'Carbon Audit for Small Business India: Complete 2026 Guide',
    subtitle: 'Data Traceability & Verification',
    excerpt: "BRSR requirements are expanding beyond top-1000 listed companies. Supply chain pressure means Indian MSMEs must prepare for carbon audits even before regulatory mandate. A carbon audit typically…",

    tags: ['carbon audit', 'small business', 'India', 'BRSR', 'GSTIN', 'MSME'],
    category: 'data-traceability',
    createdAt: '2026-03-26'
  },
  {
    id: '61',
    slug: 'scope-3-emissions-supply-chain-msme-calculator',
    title: 'Scope 3 Emissions in Your Supply Chain: MSME Calculator Guide',
    subtitle: 'Supply Chain Emissions',
    excerpt: "Scope 3 emissions are often the largest part of a company's total carbon footprint but are the hardest to measure. GHG Protocol Scope 3 categories most relevant to MSMEs: Category 1 (Purchased Goods…",

    tags: ['Scope 3', 'supply chain', 'MSME', 'GHG Protocol', 'calculator', 'CSDDD'],
    category: 'supply-chain',
    createdAt: '2026-03-24'
  },
  {
    id: '63',
    slug: 'indonesia-manufacturing-scope-2-electricity-emissions',
    title: 'Indonesia Manufacturing: Scope 2 Electricity Emissions Calculator',
    subtitle: 'Regional Guidelines',
    excerpt: "Indonesia's grid relies heavily on coal, so its grid emission factor is relatively high. For manufacturers in Bekasi, Cikarang, and Surabaya industrial zones, Scope 2 is calculated as annual kWh ×…",

    tags: ['Indonesia', 'Scope 2', 'manufacturing', 'PLN', 'OJK', 'electricity emissions'],
    category: 'regional',
    createdAt: '2026-03-20'
  },
  {
    id: '64',
    slug: 'india-textile-exporters-cbam-eu-compliance-2026',
    title: 'Indian Textile Exporters and EU Rules in 2026: CBAM Does Not Apply, Buyers Still Ask',
    subtitle: 'Carbon Regulations',
    excerpt: "Textiles and garments are not covered by EU CBAM. What does reach Indian textile exporters in 2026 is buyer demand: large EU brands reporting under CSRD need supplier emissions data, and since…",

    tags: ['textiles', 'India', 'CSRD', 'VSME', 'CCTS', 'EU buyers', 'Scope 3'],
    category: 'regulations',
    createdAt: '2026-03-18',
    updatedAt: '2026-10-11'
  },
  {
    id: '65',
    slug: 'bangladesh-manufacturing-green-finance-access-guide',
    title: 'Bangladesh Manufacturing: How to Access Green Finance with Carbon Data',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "Bangladesh Bank green refinance schemes offer concessional rates for eligible green projects. IFC and ADB green credit lines through local banks provide additional low-cost capital. Typical…",

    tags: ['Bangladesh', 'green finance', 'manufacturing', 'Bangladesh Bank', 'BRAC', 'SME lending'],
    category: 'carbon-standards',
    createdAt: '2026-03-16'
  },
  {
    id: '67',
    slug: 'philippines-food-processing-carbon-measurement-guide',
    title: 'Philippines Food Processing: Carbon Measurement Guide for Exporters',
    subtitle: 'Manufacturing Emissions',
    excerpt: "The Philippines is a major food processing hub exporting canned goods, coconut products, and processed seafood. Use the latest official Philippines grid emission factor. Key emission sources:…",

    tags: ['Philippines', 'food processing', 'carbon measurement', 'DTI', 'canned goods', 'exporter'],
    category: 'manufacturing',
    createdAt: '2026-03-12'
  },
  {
    id: '69',
    slug: 'vietnam-textile-carbon-footprint-eu-buyers',
    title: 'Vietnam Textile Factories: Carbon Footprint Data EU Buyers Ask For',
    subtitle: 'Supply Chain Emissions',
    excerpt: "Vietnam's textile and garment exports reached an estimated US$46 billion in 2025 (VITAS), and EU brands reporting under CSRD now need each supplier's facility emissions. A Vietnamese factory can…",

    tags: ['Vietnam', 'textiles', 'garments', 'carbon footprint', 'EU buyers', 'Scope 2'],
    category: 'supply-chain',
    createdAt: '2026-03-08',
    updatedAt: '2026-10-11'
  },
  {
    id: '70',
    slug: 'thailand-automotive-supply-chain-carbon-measurement',
    title: 'Thailand Automotive Supply Chain: Carbon Measurement for OEM Compliance',
    subtitle: 'Manufacturing Emissions',
    excerpt: "Thailand is the largest automotive producer in Southeast Asia. Japanese and European OEMs increasingly ask Thai tier-1 and tier-2 suppliers for emission data for their Scope 3 inventories. Use the…",

    tags: ['Thailand', 'automotive', 'supply chain', 'OEM', 'TGO', 'carbon measurement'],
    category: 'manufacturing',
    createdAt: '2026-03-06'
  },
  {
    id: '71',
    slug: 'india-chemical-industry-cbam-exposure-analysis',
    title: 'CBAM for Indian Chemicals and Fertilisers: Which Products Are Covered',
    subtitle: 'Carbon Regulations',
    excerpt: "CBAM covers only a few chemical products: ammonia (CN 2814), nitric acid (2808 00 00), potassium nitrates (2834 21 00), nitrogen fertilisers (3102), most mixed fertilisers (3105, except 3105 60 00)…",

    tags: ['CBAM', 'fertilisers', 'ammonia', 'hydrogen', 'nitric acid', 'India'],
    category: 'regulations',
    createdAt: '2026-03-04',
    updatedAt: '2026-10-11'
  },
  {
    id: '72',
    slug: 'pakistan-textile-scope-3-emissions-eu-buyers',
    title: 'Pakistan Textile Industry: Scope 3 Emissions Data for EU Market Access',
    subtitle: 'Supply Chain Emissions',
    excerpt: "Pakistan is a major cotton producer and textile exporter. EU GSP+ status requires effective implementation of international conventions, including on the environment and climate. Use the latest…",

    tags: ['Pakistan', 'textile', 'Scope 3', 'EU buyers', 'GSP+', 'Faisalabad'],
    category: 'supply-chain',
    createdAt: '2026-03-02'
  },
  {
    id: '73',
    slug: 'iso-14067-vs-ghg-protocol-product-standard-explained',
    title: 'ISO 14067 vs GHG Protocol Product Standard: A Practical Comparison for MSME Exporters',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "Most MSMEs hear \"product carbon footprint\" and assume one global rulebook exists. There are two, and they disagree on subtle but expensive details. ISO 14067:2018 defines how to quantify a product…",

    tags: ['ISO 14067', 'GHG Protocol', 'PCF', 'product carbon footprint', 'CBAM', 'EU exports'],
    category: 'carbon-standards',
    createdAt: '2026-05-06',
    featured: true
  },
  {
    id: '74',
    slug: 'cbam-default-values-vs-actual-emissions-msme-decision-guide',
    title: 'CBAM Default Values vs Actual Emissions: When Verified Data Pays Off',
    subtitle: 'Carbon Regulations',
    excerpt: "In 2026, an EU importer can declare CBAM goods using EU default values or the producer's verified actual emissions. Default values come from Implementing Regulation (EU) 2025/2621 and carry a mark-up…",

    tags: ['CBAM default values', 'actual emissions', 'verification', 'mark-up', '2025/2621'],
    category: 'regulations',
    createdAt: '2026-05-06',
    updatedAt: '2026-10-11',
    featured: true
  },
  {
    id: '75',
    slug: 'scope-2-market-based-vs-location-based-msme-guide',
    title: 'Market-Based vs Location-Based Scope 2: Which Number Do You Report?',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "Scope 2 looks deceptively simple (\"electricity emissions\") until you discover the GHG Protocol requires you to report two different numbers. Multiply your kWh consumed by the average grid emission…",

    tags: ['Scope 2', 'market based', 'location based', 'RECs', 'PPA', 'GHG Protocol'],
    category: 'carbon-standards',
    createdAt: '2026-05-06'
  },
  {
    id: '76',
    slug: 'biogenic-carbon-accounting-food-textile-msme',
    title: 'Biogenic Carbon Accounting for Food and Textile MSMEs: The Honest Guide',
    subtitle: 'Multi-Gas Climate Accounting',
    excerpt: "Biogenic CO2 is the carbon released when biological material (wood, cotton, sugarcane bagasse, food waste) decomposes or burns. Whether it counts as \"zero\" depends on accounting rules, not chemistry.…",

    tags: ['biogenic carbon', 'food MSME', 'textile', 'cotton', 'rice husk', 'CSRD'],
    category: 'multi-gas',
    createdAt: '2026-05-06'
  },
  {
    id: '77',
    slug: 'msme-internal-carbon-price-implementation-guide',
    title: 'Setting an Internal Carbon Price: A Step-by-Step Guide for MSMEs',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "An internal carbon price (ICP) is a self-imposed cost per tonne of CO2e that MSMEs apply to investment decisions. It is a practical management tool to make decarbonisation pay before regulation…",

    tags: ['internal carbon price', 'shadow price', 'capex', 'MSME governance', 'SBTi'],
    category: 'carbon-standards',
    createdAt: '2026-05-06'
  },
  {
    id: '78',
    slug: 'glec-framework-explained-msme-freight-emissions',
    title: 'The GLEC Framework Explained: Freight Emissions Without the Jargon',
    subtitle: 'Logistics & Transport',
    excerpt: "The Global Logistics Emissions Council (GLEC) Framework v3.0 is the de-facto standard for logistics carbon accounting. It is also the basis of ISO 14083:2023. Emissions per shipment = activity ×…",

    tags: ['GLEC', 'ISO 14083', 'freight', 'logistics', 'tonne-kilometres', 'Scope 3'],
    category: 'logistics',
    createdAt: '2026-05-06'
  },
  {
    id: '79',
    slug: 'green-hydrogen-msme-cost-economics-2026',
    title: 'Green Hydrogen for MSMEs: When Does It Actually Pay in 2026?',
    subtitle: 'Manufacturing Emissions',
    excerpt: "Green hydrogen will not save every MSME in 2026. It will save specific ones in specific sectors with specific electricity contracts. This article tells you which. - High-temperature process heat…",

    tags: ['green hydrogen', 'SIGHT scheme', 'electrolyser', 'industrial heat', 'India', 'manufacturing'],
    category: 'manufacturing',
    createdAt: '2026-05-06'
  },
  {
    id: '80',
    slug: 'msme-net-zero-roadmap-12-months-no-consultants',
    title: 'A 12-Month Net-Zero Roadmap for MSMEs With No Sustainability Team',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "Many MSME net-zero strategies stall because they are written by consultants who leave after the report. This roadmap assumes you have one operations person with two hours per week. For targets,…",

    tags: ['net zero', 'roadmap', 'MSME', 'SBTi', 'baseline', '12 months'],
    category: 'carbon-standards',
    createdAt: '2026-05-06',
    featured: true
  },
  {
    id: '81',
    slug: 'epa-mandatory-greenhouse-gas-reporting-msme-india',
    title: 'EPA-Style Mandatory GHG Reporting Is Coming to India: What MSMEs Should Do Now',
    subtitle: 'Regional Guidelines',
    excerpt: "India's Carbon Credit Trading Scheme (CCTS) compliance mechanism sets greenhouse gas emission-intensity targets for obligated entities in energy-intensive sectors, with targets notified sector by…",

    tags: ['CCTS', 'India', 'mandatory reporting', 'BEE', 'CBAM offset', 'compliance'],
    category: 'regulations',
    createdAt: '2026-05-06'
  },
  {
    id: '82',
    slug: 'csrd-double-materiality-assessment-msme-supplier',
    title: 'CSRD Double Materiality: What an MSME Supplier to a CSRD Company Must Provide',
    subtitle: 'Carbon Regulations',
    excerpt: "As an MSME supplier you are almost certainly not directly in scope of CSRD, which applies to large companies (and was narrowed further by the EU's Omnibus simplification). You are still in its reach…",

    tags: ['CSRD', 'double materiality', 'supplier questionnaire', 'EU', 'Scope 3', 'transition plan'],
    category: 'regulations',
    createdAt: '2026-05-06'
  },
  {
    id: '83',
    slug: 'tamil-nadu-msme-decarbonisation-state-incentives',
    title: 'Tamil Nadu MSME Decarbonisation: State Incentives, Grid, and Quick Wins',
    subtitle: 'Regional Guidelines',
    excerpt: "Tamil Nadu hosts a large share of India's MSMEs and a large share of its wind and solar capacity, and state incentives can stack with central schemes. CEA publishes a single national grid emission…",

    tags: ['Tamil Nadu', 'Tirupur', 'Coimbatore', 'TANGEDCO', 'rooftop solar', 'state incentive'],
    category: 'regional',
    createdAt: '2026-05-06'
  },
  {
    id: '84',
    slug: 'bangladesh-rmg-exporters-eu-cbam-csddd-2026',
    title: 'Bangladesh Garment Exporters: Surviving EU CBAM and CSDDD Together in 2026',
    subtitle: 'Regional Guidelines',
    excerpt: "Bangladesh's ready-made garment (RMG) industry faces two EU rules: CBAM (carbon at the border) and CSDDD (due diligence on environment and human rights). Most factories prepare for one and miss the…",

    tags: ['Bangladesh', 'RMG', 'CSDDD', 'CBAM', 'cotton', 'IFC PaCT', 'Gazipur'],
    category: 'regional',
    createdAt: '2026-05-06'
  },
  {
    id: '85',
    slug: 'indonesia-pertamina-rspo-palm-oil-carbon-2026',
    title: 'Indonesian Palm Oil MSMEs: RSPO + ISPO + EUDR Carbon Compliance in 2026',
    subtitle: 'Regional Guidelines',
    excerpt: "Indonesia is the world's largest palm oil producer. The EU Deforestation Regulation (EUDR), RSPO, and Indonesia's mandatory ISPO converge on small mills and out-growers in 2026. - Land use change at…",

    tags: ['Indonesia', 'palm oil', 'RSPO', 'ISPO', 'EUDR', 'POME methane'],
    category: 'regional',
    createdAt: '2026-05-06'
  },
  {
    id: '86',
    slug: 'vietnam-electronics-supply-chain-scope-3-2026',
    title: 'Vietnam Electronics Supply Chain: Scope 3 Demands From Apple, Samsung, Intel',
    subtitle: 'Supply Chain Emissions',
    excerpt: "Vietnam is a major electronics exporter. Apple, Samsung, Intel and other OEMs have set climate targets that reach into their supply chains, and Vietnamese tier 2 and tier 3 suppliers are next. Each…",

    tags: ['Vietnam', 'electronics', 'Apple', 'Samsung', 'DPPA', 'I-REC', 'Scope 3'],
    category: 'regional',
    createdAt: '2026-05-06'
  },
  {
    id: '87',
    slug: 'philippines-bpo-renewable-energy-net-zero-2030',
    title: 'Philippines BPO and IT-BPM: Net-Zero by 2030 Without Losing Margin',
    subtitle: 'Regional Guidelines',
    excerpt: "The Philippine BPO sector is one of the country's largest employers. US and EU clients increasingly ask about net-zero alignment. Most BPOs operate from leased office space: a distinctive constraint.…",

    tags: ['Philippines', 'BPO', 'IT-BPM', 'GEOP', 'leased office', 'net zero', 'Cebu'],
    category: 'regional',
    createdAt: '2026-05-06'
  },
  {
    id: '88',
    slug: 'thailand-ev-supply-chain-msme-2026',
    title: 'Thailand EV Supply Chain: MSME Decarbonisation for the BOI 30@30 Policy',
    subtitle: 'Regional Guidelines',
    excerpt: "Thailand's 30@30 policy targets 30% of vehicle production to be EVs by 2030. Several global automakers have committed EV manufacturing investment in Thailand. MSME suppliers face new carbon and…",

    tags: ['Thailand', 'EV', '30@30', 'BOI', 'battery passport', 'EGAT', 'PEA'],
    category: 'regional',
    createdAt: '2026-05-06'
  },
  {
    id: '89',
    slug: 'msme-water-carbon-nexus-textile-leather',
    title: 'The Water-Carbon Nexus for Textile and Leather MSMEs: Why You Cannot Solve One Alone',
    subtitle: 'Manufacturing Emissions',
    excerpt: "Textile dyeing and leather tanning are among India's most water-intensive industries and major Scope 1+2 emitters. Most decarbonisation plans ignore water. That is a mistake. Every litre of process…",

    tags: ['water', 'textile', 'leather', 'ZDHC', 'Tirupur', 'ZLD', 'cold pad batch'],
    category: 'manufacturing',
    createdAt: '2026-05-06'
  },
  {
    id: '90',
    slug: 'msme-cold-chain-refrigerant-leak-carbon-2026',
    title: 'Cold Chain MSMEs: Refrigerant Leakage Can Dominate Your Carbon Footprint',
    subtitle: 'Multi-Gas Climate Accounting',
    excerpt: "Suppose an ice-cream MSME with 30 cold rooms reports Scope 1 from its diesel gensets only. Once refrigerant leakage is included, the true Scope 1 figure can be several times higher. The IPCC default…",

    tags: ['cold chain', 'refrigerant', 'GWP', 'F-gas', 'Kigali', 'R-404A', 'R-744'],
    category: 'multi-gas',
    createdAt: '2026-05-06'
  },
  {
    id: '91',
    slug: 'msme-aluminium-recycling-scope-3-savings',
    title: 'Recycled Aluminium for MSMEs: How Secondary Metal Cuts Scope 3 Emissions',
    subtitle: 'Supply Chain Emissions',
    excerpt: "Primary aluminium made with coal-based power, as in most Indian smelting, is among the most carbon-intensive common materials. Recycled aluminium needs only a small fraction of the energy, so its…",

    tags: ['aluminium', 'recycling', 'scrap', 'CBAM', 'BIS', 'Scope 3', 'circular economy'],
    category: 'supply-chain',
    createdAt: '2026-05-06'
  },
  {
    id: '92',
    slug: 'msme-data-quality-tier-1-vs-tier-2-emission-factors',
    title: 'Tier 1 vs Tier 2 vs Tier 3 Emission Factors: How Good Is Your Data, Really?',
    subtitle: 'Data Traceability & Verification',
    excerpt: "Two companies can report the same Scope 1 emissions and have wildly different data quality. The IPCC tier system gives you a vocabulary to talk about it. - Tier 1: First baseline, screening, internal…",

    tags: ['emission factor', 'IPCC tier', 'data quality', 'pedigree matrix', 'Tier 3', 'measurement'],
    category: 'data-traceability',
    createdAt: '2026-05-06'
  },
  {
    id: '93',
    slug: 'msme-circular-economy-iso-59020-reporting',
    title: 'ISO 59020 Circular Economy Reporting: What Indian MSMEs Should Track',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "ISO 59020:2024 standardises how organisations measure and report circular economy performance. Some EU buyers and lenders are starting to ask about circularity metrics. For EPR obligations in India…",

    tags: ['ISO 59020', 'circular economy', 'recycling', 'CSRD ESRS E5', 'material productivity'],
    category: 'carbon-standards',
    createdAt: '2026-05-06'
  },
  {
    id: '94',
    slug: 'msme-sbti-fln-near-term-target-validation',
    title: 'Getting an SBTi FLAG Target Validated: A Realistic MSME Timeline and Cost',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "The Science Based Targets initiative's Forest, Land and Agriculture (FLAG) guidance sets how companies with land-intensive emissions set science-based targets. It is a credible target for MSMEs in…",

    tags: ['SBTi', 'FLN', 'FLAG', 'agri MSME', 'land use', 'validation', 'science-based targets'],
    category: 'carbon-standards',
    createdAt: '2026-05-06'
  },
  {
    id: '95',
    slug: 'msme-voice-search-carbon-faqs-2026',
    title: 'Carbon Compliance Questions Indian MSMEs Are Asking Voice Assistants in 2026',
    subtitle: 'Carbon Regulations',
    excerpt: "More Indian MSME owners are asking voice assistants compliance questions. The questions reveal what the regulatory system has failed to make clear. 1. \"Is CBAM applicable to my company?\" 2. \"How do I…",

    tags: ['voice search', 'CBAM FAQ', 'BRSR Lite', 'verification cost', 'MSME questions'],
    category: 'regulations',
    createdAt: '2026-05-06',
    featured: true
  },
  {
    id: '96',
    slug: 'msme-greenwashing-self-audit-checklist-2026',
    title: 'A Greenwashing Self-Audit Checklist: 18 Tests Before You Make a Climate Claim',
    subtitle: 'Data Traceability & Verification',
    excerpt: "The EU's Empowering Consumers for the Green Transition Directive (applying from September 2026), India's CCPA Greenwashing Guidelines (2024), and FTC Green Guides (US) all sharpen enforcement; the…",

    tags: ['greenwashing', 'EU Green Claims', 'CCPA', 'FTC', 'compliance', 'self-audit'],
    category: 'data-traceability',
    createdAt: '2026-05-06',
    featured: true
  },
  {
    id: '97',
    slug: 'msme-climate-finance-instruments-comparison-2026',
    title: 'Climate Finance for MSMEs in 2026: Sustainability-Linked Loans vs Green Bonds vs Receivables',
    subtitle: 'Carbon Regulations',
    excerpt: "Indian MSMEs now have access to four broadly different climate finance instruments. Choosing the wrong one can waste months and signals weakness to lenders. Green loan from SIDBI 4E or IREDA. Often…",

    tags: ['green loan', 'SLL', 'green bond', 'climate finance', 'SIDBI', 'IREDA', 'receivables'],
    category: 'regulations',
    createdAt: '2026-05-06',
    featured: true
  },
  {
    id: '104',
    slug: 'carbon-accounting-frequency-msme-when-to-measure',
    title: 'How often should an MSME measure its carbon footprint?',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "Most MSME owners are told to \"measure carbon\" without anyone explaining how often. The honest answer depends on three things: what you will do with the number, who is asking for it, and how much it…",

    tags: ['carbon accounting', 'measurement frequency', 'msme', 'cadence', 'BRSR', 'CBAM', 'reporting'],
    category: 'carbon-standards',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '105',
    slug: 'diy-vs-consultant-carbon-accounting-msme-decision-framework',
    title: 'Should you do carbon accounting yourself or hire a consultant?',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "Hiring a Big-Four-style sustainability consultant for an MSME carbon baseline can cost several lakh rupees, depending on scope. Doing it yourself with a deterministic MRV tool costs far less. Neither…",

    tags: ['DIY carbon accounting', 'consultant', 'decision framework', 'msme', 'cost'],
    category: 'carbon-standards',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '106',
    slug: 'carbon-credit-pricing-explained-vcm-compliance-2026',
    title: 'How are carbon credits actually priced in 2026?',
    subtitle: 'Carbon Regulations',
    excerpt: "A \"carbon credit\" is not one product. It is at least three different products that share a name. Confusing them is a common reason MSMEs misjudge what their reductions are worth. These prices move.…",

    tags: ['carbon credit pricing', 'VCM', 'CCTS', 'EU ETS', 'CBAM', 'voluntary market'],
    category: 'regulations',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '107',
    slug: 'carbon-offsets-vs-carbon-credits-difference-explained',
    title: 'What is the difference between a carbon offset and a carbon credit?',
    subtitle: 'Carbon Regulations',
    excerpt: "\"Offset\" and \"credit\" are used interchangeably in casual writing. They are not the same thing in any formal market. The difference matters because regulators, buyers and auditors increasingly enforce…",

    tags: ['carbon credit', 'carbon offset', 'terminology', 'greenwashing', 'mitigation hierarchy'],
    category: 'regulations',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '108',
    slug: 'mrv-vs-traditional-audit-carbon-verification-compared',
    title: 'How is digital MRV different from a traditional carbon audit?',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "A traditional carbon audit is a project: discrete, periodic, performed by humans. Digital MRV is a process: continuous, automated, performed by software with humans in the loop. Both produce a…",

    tags: ['MRV', 'audit', 'verification', 'comparison', 'GHG Protocol', 'CBAM'],
    category: 'data-traceability',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '109',
    slug: 'climate-risk-vs-esg-difference-financial-institutions',
    title: 'How is climate risk different from ESG, for a bank or lender?',
    subtitle: 'Carbon Regulations',
    excerpt: "Inside a financial institution, ESG and climate risk are often run by the same team and confused for the same workstream. They are not. ESG is a disclosure and stakeholder discipline. Climate risk is…",

    tags: ['climate risk', 'ESG', 'financial institutions', 'lender', 'BCBS', 'TCFD', 'prudential'],
    category: 'regulations',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '110',
    slug: 'transition-finance-vs-green-finance-borrower-guide',
    title: 'Green finance vs transition finance: what should an MSME borrower ask for?',
    subtitle: 'Carbon Regulations',
    excerpt: "An MSME walks into a bank and asks for a \"green loan\". The relationship manager pulls out a brochure that mixes green, transition and sustainability-linked products under one heading. They are not…",

    tags: ['green loan', 'transition finance', 'sustainability-linked loan', 'borrower', 'msme', 'SLL'],
    category: 'regulations',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '111',
    slug: 'spend-based-vs-activity-based-scope-3-method-choice',
    title: 'Spend-based vs activity-based: which Scope 3 method should you use?',
    subtitle: 'Supply Chain Emissions',
    excerpt: "The GHG Protocol allows multiple methods to calculate Scope 3 emissions. The two that matter for most MSMEs are spend-based and activity-based. Picking the right one (sometimes for the same category)…",

    tags: ['scope 3', 'spend-based', 'activity-based', 'GHG Protocol', 'methodology', 'supply chain'],
    category: 'supply-chain',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '112',
    slug: 'supplier-emissions-data-collection-playbook-msme',
    title: 'How do you get supplier emissions data when suppliers will not share?',
    subtitle: 'Supply Chain Emissions',
    excerpt: "A very common Scope 3 blocker for MSMEs is supplier non-response. The supplier is busy, the request looks unfamiliar, and there is no obvious benefit for them to spend three days filling out your…",

    tags: ['supplier engagement', 'scope 3', 'data collection', 'supply chain', 'CDP', 'msme'],
    category: 'supply-chain',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '113',
    slug: 'audit-grade-carbon-data-what-it-actually-means',
    title: 'What does "audit-grade carbon data" actually mean?',
    subtitle: 'Data Traceability & Verification',
    excerpt: "\"Audit-grade\" is the most overused phrase in carbon software marketing. It has a precise meaning, and most products that claim it do not meet it. The phrase has five concrete properties. A dataset…",

    tags: ['audit-grade', 'data quality', 'verification', 'traceability', 'methodology', 'GHG Protocol'],
    category: 'data-traceability',
    createdAt: '2026-05-21',
    featured: true
  },
  {
    id: '114',
    slug: 'realistic-income-from-selling-carbon-credits-msme',
    title: 'How much money can an MSME or individual realistically make selling carbon credits?',
    subtitle: 'Carbon Accounting Standards',
    excerpt: "The honest answer most carbon platforms will not give you: for a single MSME or individual, carbon-credit income in year one is usually small, and often zero, not the lakhs implied by influencer…",

    tags: ['carbon credits', 'monetisation', 'msme', 'pricing', 'voluntary market', 'additionality'],
    category: 'carbon-standards',
    createdAt: '2026-05-22',
    featured: true
  },
  {
    id: '115',
    slug: 'how-to-vet-a-legitimate-carbon-credit-platform',
    title: 'How do I tell whether a carbon credit platform is legitimate?',
    subtitle: 'Data Traceability & Verification',
    excerpt: "The carbon market has plenty of bad actors in 2026. Some \"platforms\" selling credits to MSMEs are reselling unverified or double-counted credits at a markup, or charging upfront fees against a future…",

    tags: ['carbon platform vetting', 'registry', 'greenwashing', 'due diligence', 'voluntary market'],
    category: 'data-traceability',
    createdAt: '2026-05-22',
    featured: true
  },
  {
    id: '116',
    slug: 'mrv-vs-esg-reporting-where-they-overlap-and-differ',
    title: 'MRV vs ESG reporting: where they overlap and where they do not',
    subtitle: 'Data Traceability & Verification',
    excerpt: "MRV (Measurement, Reporting, Verification) and ESG reporting get used interchangeably, especially by software vendors. They are not the same. Confusing them is one of the most common reasons MSMEs…",

    tags: ['MRV', 'ESG reporting', 'compliance', 'disclosure', 'CSRD', 'BRSR'],
    category: 'data-traceability',
    createdAt: '2026-05-22',
    featured: true
  },
  {
    id: '117',
    slug: 'how-to-choose-an-mrv-provider-msme-checklist',
    title: 'How should an MSME choose an MRV provider? A 12-point checklist',
    subtitle: 'Data Traceability & Verification',
    excerpt: "Most MRV procurement decisions inside MSMEs are made on three criteria: price, the founder's network, and which vendor sent the best deck. None of these survive a real audit. This is the 12-point…",

    tags: ['MRV selection', 'procurement', 'vendor evaluation', 'audit-grade', 'msme'],
    category: 'data-traceability',
    createdAt: '2026-05-22',
    featured: true
  },
  {
    id: '118',
    slug: 'green-loan-vs-traditional-loan-real-cost-comparison',
    title: 'Green loan vs traditional loan: the real cost comparison for MSMEs',
    subtitle: 'Carbon Regulations',
    excerpt: "Green loans are pitched as \"cheaper than traditional loans because banks reward sustainability\". That is partly true and partly marketing. A real cost comparison has to include the interest…",

    tags: ['green loan', 'climate finance', 'cost comparison', 'msme', 'covenants', 'india'],
    category: 'regulations',
    createdAt: '2026-05-22',
    featured: true
  },
  {
    id: '119',
    slug: 'green-loan-rejection-reasons-and-how-to-fix-them',
    title: 'Why green loans get rejected, and how to fix each reason',
    subtitle: 'Carbon Regulations',
    excerpt: "Many first-time MSME green-loan applications are rejected. The reasons cluster into eight recurring failure modes. Each is fixable, but only if diagnosed correctly. Most rejected applicants re-apply…",

    tags: ['green loan', 'loan rejection', 'climate finance', 'msme', 'baseline', 'covenants'],
    category: 'regulations',
    createdAt: '2026-05-22',
    featured: true
  },
  {
    id: '120',
    slug: 'carbon-careers-salary-roles-india-asia-2026',
    title: 'Carbon careers in India and Asia: what roles exist, what they pay, and how to enter',
    subtitle: 'Carbon Regulations',
    excerpt: "Carbon and climate roles are no longer a niche corner of sustainability teams. As CBAM, BRSR, CSRD, and voluntary carbon markets push measurement and disclosure into every supply chain, employers…",

    tags: ['carbon careers', 'climate jobs', 'mrv engineer', 'climate risk analyst', 'india', 'asia'],
    category: 'regulations',
    createdAt: '2026-05-23',
    featured: true
  },
  {
    id: '121',
    slug: 'real-world-asset-tokenisation-explained-for-msme-finance',
    title: 'Real-world asset tokenisation explained: what works, what does not, and where it touches MSME climate finance',
    subtitle: 'Carbon Regulations',
    excerpt: "Tokenisation of real-world assets (RWA) is the conversion of legal ownership or economic rights in a physical or off-chain financial asset into a digital token recorded on a blockchain or other…",

    tags: ['tokenisation', 'rwa', 'tokenised carbon credits', 'green finance', 'msme'],
    category: 'regulations',
    createdAt: '2026-05-23',
    featured: true
  },
  {
    id: '122',
    slug: 'physical-vs-transition-climate-risk-financial-institutions',
    title: 'Physical vs transition climate risk: what financial institutions actually have to measure',
    subtitle: 'Carbon Regulations',
    excerpt: "Physical and transition risks are the two categories every climate-risk framework (TCFD, ISSB S2, RBI's draft disclosure guidance, MAS, ECB, NGFS) uses to organise climate exposure. The distinction…",

    tags: ['climate risk', 'physical risk', 'transition risk', 'tcfd', 'rbi', 'banking'],
    category: 'regulations',
    createdAt: '2026-05-23',
    featured: true
  },
  {
    id: '123',
    slug: 'esg-readiness-assessment-msme-step-by-step-2026',
    title: 'ESG readiness assessment for MSMEs: a step-by-step framework for 2026',
    subtitle: 'Carbon Regulations',
    excerpt: "An ESG readiness assessment is the diagnostic step before any reporting, certification, or capital-raise involving sustainability criteria. For MSMEs in India and Asia, doing this well in 2026 is the…",

    tags: ['esg readiness', 'esg compliance', 'brsr', 'csrd', 'msme', 'sustainability'],
    category: 'regulations',
    createdAt: '2026-05-23',
    featured: true
  },
  {
    id: '124',
    slug: 'algorithmic-bias-credit-decisions-borrower-rights-2026',
    title: 'Algorithmic bias in credit decisions: what borrowers should know and how to respond',
    subtitle: 'Carbon Regulations',
    excerpt: "Many credit decisions in India and Asia in 2026 are made or materially influenced by algorithms. That is not new. What is new is the volume of alternative data used (cash-flow patterns, GST filings,…",

    tags: ['credit decisions', 'algorithmic bias', 'borrower rights', 'rbi', 'fair lending'],
    category: 'regulations',
    createdAt: '2026-05-23',
    featured: true
  },
  {
    id: '125',
    slug: 'scope-3-data-quality-tiers-software-buyer-guide-2026',
    title: 'Scope 3 data quality tiers: what audit-grade actually requires from your software',
    subtitle: 'Supply Chain Emissions',
    excerpt: "Most Scope 3 software in 2026 produces a number. Fewer produce a number that survives external assurance. The difference is data quality: specifically, the tier of input data used for each Scope 3…",

    tags: ['scope 3', 'data quality', 'audit grade', 'isae 3410', 'ghg protocol', 'pcaf'],
    category: 'supply-chain',
    createdAt: '2026-05-23',
    featured: true
  },
  {
    id: '126',
    slug: 'climate-finance-analyst-salary-india',
    title: 'Climate Finance Analyst Salary in India (2026)',
    subtitle: 'Climate Careers',
    excerpt: "Ask what a climate finance analyst earns in India and you will get a confident number from almost anyone. Ask where the number comes from and the confidence fades. The job is new enough that no…",

    tags: ['climate finance', 'esg careers', 'salary', 'india', 'green loans'],
    category: 'careers',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '127',
    slug: 'esg-jobs-bangalore',
    title: 'ESG Jobs in Bangalore: Roles, Employers and Pay',
    subtitle: 'Climate Careers',
    excerpt: "Bengaluru did not set out to become a place where companies count carbon. It became one the way it became everything else: global firms needed large teams that could work with data, follow a method…",

    tags: ['esg jobs', 'bengaluru', 'bangalore', 'sustainability careers', 'india'],
    category: 'careers',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '128',
    slug: 'green-loan-textile-business-karachi',
    title: 'How to Get a Green Loan for a Textile Business in Karachi',
    subtitle: 'Green Finance',
    excerpt: "A spinning mill in Korangi and a stitching unit in SITE have the same problem with their power bills. Grid electricity is expensive and unreliable, captive gas is no longer cheap, and the obvious…",

    tags: ['karachi', 'pakistan', 'green loans', 'textile exporters', 'pakistan green taxonomy'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '129',
    slug: 'export-textiles-to-europe-from-karachi',
    title: 'How to Export Textiles to Europe from Karachi',
    subtitle: 'Green Finance',
    excerpt: "For a Karachi home-textile or denim exporter, Europe has been the easy market for a decade. Since 2014 the EU's GSP+ arrangement has let most Pakistani textiles in without duty, which is a large part…",

    tags: ['karachi', 'pakistan', 'eu market', 'gsp plus', 'textile exporters', 'due diligence'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '130',
    slug: 'green-loan-steel-business-johannesburg',
    title: 'How to Get a Green Loan for a Steel Business in Johannesburg',
    subtitle: 'Green Finance',
    excerpt: "Gauteng's metals economy is a chain of mills, foundries, fabricators, merchants and scrap processors. Some ship to Europe directly; many more sell to someone who does. Since 1 January 2026 that…",

    tags: ['johannesburg', 'south africa', 'steel', 'metals', 'cbam', 'green finance', 'idc'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '131',
    slug: 'green-loan-garment-factory-dhaka',
    title: 'How to Get a Green Loan for a Garment Factory in Dhaka or Gazipur',
    subtitle: 'Green Finance',
    excerpt: "Drive north from Dhaka through Tongi into Gazipur and the factories never really stop. Knit, woven, denim and the washing and dyeing plants that serve them sit side by side, and between them they…",

    tags: ['dhaka', 'gazipur', 'bangladesh', 'garment exporters', 'green transformation fund', 'green finance'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '132',
    slug: 'green-loan-steel-msme-ludhiana-raipur',
    title: 'How to Get a Green Loan for a Steel MSME in Ludhiana or Raipur',
    subtitle: 'Green Finance',
    excerpt: "Ludhiana and Raipur sit at two ends of India's small-steel economy. Raipur, with Siltara and Urla, makes sponge iron, billets and rolled products close to the iron ore and coal. Ludhiana turns steel…",

    tags: ['ludhiana', 'raipur', 'steel msme', 'sidbi 4e', 'green steel taxonomy', 'green finance', 'cbam'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '133',
    slug: 'green-loan-textile-mill-tamil-nadu',
    title: 'How to Get a Green Loan for a Textile Mill in Tamil Nadu',
    subtitle: 'Green Finance',
    excerpt: "Tamil Nadu's textile economy is a set of clusters that each do one thing well: spinning around Coimbatore, knitwear in Tiruppur, power looms in Erode and Karur's home textiles. Tiruppur in particular…",

    tags: ['tamil nadu', 'tiruppur', 'textile clusters', 'green finance', 'sidbi', 'renewable energy'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '134',
    slug: 'finance-cbam-compliance-steel-vietnam',
    title: 'How to Finance CBAM Compliance for a Steel Exporter in Vietnam',
    subtitle: 'Green Finance',
    excerpt: "For a Vietnamese steel exporter, 2026 brought two changes from Brussels at once. From 1 January, EU importers of steel started owing CBAM certificates for the embedded emissions in what they buy.…",

    tags: ['vietnam', 'steel exporters', 'cbam', 'green taxonomy', 'decision 21', 'green finance'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '135',
    slug: 'green-finance-steel-cement-turkey',
    title: 'How Steel and Cement Exporters in Turkey Can Use Green Finance to Cut CBAM Costs',
    subtitle: 'Green Finance',
    excerpt: "Turkey sells more steel and cement to the European Union than most countries that face CBAM, and it sells them close by. A law-firm estimate puts Turkish cement at nearly 30 percent of the EU's…",

    tags: ['turkey', 'steel', 'cement', 'turkish ets', 'cbam', 'turk eximbank', 'green finance'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '136',
    slug: 'green-loan-ceramic-factory-morbi',
    title: 'How to Get a Green Loan for a Ceramic Tile Factory in Morbi',
    subtitle: 'Green Finance',
    excerpt: "Morbi makes most of India's tiles, and it makes them with heat. Every kiln and spray dryer in the cluster burns fuel around the clock, so the price of that fuel decides whether a unit makes money. In…",

    tags: ['morbi', 'ceramics', 'tiles', 'gujarat', 'green finance', 'energy efficiency'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '137',
    slug: 'finance-glass-furnace-firozabad',
    title: 'How to Finance an Energy-Efficient Glass Furnace in Firozabad',
    subtitle: 'Green Finance',
    excerpt: "Firozabad's bangles, lamps and glassware come out of furnaces that never cool. A pot furnace or tank furnace that goes cold can crack, so units run on gas day and night whatever the order book says.…",

    tags: ['firozabad', 'glass', 'uttar pradesh', 'furnaces', 'green finance', 'energy efficiency'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '138',
    slug: 'green-finance-ship-recycling-chattogram',
    title: 'How to Get Green Finance for Ship Recycling Yards and Steel Mills in Chattogram',
    subtitle: 'Green Finance',
    excerpt: "Along the beaches of Sitakunda, north of Chattogram, old ships are cut into plates and sections. Much of that steel never leaves the district: it goes by truck to re-rolling mills that turn it into…",

    tags: ['chattogram', 'bangladesh', 'ship recycling', 're-rolling mills', 'steel', 'green finance', 'hong kong convention'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '139',
    slug: 'green-loan-cement-plant-pakistan',
    title: 'How to Get a Green Loan for a Cement Plant in Pakistan',
    subtitle: 'Green Finance',
    excerpt: "Pakistan's cement industry has more kiln capacity than the country uses, so exports matter. In the year to June 2025, Lucky Cement alone shipped more than 3 million tonnes of cement and clinker by…",

    tags: ['pakistan', 'cement', 'clinker', 'waste heat recovery', 'green finance', 'cbam'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '140',
    slug: 'finance-emission-cuts-cement-plant-vietnam',
    title: 'How to Finance Emission Cuts at a Cement Plant in Vietnam',
    subtitle: 'Green Finance',
    excerpt: "Vietnam makes more cement than it can use, and in 2025 it sold more abroad than ever. Exports of cement and clinker rose 25.6 percent to 37.32 million tonnes, according to Vietnam Customs data…",

    tags: ['vietnam', 'cement', 'clinker', 'carbon market', 'decision 263', 'green finance'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '141',
    slug: 'green-finance-textile-exporter-turkey',
    title: 'How to Get Green Finance for a Textile Exporter in Bursa or Denizli',
    subtitle: 'Green Finance',
    excerpt: "Turkey's textile map has two old centres. Bursa built its name on weaving, from silk to technical fabrics. Denizli made towels and home textiles that fill European bathrooms. Both sell to Europe by…",

    tags: ['turkey', 'bursa', 'denizli', 'textile exporters', 'green finance', 'turk eximbank', 'espr'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '142',
    slug: 'renewable-power-ferrochrome-smelter-south-africa',
    title: 'How to Finance Renewable Power for a Ferrochrome Smelter in South Africa',
    subtitle: 'Green Finance',
    excerpt: "South Africa mines more chrome ore than any other country and once smelted much of it at home, in furnaces across North West and Mpumalanga. Those furnaces run on electricity in huge quantities, and…",

    tags: ['south africa', 'ferrochrome', 'ferroalloys', 'smelters', 'electricity', 'green finance', 'cbam'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '143',
    slug: 'lower-cbam-costs-importer-germany',
    title: 'How to Lower CBAM Costs as an Importer in Germany',
    subtitle: 'Carbon Regulations',
    excerpt: "For a German steel trader, fastener importer or aluminium profile buyer, CBAM stopped being a reporting exercise on 1 January 2026. Imports of iron and steel, aluminium, cement, fertilisers, hydrogen…",

    tags: ['germany', 'cbam', 'importers', 'dehst', 'steel', 'aluminium', 'cbam cost'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '144',
    slug: 'cbam-supplier-data-steel-importer-poland',
    title: 'What CBAM Data to Ask Steel Suppliers For in Poland',
    subtitle: 'Carbon Regulations',
    excerpt: "Poland's construction sites and fabrication shops use a great deal of imported steel, much of it rebar, wire rod and sections from mills outside the EU. Since 1 January 2026, every tonne of it…",

    tags: ['poland', 'cbam', 'steel importers', 'kobize', 'supplier data', 'ukraine'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '145',
    slug: 'cbam-cost-imported-steel-slab-italy',
    title: 'How to Control CBAM Costs on Imported Steel Slab in Italy',
    subtitle: 'Carbon Regulations',
    excerpt: "Some of Italy's plate mills do not make their own steel. They buy slab, often from outside the EU, reheat it and roll it into heavy plate for shipyards, construction and machinery. Under CBAM,…",

    tags: ['italy', 'cbam', 're-rollers', 'slab', 'heavy plate', 'mase', 'steel imports'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '146',
    slug: 'green-loan-steel-rolling-mill-jalna',
    title: 'How to Get a Green Loan for a Steel Rolling Mill in Jalna',
    subtitle: 'Green Finance',
    excerpt: "Jalna, in Maharashtra's Marathwada region, is one of the state's main steel re-rolling centres, making the TMT bars that go into houses and roads. Its mills melt scrap and sponge iron in induction…",

    tags: ['jalna', 'maharashtra', 'steel re-rolling', 'induction furnace', 'adeetie', 'green finance'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '147',
    slug: 'cbam-cost-aluminium-extrusion-turkey',
    title: 'CBAM Cost for Aluminium Extruders in Turkey, and How to Cut It',
    subtitle: 'Carbon Regulations',
    excerpt: "If you have bought a window frame, a curtain wall or a solar mounting rail in Europe, there is a fair chance the aluminium profile inside it was extruded in Turkey. In 2025 Turkey supplied about…",

    tags: ['turkey', 'aluminium', 'extrusion', 'profiles', 'cbam', 'recycled aluminium'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '148',
    slug: 'cbam-aluminium-exporter-india',
    title: 'CBAM for Aluminium Exporters in India: How to Keep EU Buyers',
    subtitle: 'Carbon Regulations',
    excerpt: "India's aluminium industry sells foil, sheet, extrusions, wire and castings to European buyers, many of them made by small and mid-sized firms that buy their metal from a handful of large smelters.…",

    tags: ['india', 'aluminium', 'msme exporters', 'cbam', 'extrusions', 'foil'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '149',
    slug: 'nhs-carbon-reduction-plan-pharma-india',
    title: 'NHS Carbon Reduction Plan Rules for Pharma Suppliers in India',
    subtitle: 'Supply Chain Emissions',
    excerpt: "Indian manufacturers supply many of the generic medicines the UK's National Health Service buys, and two clusters stand out: the API and formulation plants around Hyderabad, and the formulation belt…",

    tags: ['pharma', 'hyderabad', 'baddi', 'nhs', 'carbon reduction plan', 'scope 3', 'api manufacturers'],
    category: 'supply-chain',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '150',
    slug: 'green-loan-chemical-plant-gujarat',
    title: 'How to Get a Green Loan for a Chemical Plant in Vapi, Ankleshwar or Dahej',
    subtitle: 'Green Finance',
    excerpt: "South Gujarat's chemical belt runs along the highway from Vapi through Ankleshwar to Dahej. Dyes, pigments, agrochemicals, specialty and bulk chemicals: thousands of plants, from family-run reactors…",

    tags: ['gujarat', 'vapi', 'ankleshwar', 'dahej', 'chemicals', 'green finance', 'boilers'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '151',
    slug: 'cbam-fertiliser-imports-germany-poland',
    title: 'How CBAM Changes Fertiliser Imports in Germany and Poland',
    subtitle: 'Carbon Regulations',
    excerpt: "Fertiliser is the CBAM product group that farmers notice. Nitrogen fertilisers such as urea, ammonium nitrate and calcium ammonium nitrate, and their inputs ammonia and nitric acid, are all covered.…",

    tags: ['fertilisers', 'germany', 'poland', 'cbam', 'urea', 'ammonia', 'importers'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '152',
    slug: 'cbam-certificate-price',
    title: 'CBAM Certificate Price: How It Is Set and the 2026 Prices',
    subtitle: 'Carbon Regulations',
    excerpt: "Every CBAM cost estimate multiplies two numbers: the embedded emissions in a shipment and the price of one CBAM certificate. Exporters spend most of their effort on the first number. The second one…",

    tags: ['cbam', 'cbam certificates', 'certificate price', 'eu ets', 'carbon price'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '153',
    slug: 'india-carbon-credit-trading-scheme-targets',
    title: 'India Carbon Credit Trading Scheme: Which Industries Have Targets',
    subtitle: 'Carbon Regulations',
    excerpt: "India's Carbon Credit Trading Scheme moved from design to obligation in 2025. Large plants in energy-intensive sectors now have legally binding targets for greenhouse gas emissions per tonne of…",

    tags: ['ccts', 'india carbon market', 'emission intensity targets', 'cement', 'aluminium', 'textiles'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '154',
    slug: 'adeetie-scheme',
    title: 'ADEETIE Scheme: Eligibility, Benefits and How to Apply',
    subtitle: 'Green Finance',
    excerpt: "Most MSME owners know which machine wastes energy. The furnace with the cracked lining, the compressor that runs all night, the boiler older than the business. What stops them replacing it is the…",

    tags: ['adeetie', 'bee', 'msme', 'energy efficiency', 'interest subvention', 'green finance'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '155',
    slug: 'financed-emissions-banks-india',
    title: 'How Banks and NBFCs in India Measure Financed Emissions',
    subtitle: 'Carbon Standards',
    excerpt: "For a bank, almost all of its carbon footprint sits in its loan book. The electricity in its branches is small next to the emissions of the steel mills, transporters and factories it finances. Those…",

    tags: ['financed emissions', 'pcaf', 'rbi', 'banks', 'nbfc', 'scope 3 category 15'],
    category: 'carbon-standards',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '156',
    slug: 'energy-audit-for-msme-india',
    title: 'How to Get an Energy Audit for an MSME in India',
    subtitle: 'Manufacturing Emissions',
    excerpt: "An energy audit is the cheapest way for a factory to find out where its money is burning. It is also, increasingly, a document banks and government schemes require before they fund an efficiency…",

    tags: ['energy audit', 'msme', 'bee', 'adeetie', 'igea', 'india'],
    category: 'manufacturing',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '157',
    slug: 'green-energy-open-access-india',
    title: 'How Factories in India Can Buy Renewable Power Through Open Access',
    subtitle: 'Manufacturing Emissions',
    excerpt: "For years, buying wind or solar power directly from a generator was something only large plants could do in India. The rule was simple: you needed at least 1 MW of connected load. A mid-sized factory…",

    tags: ['open access', 'renewable energy', 'india', 'factories', 'scope 2', 'green energy open access rules'],
    category: 'manufacturing',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '158',
    slug: 'cbam-fastener-exporters-india',
    title: 'CBAM for Fastener Exporters in India (CN 7318)',
    subtitle: 'Carbon Regulations',
    excerpt: "Bolts, nuts, screws and washers look like the least carbon-intensive thing a factory can make. Under the EU's Carbon Border Adjustment Mechanism they are steel products like any other. Fasteners…",

    tags: ['fasteners', 'ludhiana', 'cbam', 'cn 7318', 'steel exporters', 'india'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '159',
    slug: 'south-africa-carbon-tax-cbam',
    title: 'Does South Africa\'s Carbon Tax Reduce CBAM Costs?',
    subtitle: 'Carbon Regulations',
    excerpt: "South Africa is one of the few CBAM-exposed exporters that already has a carbon price. Its carbon tax has applied since 2019, and from 1 January 2026 the headline rate rose sharply. The obvious…",

    tags: ['south africa', 'carbon tax', 'cbam', 'article 9', 'carbon price paid', 'exporters'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '160',
    slug: 'green-loan-foundry-kolhapur',
    title: 'How to Get a Green Loan for a Foundry in Kolhapur',
    subtitle: 'Green Finance',
    excerpt: "Kolhapur's foundries cast the engine blocks, pump housings and machine parts that India's auto and engineering industries run on. Melting iron takes a great deal of energy, by coke in cupolas or…",

    tags: ['kolhapur', 'foundry', 'maharashtra', 'green loan', 'energy efficiency', 'castings'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '161',
    slug: 'rbi-green-deposits-what-banks-finance',
    title: 'What Can Banks in India Finance With Green Deposits?',
    subtitle: 'Green Finance',
    excerpt: "Walk into many Indian banks today and you can open a green fixed deposit. The money is supposed to go to green projects. For a business owner looking for finance, that raises a useful question: if…",

    tags: ['rbi', 'green deposits', 'green finance', 'banks', 'india', 'green loans'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '162',
    slug: 'rooftop-solar-loan-factory-bangladesh',
    title: 'How to Finance Rooftop Solar for a Factory in Bangladesh',
    subtitle: 'Green Finance',
    excerpt: "A garment or textile factory in Bangladesh has acres of flat roof and a grid bill that, by The Daily Star's reporting, runs at Tk 10 to 12 per kilowatt-hour. Rooftop solar is the obvious answer, and…",

    tags: ['bangladesh', 'rooftop solar', 'idcol', 'garment factories', 'green finance', 'net metering'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '163',
    slug: 'rooftop-solar-net-metering-pakistan-factories',
    title: 'Is Rooftop Solar Still Worth It for Factories in Pakistan After the Net Metering Changes?',
    subtitle: 'Green Finance',
    excerpt: "For three years, rooftop solar was the easiest saving a Pakistani factory could make. Power prices kept rising, panels kept getting cheaper, and net metering let you export surplus power and offset…",

    tags: ['pakistan', 'rooftop solar', 'net metering', 'nepra', 'factories', 'net billing'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '164',
    slug: 'solar-loan-for-msme-india',
    title: 'How to Get a Solar Loan for an MSME in India',
    subtitle: 'Green Finance',
    excerpt: "Rooftop solar is often the first green project an Indian MSME takes on. It cuts the electricity bill from the first month, it needs no change to the production process, and banks understand it well.…",

    tags: ['solar loan', 'msme', 'india', 'rooftop solar', 'sbi surya shakti', 'green finance'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '165',
    slug: 'green-finance-textile-recycling-panipat',
    title: 'How Can Textile Recyclers in Panipat Get Green Finance and Keep EU Buyers?',
    subtitle: 'Green Finance',
    excerpt: "Panipat turns the world's discarded clothes into blankets, yarn and home furnishings. It is often called India's recycling capital, and recycled textiles are exactly what European brands say they…",

    tags: ['panipat', 'textile recycling', 'digital product passport', 'green finance', 'haryana', 'espr'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '166',
    slug: 'germany-supply-chain-act-lksg-indian-suppliers',
    title: "What Does Germany's Supply Chain Act (LkSG) Mean for Indian Suppliers?",
    subtitle: 'Supply Chain Emissions',
    excerpt: "If you sell to a large German company, you have probably received a supplier code of conduct, a questionnaire about labour and environmental practices, or a request to sign a declaration. Most of it…",

    tags: ['germany', 'lksg', 'supply chain act', 'due diligence', 'indian suppliers', 'csddd'],
    category: 'supply-chain',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '167',
    slug: 'cbam-verification-non-eu-producer',
    title: 'How to Get Your CBAM Emissions Verified as a Non-EU Producer',
    subtitle: 'Carbon Regulations',
    excerpt: "Under CBAM, a producer outside the EU can save its European customers a great deal of money by replacing EU default values with its own actual emissions. There is one condition: those actual…",

    tags: ['cbam verification', 'accredited verifier', 'site visit', 'actual emissions', 'exporters'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '168',
    slug: 'cbam-support-for-indian-msmes',
    title: 'What Government Support Can Indian MSMEs Get for CBAM Compliance?',
    subtitle: 'Carbon Regulations',
    excerpt: "For a small Indian steel or aluminium exporter, the first CBAM bill is not the certificate cost. It is the cost of the paperwork: measuring emissions per product, hiring a consultant, and paying an…",

    tags: ['cbam', 'msme', 'india', 'trace', 'export promotion mission', 'india eu fta'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '169',
    slug: 'cbam-50-tonne-exemption',
    title: 'Is Your Import Exempt From CBAM? The 50-Tonne Rule Explained',
    subtitle: 'Carbon Regulations',
    excerpt: "When CBAM was first designed, it exempted only consignments worth less than €150, which caught almost every small importer of a few pallets of bolts or aluminium profiles. The EU's 2025…",

    tags: ['cbam', 'de minimis', '50 tonne threshold', 'exemption', 'importers', 'omnibus'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '170',
    slug: 'become-cbam-authorised-declarant',
    title: 'How to Become a CBAM Authorised Declarant',
    subtitle: 'Carbon Regulations',
    excerpt: "Since 1 January 2026, only an authorised CBAM declarant can import iron and steel, aluminium, cement, fertilisers, hydrogen or electricity into the EU above the 50-tonne exemption. Without the…",

    tags: ['cbam', 'authorised declarant', 'cbam registry', 'importers', 'dehst', 'kobize', 'mase'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '171',
    slug: 'turkey-emissions-trading-system',
    title: "Turkey's Emissions Trading System: Who Is Covered and When",
    subtitle: 'Carbon Regulations',
    excerpt: "Turkey is building its own carbon market, and for its exporters the timing is not a coincidence. The EU's CBAM lets importers deduct a carbon price effectively paid in the country of origin, so a…",

    tags: ['turkey', 'emissions trading system', 'turkish ets', 'climate law 7552', 'cbam', 'carbon price'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '172',
    slug: 'vietnam-grid-emission-factor',
    title: "What Is Vietnam's Grid Emission Factor, and How Do You Use It?",
    subtitle: 'Carbon Standards',
    excerpt: "Every factory in Vietnam that reports its carbon footprint, answers a brand's supplier questionnaire or prepares CBAM data needs one number: how much CO2 each unit of grid electricity carries. That…",

    tags: ['vietnam', 'grid emission factor', 'scope 2', 'electricity', 'emission factor'],
    category: 'carbon-standards',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '173',
    slug: 'eu-steel-import-quota-2026',
    title: 'EU Steel Import Quotas From July 2026: What Exporters Need to Know',
    subtitle: 'Carbon Regulations',
    excerpt: "For steel exporters to Europe, 2026 brought two border changes in six months. CBAM began charging for embedded emissions in January. Then in July, the EU replaced its 2018 steel safeguard with a…",

    tags: ['eu steel safeguard', 'steel quota', 'melt and pour', 'steel exporters', 'cbam', 'trade'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '174',
    slug: 'cbam-downstream-products-2028',
    title: 'Will CBAM Cover Your Product From 2028? The Downstream Extension Explained',
    subtitle: 'Carbon Regulations',
    excerpt: "CBAM today covers basic materials: iron and steel, aluminium, cement, fertilisers, hydrogen and electricity. A European buyer who imports a finished machine part made from Indian steel pays nothing…",

    tags: ['cbam', 'downstream products', 'cbam extension', '2028', 'steel', 'aluminium'],
    category: 'regulations',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '175',
    slug: 'eu-forced-labour-regulation-suppliers',
    title: 'What Does the EU Forced Labour Regulation Mean for Suppliers in Asia?',
    subtitle: 'Supply Chain Emissions',
    excerpt: "From 14 December 2027, a product made with forced labour cannot be sold in the EU or exported from it, whatever the product and wherever it was made. That is the EU Forced Labour Regulation. Unlike…",

    tags: ['forced labour regulation', 'eu', 'suppliers', 'due diligence', 'asia', 'textiles'],
    category: 'supply-chain',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '176',
    slug: 'digital-product-passport-textile-exporters',
    title: 'What Does the EU Digital Product Passport Mean for Textile Exporters?',
    subtitle: 'Supply Chain Emissions',
    excerpt: "Somewhere in the next few years, a garment sold in Europe will carry a code that opens a record of what it is made of, where it was made and how to repair or recycle it. That record is the Digital…",

    tags: ['digital product passport', 'espr', 'textiles', 'apparel', 'exporters', 'eu'],
    category: 'supply-chain',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '177',
    slug: 'wheeling-renewable-power-south-africa-factories',
    title: 'Can a Factory in South Africa Buy Renewable Power Through Wheeling?',
    subtitle: 'Green Finance',
    excerpt: "For years, a South African manufacturer that wanted cleaner or cheaper power had two choices: put solar on its own roof, or keep buying from Eskom. Wheeling adds a third. A private generator puts…",

    tags: ['south africa', 'wheeling', 'renewable power', 'factories', 'eskom', 'nersa'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '178',
    slug: 'pakistan-green-taxonomy',
    title: 'What Is the Pakistan Green Taxonomy, and How Does It Affect Business Loans?',
    subtitle: 'Green Finance',
    excerpt: "When a Pakistani bank calls a loan green, it now needs a reason it can point to. That reason is the Pakistan Green Taxonomy: a national list of activities that count as environmentally sustainable,…",

    tags: ['pakistan', 'green taxonomy', 'sbp', 'green loans', 'banks', 'green finance'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
  {
    id: '179',
    slug: 'vietnam-green-taxonomy-decision-21',
    title: "What Is Vietnam's Green Taxonomy, and How Do You Qualify for Green Credit?",
    subtitle: 'Green Finance',
    excerpt: "Until 2025, a Vietnamese bank deciding whether a loan was green had guidelines but no binding national definition. Decision 21 changed that. It is Vietnam's first legally binding green taxonomy, and…",

    tags: ['vietnam', 'green taxonomy', 'decision 21', 'green credit', 'green bonds', 'banks'],
    category: 'green-finance',
    createdAt: '2026-10-13',
    featured: false
  },
];

// Get featured articles for landing page
export const getFeaturedArticles = (limit: number = 15): CMSArticleMeta[] => {
  return articleIndex
    .filter(article => article.featured)
    .slice(0, limit);
};

// Get article by slug
export const getArticleBySlug = (slug: string): CMSArticleMeta | undefined => {
  return articleIndex.find(article => article.slug === slug);
};

// Get articles by category
export const getArticlesByCategory = (category: string): CMSArticleMeta[] => {
  return articleIndex.filter(article => article.category === category);
};

// Search articles
export const searchArticles = (query: string): CMSArticleMeta[] => {
  const lowerQuery = query.toLowerCase();
  return articleIndex.filter(article => 
    article.title.toLowerCase().includes(lowerQuery) ||
    article.subtitle.toLowerCase().includes(lowerQuery) ||
    article.excerpt.toLowerCase().includes(lowerQuery) ||
    article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

// Get related articles
export const getRelatedArticles = (articleId: string, limit: number = 3): CMSArticleMeta[] => {
  const article = articleIndex.find(a => a.id === articleId);
  if (!article) return [];
  
  return articleIndex
    .filter(a => a.id !== articleId && a.category === article.category)
    .slice(0, limit);
};
