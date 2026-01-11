// CMS Content - Climate Intelligence Q&A Database
// This data can be updated from backend without code changes

export interface CMSArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  tags: string[];
  category: string;
  createdAt: string;
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
];

// Full CMS content database
export const cmsArticles: CMSArticle[] = [
  {
    id: '1',
    slug: 'how-to-trace-emission-data-to-source',
    title: 'How can we trace every emission number back to raw sensor or invoice data?',
    subtitle: 'Data Traceability & Verification',
    content: `Traceability requires a structured data management system that logs every emission calculation to its source document or measurement. Start by establishing a data hierarchy: raw inputs like fuel invoices, electricity bills, or IoT sensor readings form the base layer. Each data point should carry metadata including timestamp, source identifier, collection method, and responsible person or system.

Use unique transaction IDs to link calculated emissions back through the calculation chain to the original input. For example, if Scope 1 emissions from a diesel generator are 500 kg CO2e, the system should reference the specific fuel purchase invoice number, date, quantity in liters, the emission factor used, and the calculation standard applied.

Implement version control so that if an invoice is corrected or a sensor recalibrated, the change is logged and previous calculations can be retraced. Digital platforms with audit trail capabilities and blockchain-based systems can automate this linkage.

Manual systems require disciplined documentation protocols with clear file naming conventions and centralized storage. Regular internal audits should test traceability by randomly selecting final emission figures and working backward to source documents.

This approach satisfies third-party verification requirements under ISO 14064, CDP, and regulatory frameworks like BRSR in India or CSRD in the EU.`,
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
    content: `Maintain parallel datasets rather than overwriting historical records. When a methodology changes, such as an update to GHG Protocol guidance or new emission factors published by national authorities, create a new data series while preserving the original calculations under the old method.

Document the change clearly: note the effective date, the reason for the change, the specific parameters that differ, and the impact on reported emissions. For year-over-year comparisons, recalculate at least the prior year using the new methodology to enable like-for-like comparison, but retain the original figures in archived records.

This dual approach allows you to show trend consistency under current methods while maintaining a complete historical audit trail. Use version tags in your database or spreadsheet, such as Emissions_2023_v1_GHGProtocol2015 and Emissions_2023_v2_GHGProtocol2022.

Disclosure documents should include a reconciliation note explaining the methodology change and quantifying the difference. This practice aligns with requirements under frameworks like TCFD, which emphasize consistency and transparency in reporting methodologies over time. It also protects against challenges during external assurance or regulatory review.`,
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
    content: `There is no standard called GHG-6 in climate science or carbon accounting frameworks. You may be referring to the six greenhouse gases covered under the Kyoto Protocol and tracked in corporate inventories: carbon dioxide, methane, nitrous oxide, hydrofluorocarbons, perfluorocarbons, and sulfur hexafluoride.

These are sometimes informally grouped as the six GHGs but not labeled GHG-6. Each gas has a different warming impact, measured by its Global Warming Potential over a specific timeframe, typically 100 years.

For example, methane has a GWP100 of about 28-30, meaning one tonne of methane warms the atmosphere roughly 28-30 times more than one tonne of CO2 over a century.

To calculate total warming impact beyond CO2, identify each gas emitted by your operations, quantify it in physical units like kilograms or tonnes, then multiply by the appropriate GWP factor from the IPCC's latest Assessment Report. Sum the results to get total emissions in CO2 equivalent.

For refrigerants like HFCs, use the specific GWP for each chemical compound, as they vary widely from GWP of 12 to over 14,000. The GHG Protocol Corporate Standard provides detailed guidance.`,
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
    content: `Yes, they count differently in impact and in most accounting frameworks. Methane is a recognized greenhouse gas under the GHG Protocol and is converted to CO2 equivalent using its Global Warming Potential, typically around 28-30 over 100 years.

One tonne of methane reduced equals roughly 28-30 tonnes of CO2 equivalent in your inventory, making methane reductions highly valuable.

Black carbon, a component of particulate matter from incomplete combustion, is a short-lived climate pollutant with strong warming effects but is not included in standard corporate GHG inventories under the GHG Protocol or Kyoto framework.

Its warming impact is measured differently, often as radiative forcing rather than GWP, and it also has complex regional and atmospheric chemistry effects. Some voluntary carbon standards and air quality programs recognize black carbon reductions, and certain development finance or climate fund mechanisms may value them, but they do not appear in Scope 1, 2, or 3 inventories.

If your operations produce significant black carbon, such as diesel engines, brick kilns, or biomass burning, reductions improve local air quality and have climate co-benefits, but you would report these separately from your CO2e inventory.`,
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
    content: `Semi-finished goods like steel billets, aluminum ingots, chemical intermediates, or pre-fabricated components carry embodied emissions from upstream production processes that are not visible on the invoice.

These emissions fall into your Scope 3 Category 1, purchased goods and services. The hidden data includes emissions from raw material extraction, energy use in smelting or chemical processing, transportation to the exporter, and often fugitive emissions or process emissions specific to the production method.

For example, steel produced in a coal-powered blast furnace has roughly double the carbon intensity of steel from an electric arc furnace using renewable energy, but the product specification may be identical.

To uncover this data, request supplier-specific emission factors or Environmental Product Declarations. If unavailable, use industry average emission factors from databases like Ecoinvent, GaBi, or regional factors from the EU Product Environmental Footprint program.

Under emerging regulations like the EU Carbon Border Adjustment Mechanism, importers will be required to report the actual embedded emissions of certain goods like steel, aluminum, cement, fertilizers, and hydrogen, verified by the producer.`,
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
    content: `Yes, rerouting supply chains to reduce CBAM exposure is legal, but the mechanism is designed to prevent simple circumvention. CBAM applies to certain goods imported into the EU based on their embedded emissions, regardless of the route they take.

If you import steel from a high-emission producer in Country A, routing it through a low-emission country for minimal processing or repackaging will not avoid CBAM if the origin and embedded emissions remain unchanged.

The regulation requires importers to declare the actual production emissions, verified by the producer, and to purchase CBAM certificates corresponding to the carbon price that would have been paid if the goods were produced in the EU.

Legal strategies to reduce exposure include:
- Sourcing from suppliers who use cleaner production methods
- Switching to suppliers in countries with carbon pricing systems that can be credited against CBAM
- Investing in decarbonization partnerships with existing suppliers to lower their production emissions
- Substituting high-emission materials with lower-carbon alternatives

Falsifying emission data, transshipping goods to obscure origin, or splitting shipments to avoid reporting thresholds would violate the regulation and incur penalties.`,
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
    content: `Manufacturing firms calculate Scope 1 emissions, which are direct emissions from owned or controlled sources, by identifying and quantifying fuel combustion in furnaces, boilers, generators, company vehicles, and process emissions from chemical reactions or industrial processes.

**India-Specific Guidance:**
Use emission factors from the Ministry of Power for electricity grid, Bureau of Energy Efficiency guidelines, and IPCC default factors. Follow BRSR reporting requirements if listed. Consider state-specific grid factors as emission intensity varies significantly across states. Regulatory landscape includes mandatory PAT scheme for energy-intensive units.

**Data Collection Process:**
Gather activity data such as fuel consumption in liters or cubic meters, electricity use in kilowatt-hours, or material quantities in tonnes, then apply appropriate emission factors to convert to CO2 equivalent.

**Organizational Boundaries:**
Follow either equity share, financial control, or operational control approaches consistently. Operational boundaries must include all relevant emission sources.

**Best Practices:**
- Use primary data from meters, invoices, and logs wherever possible
- Apply emission factors from the latest official sources or recognized databases
- Document all assumptions, calculation methods, and data sources
- Report total Scope 1 emissions in tonnes CO2e annually
- Consider intensity metrics to normalize for changes in activity levels`,
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
    content: `Manufacturing firms calculate Scope 2 emissions, which are indirect emissions from purchased electricity, heat, or steam, by identifying and quantifying purchased electricity for production equipment, HVAC systems, and facility lighting.

**India-Specific Guidance:**
Use emission factors from the Ministry of Power for electricity grid, Bureau of Energy Efficiency guidelines, and IPCC default factors. Follow BRSR reporting requirements if listed. Consider state-specific grid factors as emission intensity varies significantly across states.

**Location-Based vs Market-Based:**
The location-based method uses average grid emission factors. The market-based method accounts for renewable energy purchases, power purchase agreements, and renewable energy certificates (RECs).

**Data Collection:**
Gather electricity consumption data from utility bills or meters. Apply the appropriate grid emission factor for your region.

**Key Considerations:**
- State grids in India vary from 0.5 to 1.0 kg CO2e per kWh
- Document whether using location-based or market-based approach
- If purchasing green power, retain certificates and contractual documentation
- Report Scope 2 separately from Scope 1`,
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
    content: `Manufacturing firms calculate Scope 3 emissions, which are all other indirect emissions in the value chain, by identifying and quantifying raw material extraction and production, supplier emissions, product transportation, employee commuting, waste disposal, and product use and end-of-life.

**The 15 Scope 3 Categories:**
1. Purchased goods and services
2. Capital goods
3. Fuel and energy-related activities
4. Upstream transportation
5. Waste generated in operations
6. Business travel
7. Employee commuting
8. Upstream leased assets
9. Downstream transportation
10. Processing of sold products
11. Use of sold products
12. End-of-life treatment
13. Downstream leased assets
14. Franchises
15. Investments

**India-Specific Considerations:**
- Use India-specific emission factors where available
- Consider informal sector contributions to supply chain
- Account for diverse transportation modes including rail and road

**Prioritization:**
Start with material categories that represent the largest emissions sources, typically purchased goods and upstream transportation for manufacturers.`,
    tags: ['Scope 3', 'manufacturing', 'India', 'GHG accounting', 'value chain emissions'],
    category: 'manufacturing',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '10',
    slug: 'cbam-compliance-indian-exporters',
    title: 'How should Indian exporters prepare for EU CBAM compliance?',
    subtitle: 'CBAM Readiness for Indian Businesses',
    content: `The EU Carbon Border Adjustment Mechanism (CBAM) requires importers to report and eventually pay for the embedded carbon in certain goods imported into the EU. Indian exporters in covered sectors must prepare now.

**Covered Sectors (Phase 1):**
- Iron and steel
- Aluminum
- Cement
- Fertilizers
- Electricity
- Hydrogen

**Compliance Timeline:**
- 2023-2025: Transitional reporting period
- 2026: Financial obligations begin
- 2034: Full phase-in

**Action Steps for Exporters:**
1. Calculate product-level embedded emissions using actual production data
2. Implement measurement and verification systems
3. Prepare documentation for EU importers
4. Consider decarbonization investments to reduce embedded emissions
5. Engage with EU importers on data requirements

**Competitive Considerations:**
Exporters with lower carbon intensity will have competitive advantages. Investing in renewable energy, energy efficiency, and cleaner production now positions you favorably for the new trade environment.`,
    tags: ['CBAM', 'EU regulations', 'Indian exporters', 'carbon compliance', 'trade'],
    category: 'regulations',
    createdAt: '2025-01-01',
    featured: true
  },
  {
    id: '11',
    slug: 'agriculture-scope-1-emissions-india',
    title: 'How do Agriculture firms calculate Scope 1 emissions in India?',
    subtitle: 'Agriculture Scope 1 Calculation in India',
    content: `Agriculture firms calculate Scope 1 emissions, which are direct emissions from owned or controlled sources, by identifying and quantifying fuel in tractors and equipment, enteric fermentation from livestock, manure management, rice cultivation methane, and direct nitrous oxide from fertilizers.

**India-Specific Sources:**
- Paddy cultivation (significant methane source)
- Livestock enteric fermentation
- Manure management
- Fertilizer application (N2O emissions)
- Farm machinery and pumps

**Calculation Methods:**
Use IPCC Tier 1 methods with India-specific emission factors where available. The Indian Council of Agricultural Research provides country-specific data.

**Key Emission Factors:**
- Paddy: 1.3 kg CH4 per hectare per day (varies by water management)
- Cattle enteric: 46 kg CH4 per head per year (dairy cattle)
- Nitrogen fertilizer: 1% of applied N released as N2O

**Reporting:**
Document all livestock numbers, cropped areas, fertilizer quantities, and fuel consumption. Apply appropriate GWP factors to convert CH4 and N2O to CO2 equivalent.`,
    tags: ['Scope 1', 'agriculture', 'India', 'GHG accounting', 'farm emissions'],
    category: 'agriculture',
    createdAt: '2025-01-01'
  },
  {
    id: '12',
    slug: 'logistics-scope-1-emissions-india',
    title: 'How do Logistics firms calculate Scope 1 emissions in India?',
    subtitle: 'Logistics Scope 1 Calculation in India',
    content: `Logistics firms calculate Scope 1 emissions, which are direct emissions from owned or controlled sources, by identifying and quantifying fuel consumption in owned trucks, vans, and delivery vehicles, as well as fuel for forklifts and warehouse equipment.

**India-Specific Considerations:**
- Mix of diesel, petrol, CNG, and increasingly electric vehicles
- Fuel quality variations across regions
- Adulteration factors in emission calculations

**Emission Factors (India):**
- Diesel: 2.68 kg CO2 per liter
- Petrol: 2.31 kg CO2 per liter
- CNG: 2.75 kg CO2 per kg

**Data Collection:**
Track fuel consumption by vehicle type. Use fleet management systems or fuel card data. For mixed fleets, segment by fuel type and vehicle category.

**Intensity Metrics:**
- g CO2 per tonne-kilometer
- g CO2 per delivery
- kg CO2 per vehicle per month

These metrics help benchmark performance and track improvements over time.`,
    tags: ['Scope 1', 'logistics', 'India', 'transport emissions', 'fleet management'],
    category: 'logistics',
    createdAt: '2025-01-01'
  },
  {
    id: '13',
    slug: 'carbon-credit-types-voluntary-markets',
    title: 'What are the different types of carbon credits in voluntary markets?',
    subtitle: 'Understanding Voluntary Carbon Markets',
    content: `Voluntary carbon markets offer several types of credits based on the project methodology and verification standard.

**By Project Type:**
1. **Renewable Energy:** Wind, solar, hydro projects displacing fossil fuel generation
2. **Forestry & Land Use:** Afforestation, reforestation, avoided deforestation (REDD+)
3. **Methane Capture:** Landfill gas, coal mine methane, agricultural methane
4. **Energy Efficiency:** Industrial efficiency, cookstoves, building retrofits
5. **Carbon Capture:** Direct air capture, enhanced weathering (emerging)

**By Standard:**
- **Verra (VCS):** Largest voluntary standard globally
- **Gold Standard:** Emphasizes sustainable development co-benefits
- **American Carbon Registry:** Strong in North American projects
- **Climate Action Reserve:** US-focused with rigorous protocols

**Quality Indicators:**
- Additionality: Would the reduction happen without credit revenue?
- Permanence: How long is carbon stored?
- Leakage: Does the project shift emissions elsewhere?
- Verification: Third-party validation and ongoing audits

Choose credits aligned with your sustainability narrative and stakeholder expectations.`,
    tags: ['carbon credits', 'voluntary markets', 'Verra', 'Gold Standard', 'offset types'],
    category: 'carbon-standards',
    createdAt: '2025-01-01'
  },
  {
    id: '14',
    slug: 'brsr-reporting-requirements-india',
    title: 'What are the BRSR reporting requirements for Indian companies?',
    subtitle: 'Business Responsibility and Sustainability Reporting',
    content: `The Business Responsibility and Sustainability Report (BRSR) is mandatory for the top 1000 listed companies in India by market capitalization, effective from FY 2022-23.

**Core Elements:**
1. **Section A:** General Disclosures (company profile, operations)
2. **Section B:** Management and Process Disclosures (policies, governance)
3. **Section C:** Principle-wise Performance Disclosures

**Environment-Related Requirements:**
- Energy consumption and intensity
- Water usage and recycling
- GHG emissions (Scope 1 and 2, Scope 3 for larger companies)
- Waste generation and management
- Air emissions beyond GHGs

**Scope 3 Expansion:**
BRSR Core (for assurance-ready reporting) includes Scope 3 emissions across material categories.

**Assurance:**
From FY 2023-24, reasonable assurance is required for select ESG parameters. The scope of assured parameters is expanding progressively.

**Best Practices:**
- Start data collection early
- Implement automated tracking systems
- Engage with value chain partners for Scope 3 data
- Consider voluntary GHG verification to build capability`,
    tags: ['BRSR', 'India regulations', 'ESG reporting', 'SEBI', 'sustainability disclosure'],
    category: 'regulations',
    createdAt: '2025-01-01'
  },
  {
    id: '15',
    slug: 'emission-factors-selection-guidance',
    title: 'How do we select the right emission factors for our calculations?',
    subtitle: 'Emission Factor Selection Guide',
    content: `Emission factor selection directly impacts the accuracy and credibility of your GHG inventory. Follow this hierarchy for choosing factors.

**Hierarchy of Data Quality:**
1. **Supplier-specific:** Direct measurement or verified data from your actual suppliers
2. **Product-specific:** Third-party verified Environmental Product Declarations
3. **Regional/Country:** National databases reflecting local production methods
4. **Industry average:** Sector benchmarks from recognized databases
5. **Global default:** IPCC default factors (least preferred)

**Key Databases:**
- India: CEA, Bureau of Energy Efficiency, MoPNG
- EU: Ecoinvent, GaBi, EU PEF database
- Global: IPCC, EPA, IEA, DEFRA (UK)

**Critical Considerations:**
- Match factor units to your activity data (kWh, liters, tonnes)
- Check factor boundaries (well-to-wheel vs tank-to-wheel)
- Update factors annually where possible
- Document factor sources and versions

**Common Mistakes:**
- Using outdated factors
- Mixing unit systems (metric vs imperial)
- Applying wrong boundaries (e.g., using production factor for consumption)
- Not adjusting for regional electricity mix`,
    tags: ['emission factors', 'data quality', 'GHG inventory', 'calculation accuracy', 'databases'],
    category: 'carbon-standards',
    createdAt: '2025-01-01'
  }
];

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
