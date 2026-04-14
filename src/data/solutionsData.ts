// Programmatic SEO Engine — 75 country×sector×regulation solution pages
// Each entry renders a unique landing page at /solutions/:slug

export interface SolutionStep {
  title: string;
  description: string;
}

export interface SolutionFAQ {
  question: string;
  answer: string;
}

export interface SolutionPage {
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  countryCode: string;
  countryName: string;
  sector: string;
  sectorLabel: string;
  regulation: 'cbam' | 'scope3' | 'carbon-audit' | 'green-finance';
  regulationLabel: string;
  painStatement: string;
  embeddedTool: 'cbam-estimator' | 'scope-estimator' | 'audit-checklist' | 'finance-score';
  steps: SolutionStep[];
  costBreakdown: { item: string; value: string }[];
  faqs: SolutionFAQ[];
  pillarLink: string;
  relatedIndustry: string;
  relatedSolutions: string[];
  relatedArticle: string;
}

// Helper to generate solution pages
function sol(
  countryCode: string,
  countryName: string,
  sector: string,
  sectorLabel: string,
  regulation: SolutionPage['regulation'],
  regulationLabel: string,
  painStatement: string,
  embeddedTool: SolutionPage['embeddedTool'],
  steps: SolutionStep[],
  costBreakdown: { item: string; value: string }[],
  faqs: SolutionFAQ[],
  pillarLink: string,
  relatedIndustry: string,
  relatedSolutions: string[],
  relatedArticle: string,
): SolutionPage {
  const slug = `${regulation}-${sector}-${countryName.toLowerCase().replace(/\s+/g, '-')}`;
  const title = `${regulationLabel} for ${sectorLabel} in ${countryName} — Senseible`;
  const metaDescription = `${painStatement.substring(0, 140)}. Free tools and compliance steps for ${sectorLabel.toLowerCase()} businesses in ${countryName}.`;
  const keywords = [
    `${regulationLabel} ${countryName}`,
    `${sectorLabel} carbon ${countryName}`,
    `${regulation} ${sector} MSME`,
    `carbon compliance ${countryName}`,
    `${sectorLabel} emissions ${countryName}`,
  ];
  return { slug, title, metaDescription, keywords, countryCode, countryName, sector, sectorLabel, regulation, regulationLabel, painStatement, embeddedTool, steps, costBreakdown, faqs, pillarLink, relatedIndustry, relatedSolutions, relatedArticle };
}

// CBAM steps template by country
const cbamSteps = (country: string, sector: string): SolutionStep[] => [
  { title: 'Map CBAM-Covered Products', description: `Identify which ${sector} exports from ${country} fall under EU CBAM CN codes.` },
  { title: 'Calculate Embedded Emissions', description: `Use Senseible to compute Scope 1 + 2 emissions per tonne of ${sector} product using country-specific grid factors.` },
  { title: 'Prepare CBAM Declaration', description: 'Generate quarterly CBAM reports with verified emission intensity data and methodology documentation.' },
  { title: 'Estimate Financial Exposure', description: 'Use the CBAM Calculator to project costs from 2026 to 2034 based on phase-in schedule and EU ETS prices.' },
  { title: 'Reduce and Offset', description: 'Implement reduction strategies and explore carbon credit monetization to lower net CBAM liability.' },
];

const scope3Steps = (country: string, sector: string): SolutionStep[] => [
  { title: 'Map Value Chain', description: `Identify all upstream and downstream emission sources in your ${sector} supply chain in ${country}.` },
  { title: 'Collect Supplier Data', description: 'Upload invoices from raw material suppliers, logistics providers, and service partners.' },
  { title: 'Apply Emission Factors', description: `Use ${country}-specific IEA grid factors and sector benchmarks for accurate Scope 3 calculations.` },
  { title: 'Generate GHG Report', description: 'Create GHG Protocol-compliant Scope 3 reports with category-wise breakdowns.' },
];

const auditSteps = (country: string, sector: string): SolutionStep[] => [
  { title: 'Upload Utility Bills', description: `Upload electricity, fuel, and water invoices from your ${sector} operations in ${country}.` },
  { title: 'Auto-Classify Emissions', description: 'Senseible AI classifies each line item into Scope 1, 2, or 3 with confidence scores.' },
  { title: 'Review Trust Score', description: 'Check data quality indicators and resolve any flagged inconsistencies before submission.' },
  { title: 'Download Audit Report', description: 'Generate a compliance-ready carbon audit report with full traceability to source documents.' },
];

const financeSteps = (country: string, sector: string): SolutionStep[] => [
  { title: 'Complete Carbon Profile', description: `Build your ${sector} company carbon profile with verified emission data from ${country} operations.` },
  { title: 'Check Eligibility', description: 'Senseible auto-matches your profile against green loan criteria from banks and DFIs.' },
  { title: 'Generate Disclosure', description: 'Create TCFD/CDP-aligned disclosures that lenders require for preferential green rates.' },
  { title: 'Apply with Data', description: 'Submit green loan applications with verified carbon data attached — no manual reporting needed.' },
];

export const solutionPages: SolutionPage[] = [
  // === INDIA (IN) — 8 pages ===
  sol('IN', 'India', 'steel', 'Steel Manufacturing', 'cbam', 'CBAM Compliance Cost', 'Indian steel exporters face up to 26% cost increase under EU CBAM by 2034. Most MSMEs lack emission intensity data required for quarterly CBAM declarations.', 'cbam-estimator',
    cbamSteps('India', 'steel'),
    [{ item: 'CBAM certificate cost (2026)', value: '€2-5/tonne' }, { item: 'Full liability (2034)', value: '€40-120/tonne' }, { item: 'Compliance setup time', value: '2-4 weeks' }, { item: 'Annual reporting cost (manual)', value: '₹5-15 lakh' }],
    [{ question: 'What is the CBAM cost for steel exports from India in 2026?', answer: 'In 2026, CBAM covers only 2.5% of emissions with 97.5% free allocation. For a typical Indian steel MSME exporting 1000 tonnes via BF-BOF route, the net CBAM cost is approximately €1,200-3,500 in the first year.' },
     { question: 'Do Indian steel MSMEs need to file CBAM reports?', answer: 'Yes. From 2026, EU importers must declare embedded emissions for all CBAM-covered steel products. Indian exporters need to provide verified emission intensity data per tonne of product.' },
     { question: 'How can Senseible help with CBAM compliance for steel?', answer: 'Senseible calculates emission intensity from your invoices using India-specific grid factors (0.708 kgCO₂/kWh), generates CBAM-ready reports, and projects costs through 2034.' }],
    '/cbam-calculator', 'steel', ['cbam-steel-bangladesh', 'scope3-steel-india', 'cbam-chemicals-india'], 'cbam-compliance-indian-exporters'),

  sol('IN', 'India', 'textile', 'Textile & Apparel', 'cbam', 'CBAM Readiness', 'India exports $14B in textiles to the EU annually. While textiles are not yet CBAM-covered, CSRD supply chain requirements mean EU buyers increasingly demand emission data from Indian suppliers.', 'cbam-estimator',
    cbamSteps('India', 'textile'),
    [{ item: 'Emission intensity (typical)', value: '3.2 kgCO₂/₹1000 revenue' }, { item: 'Grid factor (India)', value: '0.708 kgCO₂/kWh' }, { item: 'Compliance prep cost', value: '₹2-8 lakh' }],
    [{ question: 'Are Indian textile exports covered under CBAM?', answer: 'Not directly in the current CBAM scope, but EU CSRD requires large importers to report Scope 3 emissions from their supply chain, which includes Indian textile suppliers.' },
     { question: 'Why should textile MSMEs prepare for carbon reporting now?', answer: 'EU buyers are already requesting emission data from suppliers. Early movers get preferred vendor status and access to green finance.' }],
    '/cbam-calculator', 'textile', ['scope3-textile-india', 'scope3-textile-bangladesh', 'green-finance-textile-india'], 'green-finance-textile-exporters-step-by-step'),

  sol('IN', 'India', 'steel', 'Steel Manufacturing', 'scope3', 'Scope 3 Calculator', 'Steel MSMEs in India lack tools to measure value chain emissions. With 60% of emissions in Scope 3 (raw materials, logistics), incomplete reporting risks CBAM penalties and lost green finance.', 'scope-estimator',
    scope3Steps('India', 'steel'),
    [{ item: 'Scope 3 share (steel)', value: '55-65% of total' }, { item: 'Key categories', value: 'Cat 1 (materials), Cat 4 (transport)' }, { item: 'Data collection time', value: '1-3 weeks' }],
    [{ question: 'What percentage of steel emissions are Scope 3?', answer: 'For Indian steel MSMEs, Scope 3 typically accounts for 55-65% of total emissions, primarily from iron ore procurement (Category 1) and transportation (Category 4).' }],
    '/verify', 'steel', ['cbam-steel-india', 'carbon-audit-steel-india'], 'manufacturing-scope-3-emissions-india'),

  sol('IN', 'India', 'chemicals', 'Chemical Industry', 'cbam', 'CBAM Compliance', 'Indian chemical exporters shipping to the EU face CBAM declarations starting 2026. Fertilizers, hydrogen, and basic chemicals are directly covered under EU CBAM regulation.', 'cbam-estimator',
    cbamSteps('India', 'chemicals'),
    [{ item: 'CBAM-covered products', value: 'Ammonia, urea, nitric acid' }, { item: 'Default intensity (ammonia)', value: '2.5 tCO₂/tonne' }, { item: 'EU benchmark', value: '1.619 tCO₂/tonne' }],
    [{ question: 'Which Indian chemical exports are CBAM-covered?', answer: 'Ammonia (CN 2814), urea (CN 310210), ammonium nitrate (CN 310230), nitric acid (CN 2808), and hydrogen (CN 280410) are directly covered.' }],
    '/cbam-calculator', 'chemical', ['cbam-chemicals-indonesia', 'scope3-chemicals-india'], 'cbam-compliance-indian-exporters'),

  sol('IN', 'India', 'textile', 'Textile Exporters', 'scope3', 'Scope 3 Emissions Calculator', 'Tirupur and Surat textile exporters need Scope 3 data for EU buyer compliance. Raw cotton, dyes, and freight account for 70% of total emissions but remain unmeasured.', 'scope-estimator',
    scope3Steps('India', 'textile'),
    [{ item: 'Scope 3 share (textile)', value: '65-75% of total' }, { item: 'Top category', value: 'Raw material procurement' }, { item: 'Annual export value at risk', value: '$14B industry' }],
    [{ question: 'How do textile MSMEs calculate Scope 3 emissions?', answer: 'Upload supplier invoices for cotton, dyes, chemicals, and freight. Senseible applies India-specific emission factors to calculate Category 1, 4, and 9 Scope 3 emissions.' }],
    '/verify', 'textile', ['cbam-textile-india', 'green-finance-textile-india'], 'green-finance-textile-exporters-step-by-step'),

  sol('IN', 'India', 'manufacturing', 'Manufacturing SMEs', 'carbon-audit', 'Carbon Audit', 'Over 63 million Indian MSMEs lack any carbon measurement. Without a baseline audit, they cannot access green loans, carbon credits, or meet buyer ESG requirements.', 'audit-checklist',
    auditSteps('India', 'manufacturing'),
    [{ item: 'Audit completion time', value: '< 47 seconds per invoice' }, { item: 'Cost (Senseible)', value: 'Free for first 5 invoices' }, { item: 'Manual audit cost', value: '₹50,000-2,00,000' }],
    [{ question: 'How much does a carbon audit cost for Indian MSMEs?', answer: 'Traditional consultants charge ₹50,000 to ₹2,00,000. Senseible provides automated carbon audits starting free, with premium tiers from ₹999/month.' },
     { question: 'What documents do I need for a carbon audit?', answer: 'Electricity bills, fuel purchase invoices, freight receipts, and raw material purchase orders. Senseible extracts data automatically from uploaded documents.' }],
    '/verify', 'automobile', ['carbon-audit-manufacturing-philippines', 'carbon-audit-manufacturing-indonesia'], 'documents-needed-carbon-verification'),

  sol('IN', 'India', 'textile', 'Textile MSMEs', 'green-finance', 'Green Loan Eligibility', 'Indian textile MSMEs can access 2-3% lower interest rates through SIDBI and SBI green loan schemes, but 90% lack the emission data required for applications.', 'finance-score',
    financeSteps('India', 'textile'),
    [{ item: 'Interest rate benefit', value: '2-3% lower' }, { item: 'SIDBI green loan limit', value: '₹25 lakh - ₹10 crore' }, { item: 'Required data', value: 'Verified Scope 1+2 emissions' }],
    [{ question: 'How can textile MSMEs in India get green loans?', answer: 'SIDBI, SBI, and Yes Bank offer green financing for MSMEs with verified carbon data. Senseible generates the emission reports required for applications.' }],
    '/climate-finance', 'textile', ['green-finance-manufacturing-india', 'scope3-textile-india'], 'how-to-get-green-loans-india-carbon-data'),

  sol('IN', 'India', 'chemicals', 'Chemical SMEs', 'scope3', 'Scope 3 Reporting', 'Indian chemical manufacturers export $18B annually but cannot quantify supply chain emissions. Scope 3 Category 1 (purchased chemicals) dominates at 50-60% of total.', 'scope-estimator',
    scope3Steps('India', 'chemicals'),
    [{ item: 'Scope 3 share', value: '50-60%' }, { item: 'Grid factor', value: '0.708 kgCO₂/kWh' }, { item: 'Key categories', value: 'Cat 1, Cat 4, Cat 12' }],
    [{ question: 'How do chemical companies calculate Scope 3 in India?', answer: 'Upload raw material and logistics invoices. Senseible applies IPCC-aligned emission factors specific to Indian chemical manufacturing.' }],
    '/verify', 'chemical', ['cbam-chemicals-india', 'scope3-chemicals-indonesia'], 'manufacturing-scope-3-emissions-india'),

  // === BANGLADESH (BD) — 8 pages ===
  sol('BD', 'Bangladesh', 'textile', 'Textile & RMG', 'scope3', 'Scope 3 Calculator', 'Bangladesh is the 2nd largest garment exporter globally ($47B). EU buyers under CSRD now require Scope 3 data from Bangladeshi suppliers, but 95% of RMG factories lack any emission measurement.', 'scope-estimator',
    scope3Steps('Bangladesh', 'textile'),
    [{ item: 'Grid factor (BD)', value: '0.623 kgCO₂/kWh' }, { item: 'Industry at risk', value: '$47B RMG exports' }, { item: 'Factories affected', value: '4,000+ BGMEA members' }],
    [{ question: 'Why do Bangladeshi garment factories need Scope 3 data?', answer: 'EU CSRD requires large importers like H&M, Zara, and Primark to report supply chain emissions. Without data from Bangladeshi suppliers, orders may shift to compliant alternatives.' }],
    '/verify', 'textile', ['scope3-textile-india', 'green-finance-textile-bangladesh'], 'scope-3-calculator-bangladesh-textile-exporters'),

  sol('BD', 'Bangladesh', 'textile', 'Textile Manufacturers', 'cbam', 'CBAM Readiness', 'While textiles are not yet in CBAM scope, Bangladesh textile exporters face indirect pressure from EU CSRD supply chain reporting requirements affecting their European buyers.', 'cbam-estimator',
    cbamSteps('Bangladesh', 'textile'),
    [{ item: 'EU export share', value: '52% of total exports' }, { item: 'Grid factor', value: '0.623 kgCO₂/kWh' }, { item: 'Compliance deadline', value: 'CSRD: 2025-2026' }],
    [{ question: 'How does CBAM affect Bangladeshi textiles?', answer: 'Indirectly through CSRD. EU brands must report Scope 3 emissions which includes Bangladeshi supplier data. Factories without carbon data risk losing orders.' }],
    '/cbam-calculator', 'textile', ['scope3-textile-bangladesh', 'carbon-audit-textile-bangladesh'], 'eu-cbam-explained-emerging-market-exporters'),

  sol('BD', 'Bangladesh', 'manufacturing', 'Manufacturing SMEs', 'carbon-audit', 'Carbon Audit', 'Bangladeshi manufacturers face growing pressure from international buyers for emission disclosures. The DoE-ECA framework requires environmental compliance but lacks carbon-specific guidance for SMEs.', 'audit-checklist',
    auditSteps('Bangladesh', 'manufacturing'),
    [{ item: 'Grid factor', value: '0.623 kgCO₂/kWh' }, { item: 'Regulatory body', value: 'DoE (Department of Environment)' }, { item: 'Audit cost (manual)', value: 'BDT 2-5 lakh' }],
    [{ question: 'Is carbon auditing mandatory in Bangladesh?', answer: 'Not yet mandatory for SMEs, but international buyers and financing institutions increasingly require it. Early compliance creates competitive advantage.' }],
    '/verify', 'automobile', ['carbon-audit-manufacturing-india', 'carbon-audit-manufacturing-philippines'], 'documents-needed-carbon-verification'),

  sol('BD', 'Bangladesh', 'textile', 'Garment Exporters', 'green-finance', 'Green Finance Access', 'Bangladesh Bank offers green refinancing at 5% for eco-friendly projects, but garment factories lack the verified carbon data needed to qualify.', 'finance-score',
    financeSteps('Bangladesh', 'textile'),
    [{ item: 'Green refinance rate', value: '5% (Bangladesh Bank)' }, { item: 'Normal rate', value: '9-12%' }, { item: 'Savings potential', value: '4-7% interest reduction' }],
    [{ question: 'How can Bangladeshi garment factories access green loans?', answer: 'Bangladesh Bank and IFC offer green credit lines. Senseible generates the emission baseline reports required for applications.' }],
    '/climate-finance', 'textile', ['green-finance-textile-india', 'scope3-textile-bangladesh'], 'how-to-get-green-loans-india-carbon-data'),

  // === INDONESIA (ID) — 8 pages ===
  sol('ID', 'Indonesia', 'steel', 'Steel & Metal', 'cbam', 'CBAM Compliance', 'Indonesian steel and aluminum exports to the EU face direct CBAM obligations from 2026. With a grid factor of 0.761 kgCO₂/kWh (coal-heavy), emission intensity is among the highest in ASEAN.', 'cbam-estimator',
    cbamSteps('Indonesia', 'steel'),
    [{ item: 'Grid factor (ID)', value: '0.761 kgCO₂/kWh' }, { item: 'CBAM-covered exports', value: 'Steel, aluminum' }, { item: 'Carbon price (domestic)', value: '€2/tCO₂ (IDX Carbon)' }],
    [{ question: 'How much will CBAM cost Indonesian steel exporters?', answer: 'With Indonesia grid factor at 0.761 kgCO₂/kWh, steel exports face higher embedded emissions than India. Net CBAM costs could reach €50-140/tonne by 2034 for BF-BOF producers.' }],
    '/cbam-calculator', 'steel', ['cbam-steel-india', 'cbam-steel-vietnam'], 'eu-carbon-border-tax-impact-indonesian-chemical-exports'),

  sol('ID', 'Indonesia', 'chemicals', 'Chemical Manufacturing', 'cbam', 'EU Carbon Border Tax', 'Indonesian chemical exports including fertilizers and basic chemicals face CBAM declarations. OJK-ESG reporting requirements add domestic compliance pressure.', 'cbam-estimator',
    cbamSteps('Indonesia', 'chemicals'),
    [{ item: 'CBAM products', value: 'Fertilizers, ammonia, hydrogen' }, { item: 'OJK-ESG deadline', value: '2025 for listed companies' }, { item: 'PROPER rating needed', value: 'Blue or higher' }],
    [{ question: 'Which Indonesian chemical exports face CBAM?', answer: 'Ammonia, urea, nitric acid, and hydrogen exports to the EU require CBAM declarations from 2026. Fertilizer exports are particularly exposed.' }],
    '/cbam-calculator', 'chemical', ['cbam-chemicals-india', 'scope3-chemicals-indonesia'], 'eu-carbon-border-tax-impact-indonesian-chemical-exports'),

  sol('ID', 'Indonesia', 'manufacturing', 'Manufacturing SMEs', 'carbon-audit', 'Carbon Audit', 'Indonesia has 64 million MSMEs but less than 1% have any carbon measurement. OJK sustainability reporting and PROPER environmental ratings create growing compliance needs.', 'audit-checklist',
    auditSteps('Indonesia', 'manufacturing'),
    [{ item: 'Grid factor', value: '0.761 kgCO₂/kWh' }, { item: 'MSMEs in Indonesia', value: '64 million' }, { item: 'PROPER participants', value: '2,000+ companies' }],
    [{ question: 'Is carbon auditing required in Indonesia?', answer: 'PROPER environmental rating by KLHK covers 2,000+ companies. OJK requires ESG reporting for listed firms. SMEs benefit from voluntary audits for supply chain compliance.' }],
    '/verify', 'automobile', ['carbon-audit-manufacturing-india', 'carbon-audit-manufacturing-philippines'], 'carbon-audit-checklist-singapore-manufacturing'),

  sol('ID', 'Indonesia', 'food-processing', 'Food & Palm Oil', 'scope3', 'Scope 3 Emissions', 'Indonesian palm oil and food processing exports face increasing EU Deforestation Regulation (EUDR) scrutiny. Scope 3 emissions from land use change dominate the carbon footprint.', 'scope-estimator',
    scope3Steps('Indonesia', 'food processing'),
    [{ item: 'Scope 3 share (palm oil)', value: '80-90% of total' }, { item: 'Key factor', value: 'Land use change emissions' }, { item: 'EU regulation', value: 'EUDR + CSRD' }],
    [{ question: 'How are palm oil Scope 3 emissions calculated?', answer: 'Scope 3 for palm oil includes land use change, fertilizer inputs, and transportation. Senseible uses RSPO-aligned factors with Indonesia-specific grid data.' }],
    '/verify', 'automobile', ['scope3-food-processing-malaysia', 'scope3-manufacturing-indonesia'], 'malaysia-palm-oil-scope-1-2-3-emission-breakdown'),

  sol('ID', 'Indonesia', 'manufacturing', 'Manufacturing', 'green-finance', 'Green Finance Eligibility', 'OJK green taxonomy and Bank Indonesia green lending incentives offer preferential rates for Indonesian manufacturers with verified carbon data.', 'finance-score',
    financeSteps('Indonesia', 'manufacturing'),
    [{ item: 'OJK green taxonomy', value: 'Active since 2022' }, { item: 'Green sukuk available', value: 'Yes (sovereign + corporate)' }, { item: 'Interest benefit', value: '1-3% lower' }],
    [{ question: 'How can Indonesian manufacturers access green finance?', answer: 'OJK green taxonomy classifies eligible activities. Banks like BRI and Mandiri offer green credit lines. Senseible provides the verified emission data required.' }],
    '/climate-finance', 'automobile', ['green-finance-manufacturing-india', 'green-finance-textile-bangladesh'], 'green-loan-eligibility-pakistani-small-businesses'),

  // === PHILIPPINES (PH) — 7 pages ===
  sol('PH', 'Philippines', 'manufacturing', 'Manufacturing SMEs', 'carbon-audit', 'Carbon Audit', 'Philippine manufacturing SMEs exporting to the EU, US, and Japan face growing buyer demands for carbon data. DTI-EO and SEC-ESG frameworks create domestic compliance momentum.', 'audit-checklist',
    auditSteps('Philippines', 'manufacturing'),
    [{ item: 'Grid factor (PH)', value: '0.505 kgCO₂/kWh' }, { item: 'Tax ID', value: 'TIN' }, { item: 'Regulatory body', value: 'DTI' }],
    [{ question: 'Do Philippine manufacturers need carbon audits?', answer: 'SEC-ESG guidelines recommend sustainability reporting for listed companies. Export-oriented manufacturers benefit from voluntary audits to meet international buyer requirements.' }],
    '/verify', 'automobile', ['carbon-audit-manufacturing-india', 'carbon-audit-manufacturing-indonesia'], 'how-philippine-manufacturing-smes-start-carbon-reporting'),

  sol('PH', 'Philippines', 'food-processing', 'Food Processing', 'scope3', 'Scope 3 Calculator', 'Philippine food processing exports to Japan and the EU require supply chain emission data. Agricultural inputs, packaging, and cold chain logistics dominate Scope 3.', 'scope-estimator',
    scope3Steps('Philippines', 'food processing'),
    [{ item: 'Key export markets', value: 'Japan, EU, US' }, { item: 'Scope 3 share', value: '60-70%' }, { item: 'Top category', value: 'Agricultural inputs' }],
    [{ question: 'How does food processing Scope 3 work in the Philippines?', answer: 'Agricultural raw materials, packaging, refrigeration, and outbound logistics are the main Scope 3 categories. Senseible uses Philippines-specific factors (grid: 0.505).' }],
    '/verify', 'automobile', ['scope3-food-processing-indonesia', 'scope3-food-processing-thailand'], 'how-philippine-manufacturing-smes-start-carbon-reporting'),

  sol('PH', 'Philippines', 'manufacturing', 'Manufacturing Companies', 'green-finance', 'Green Finance', 'BSP sustainable finance framework and Asian Development Bank green credit lines are available for Philippine manufacturers with verified carbon baselines.', 'finance-score',
    financeSteps('Philippines', 'manufacturing'),
    [{ item: 'BSP framework', value: 'Sustainable Finance (2020)' }, { item: 'ADB green credit', value: 'Available via local banks' }, { item: 'Interest benefit', value: '1-2% lower' }],
    [{ question: 'What green finance options exist for Philippine manufacturers?', answer: 'BSP sustainable finance framework, ADB green lending facilities, and local bank green loan programs. Carbon verification data is the key requirement.' }],
    '/climate-finance', 'automobile', ['green-finance-manufacturing-indonesia', 'green-finance-manufacturing-india'], 'green-loan-eligibility-pakistani-small-businesses'),

  sol('PH', 'Philippines', 'logistics', 'Logistics & Shipping', 'carbon-audit', 'Fleet Carbon Audit', 'Philippine logistics companies need fleet emission data for ISO 14083 compliance and international shipping carbon reporting requirements.', 'audit-checklist',
    auditSteps('Philippines', 'logistics'),
    [{ item: 'Fleet diesel benchmark', value: '2.68 kgCO₂/liter' }, { item: 'ISO standard', value: 'ISO 14083 (transport)' }, { item: 'Audit scope', value: 'Fleet + warehousing' }],
    [{ question: 'How do logistics companies in the Philippines track carbon?', answer: 'Upload fuel purchase receipts and electricity bills. Senseible calculates fleet Scope 1 emissions and warehouse Scope 2 using Philippine grid factors.' }],
    '/verify', 'automobile', ['carbon-audit-logistics-vietnam', 'carbon-audit-manufacturing-philippines'], 'logistics-scope-1-emissions-india'),

  // === PAKISTAN (PK) — 7 pages ===
  sol('PK', 'Pakistan', 'textile', 'Textile & Apparel', 'scope3', 'Scope 3 Reporting', 'Pakistan is the 5th largest cotton producer. EU buyers demand Scope 3 data from Pakistani textile suppliers. Without compliance, $3.2B in EU textile exports are at risk.', 'scope-estimator',
    scope3Steps('Pakistan', 'textile'),
    [{ item: 'Grid factor (PK)', value: '0.495 kgCO₂/kWh' }, { item: 'EU textile exports', value: '$3.2B annually' }, { item: 'Tax ID', value: 'NTN' }],
    [{ question: 'Why do Pakistani textile exporters need Scope 3 data?', answer: 'EU CSRD requires brands like H&M and Zara to report Scope 3 supply chain emissions. Pakistani suppliers without data risk losing contracts to compliant competitors.' }],
    '/verify', 'textile', ['scope3-textile-bangladesh', 'scope3-textile-india'], 'scope-3-calculator-bangladesh-textile-exporters'),

  sol('PK', 'Pakistan', 'manufacturing', 'Manufacturing SMEs', 'green-finance', 'Green Finance Access', 'SBP green banking guidelines and IFC green credit lines offer Pakistani manufacturers preferential rates, but verified carbon baselines are required.', 'finance-score',
    financeSteps('Pakistan', 'manufacturing'),
    [{ item: 'SBP green banking', value: 'Guidelines active' }, { item: 'IFC credit lines', value: 'Via HBL, UBL, MCB' }, { item: 'Interest benefit', value: '2-4% lower' }],
    [{ question: 'How can Pakistani SMEs access green loans?', answer: 'State Bank of Pakistan green banking guidelines enable commercial banks to offer preferential rates. IFC green credit facilities are available through HBL, UBL, and MCB.' }],
    '/climate-finance', 'automobile', ['green-finance-manufacturing-india', 'green-finance-manufacturing-indonesia'], 'green-loan-eligibility-pakistani-small-businesses'),

  sol('PK', 'Pakistan', 'textile', 'Textile Manufacturers', 'carbon-audit', 'Carbon Audit', 'Pakistani textile manufacturers in Faisalabad and Sialkot lack carbon measurement tools. SECP-ESG guidelines and buyer requirements create urgency for baseline audits.', 'audit-checklist',
    auditSteps('Pakistan', 'textile'),
    [{ item: 'Grid factor', value: '0.495 kgCO₂/kWh' }, { item: 'Key clusters', value: 'Faisalabad, Sialkot, Lahore' }, { item: 'SECP requirement', value: 'ESG reporting (listed)' }],
    [{ question: 'What does a carbon audit cover for Pakistani textile factories?', answer: 'Electricity consumption, generator fuel, boiler fuel for dyeing, chemical inputs, and logistics. Senseible auto-classifies into Scope 1, 2, 3 using Pakistan-specific factors.' }],
    '/verify', 'textile', ['carbon-audit-textile-bangladesh', 'carbon-audit-manufacturing-india'], 'documents-needed-carbon-verification'),

  sol('PK', 'Pakistan', 'food-processing', 'Food Processing', 'scope3', 'Scope 3 Emissions', 'Pakistan food processing industry exports $5B annually. Agricultural supply chain and cold storage emissions remain unmeasured, limiting access to EU markets and green finance.', 'scope-estimator',
    scope3Steps('Pakistan', 'food processing'),
    [{ item: 'Export value', value: '$5B annually' }, { item: 'Key products', value: 'Rice, seafood, fruits' }, { item: 'Scope 3 share', value: '65-75%' }],
    [{ question: 'How are food processing Scope 3 emissions calculated in Pakistan?', answer: 'Agricultural inputs, packaging materials, refrigeration energy, and outbound logistics are the primary Scope 3 categories. Pakistan grid factor (0.495) applies to cold chain electricity.' }],
    '/verify', 'automobile', ['scope3-food-processing-indonesia', 'scope3-food-processing-thailand'], 'thailand-food-processing-carbon-footprint-reduction'),

  // === SINGAPORE (SG) — 6 pages ===
  sol('SG', 'Singapore', 'manufacturing', 'Precision Manufacturing', 'carbon-audit', 'Carbon Audit', 'Singapore Carbon Tax at S$25/tCO₂ (rising to S$45 by 2026) affects facilities emitting 25,000+ tCO₂/year. Even smaller manufacturers need audits for supply chain compliance and ESG reporting.', 'audit-checklist',
    auditSteps('Singapore', 'manufacturing'),
    [{ item: 'Carbon tax (2026)', value: 'S$45/tCO₂' }, { item: 'Grid factor (SG)', value: '0.408 kgCO₂/kWh' }, { item: 'Tax ID', value: 'UEN' }, { item: 'SGX ESG reporting', value: 'Mandatory (listed)' }],
    [{ question: 'Is carbon auditing mandatory in Singapore?', answer: 'NEA requires facilities emitting 25,000+ tCO₂/year to report. SGX mandates ESG reporting for listed companies. Voluntary audits benefit all manufacturers for supply chain compliance.' }],
    '/verify', 'automobile', ['carbon-audit-manufacturing-philippines', 'carbon-audit-manufacturing-indonesia'], 'carbon-audit-checklist-singapore-manufacturing'),

  sol('SG', 'Singapore', 'chemicals', 'Chemical & Petrochemical', 'scope3', 'Scope 3 Reporting', 'Singapore Jurong Island chemical cluster produces $80B in output. SGX-ESG reporting and Carbon Tax Act require comprehensive emission measurement including Scope 3.', 'scope-estimator',
    scope3Steps('Singapore', 'chemicals'),
    [{ item: 'Carbon tax', value: 'S$25-45/tCO₂' }, { item: 'Jurong Island output', value: '$80B annually' }, { item: 'Scope 3 share', value: '45-55%' }],
    [{ question: 'How do Singapore chemical companies report Scope 3?', answer: 'SGX-ESG guidelines follow TCFD recommendations. Senseible maps supplier invoices to GHG Protocol Scope 3 categories using Singapore-specific emission factors.' }],
    '/verify', 'chemical', ['scope3-chemicals-india', 'scope3-chemicals-indonesia'], 'carbon-audit-checklist-singapore-manufacturing'),

  sol('SG', 'Singapore', 'logistics', 'Logistics & Trade', 'carbon-audit', 'Supply Chain Carbon Audit', 'Singapore as a global trade hub handles $1T+ in annual trade. Logistics companies need carbon audits for ISO 14083 compliance and shipper ESG requirements.', 'audit-checklist',
    auditSteps('Singapore', 'logistics'),
    [{ item: 'Trade value', value: '$1T+ annually' }, { item: 'ISO standard', value: 'ISO 14083' }, { item: 'Grid factor', value: '0.408 kgCO₂/kWh' }],
    [{ question: 'Why do Singapore logistics companies need carbon audits?', answer: 'IMO carbon intensity indicator (CII), ISO 14083, and shipper ESG requirements create compliance needs. Singapore Carbon Tax adds cost pressure for high-emission facilities.' }],
    '/verify', 'automobile', ['carbon-audit-logistics-philippines', 'carbon-audit-manufacturing-singapore'], 'logistics-scope-1-emissions-india'),

  sol('SG', 'Singapore', 'manufacturing', 'Manufacturing', 'green-finance', 'Green Finance', 'MAS Green Finance Action Plan and Singapore Green Bond Framework offer preferential financing for companies with verified emission baselines.', 'finance-score',
    financeSteps('Singapore', 'manufacturing'),
    [{ item: 'MAS GFAP', value: 'Active since 2019' }, { item: 'Green bond market', value: 'S$25B+ issued' }, { item: 'Grant support', value: 'Enterprise Sustainability Programme' }],
    [{ question: 'What green finance options exist in Singapore?', answer: 'MAS Green Finance Action Plan, DBS/OCBC/UOB green loans, Enterprise Sustainability Programme grants, and transition financing for hard-to-abate sectors.' }],
    '/climate-finance', 'automobile', ['green-finance-manufacturing-india', 'green-finance-manufacturing-indonesia'], 'green-loan-eligibility-pakistani-small-businesses'),

  // === VIETNAM (VN) — 7 pages ===
  sol('VN', 'Vietnam', 'steel', 'Steel Manufacturing', 'cbam', 'CBAM Compliance', 'Vietnam exports $3.5B in steel to the EU. With a grid factor of 0.625 kgCO₂/kWh and heavy coal dependence, Vietnamese steel faces significant CBAM exposure from 2026.', 'cbam-estimator',
    cbamSteps('Vietnam', 'steel'),
    [{ item: 'Grid factor (VN)', value: '0.625 kgCO₂/kWh' }, { item: 'EU steel exports', value: '$3.5B' }, { item: 'Tax ID', value: 'MST' }, { item: 'Regulatory body', value: 'MONRE' }],
    [{ question: 'How does CBAM affect Vietnamese steel exports?', answer: 'Vietnamese steel exports to the EU require CBAM declarations from 2026. With grid factor at 0.625, emission intensity is moderate but CBAM costs could reach €30-100/tonne by 2034.' }],
    '/cbam-calculator', 'steel', ['cbam-steel-india', 'cbam-steel-indonesia'], 'how-vietnamese-exporters-prepare-eu-cbam-90-days'),

  sol('VN', 'Vietnam', 'textile', 'Textile & Garment', 'scope3', 'Scope 3 Calculator', 'Vietnam is the 3rd largest garment exporter globally ($39B). EU and US buyers require supply chain carbon data. Scope 3 from cotton imports and logistics dominates.', 'scope-estimator',
    scope3Steps('Vietnam', 'textile'),
    [{ item: 'Garment exports', value: '$39B annually' }, { item: 'Grid factor', value: '0.625 kgCO₂/kWh' }, { item: 'Scope 3 share', value: '65-75%' }],
    [{ question: 'How do Vietnamese garment factories calculate Scope 3?', answer: 'Upload supplier invoices for cotton, fabric, dyes, and freight. Senseible applies Vietnam-specific emission factors and IEA grid data for accurate calculations.' }],
    '/verify', 'textile', ['scope3-textile-bangladesh', 'scope3-textile-india'], 'how-vietnamese-exporters-prepare-eu-cbam-90-days'),

  sol('VN', 'Vietnam', 'manufacturing', 'Manufacturing SMEs', 'carbon-audit', 'Carbon Audit', 'MONRE-EIA requirements and growing FDI-linked ESG requirements push Vietnamese manufacturers toward carbon measurement. 97% of Vietnamese businesses are SMEs.', 'audit-checklist',
    auditSteps('Vietnam', 'manufacturing'),
    [{ item: 'SME share', value: '97% of businesses' }, { item: 'Grid factor', value: '0.625 kgCO₂/kWh' }, { item: 'Framework', value: 'MONRE-EIA' }],
    [{ question: 'Is carbon auditing mandatory in Vietnam?', answer: 'Vietnam National Climate Change Strategy targets net-zero by 2050. MONRE requires environmental impact assessments for large projects. Voluntary audits benefit SMEs for supply chain compliance.' }],
    '/verify', 'automobile', ['carbon-audit-manufacturing-indonesia', 'carbon-audit-manufacturing-philippines'], 'how-vietnamese-exporters-prepare-eu-cbam-90-days'),

  sol('VN', 'Vietnam', 'food-processing', 'Food & Seafood', 'scope3', 'Scope 3 Emissions', 'Vietnam seafood exports ($9B) face EU EUDR and CSRD scrutiny. Aquaculture feed, cold chain, and processing emissions need measurement for market access.', 'scope-estimator',
    scope3Steps('Vietnam', 'food processing'),
    [{ item: 'Seafood exports', value: '$9B annually' }, { item: 'Key markets', value: 'EU, US, Japan' }, { item: 'Scope 3 share', value: '70-80%' }],
    [{ question: 'How are seafood processing emissions calculated in Vietnam?', answer: 'Aquaculture feed (Category 1), cold chain electricity (Category 3), packaging (Category 1), and outbound logistics (Category 4, 9) are the main Scope 3 categories.' }],
    '/verify', 'automobile', ['scope3-food-processing-indonesia', 'scope3-food-processing-thailand'], 'thailand-food-processing-carbon-footprint-reduction'),

  // === THAILAND (TH) — 7 pages ===
  sol('TH', 'Thailand', 'food-processing', 'Food Processing', 'scope3', 'Scope 3 Calculator', 'Thailand is the world largest canned tuna exporter and a top-5 food exporter. EU buyers demand supply chain carbon data under CSRD. Agricultural inputs dominate Scope 3.', 'scope-estimator',
    scope3Steps('Thailand', 'food processing'),
    [{ item: 'Grid factor (TH)', value: '0.493 kgCO₂/kWh' }, { item: 'Food exports', value: '$35B annually' }, { item: 'Key products', value: 'Tuna, rice, sugar, chicken' }],
    [{ question: 'How do Thai food processors calculate Scope 3 emissions?', answer: 'Agricultural procurement, packaging, cold storage electricity, and distribution logistics are the primary categories. Thailand grid factor (0.493) applies to processing facility electricity.' }],
    '/verify', 'automobile', ['scope3-food-processing-indonesia', 'scope3-food-processing-vietnam'], 'thailand-food-processing-carbon-footprint-reduction'),

  sol('TH', 'Thailand', 'manufacturing', 'Manufacturing', 'carbon-audit', 'Carbon Audit', 'TGO Carbon Footprint Organization program and SEC-ESG reporting requirements create compliance needs for Thai manufacturers exporting to EU and US markets.', 'audit-checklist',
    auditSteps('Thailand', 'manufacturing'),
    [{ item: 'Grid factor', value: '0.493 kgCO₂/kWh' }, { item: 'TGO CFO', value: 'Carbon Footprint Organization program' }, { item: 'SEC requirement', value: 'ESG reporting (listed)' }],
    [{ question: 'What is TGO CFO certification in Thailand?', answer: 'Thailand Greenhouse Gas Management Organization (TGO) Carbon Footprint Organization program certifies companies that measure and report their organizational carbon footprint.' }],
    '/verify', 'automobile', ['carbon-audit-manufacturing-vietnam', 'carbon-audit-manufacturing-indonesia'], 'carbon-audit-checklist-singapore-manufacturing'),

  sol('TH', 'Thailand', 'chemicals', 'Chemical & Petrochemical', 'cbam', 'CBAM Exposure', 'Thailand petrochemical exports to the EU include CBAM-covered basic chemicals. PTT and SCG supply chains require emission data from upstream SME suppliers.', 'cbam-estimator',
    cbamSteps('Thailand', 'chemicals'),
    [{ item: 'Grid factor', value: '0.493 kgCO₂/kWh' }, { item: 'CBAM products', value: 'Basic chemicals, fertilizers' }, { item: 'Major players', value: 'PTT, SCG supply chains' }],
    [{ question: 'Which Thai chemical exports face CBAM?', answer: 'Ammonia, fertilizers, and hydrogen exports to the EU require CBAM declarations. Thai petrochemical SMEs in PTT and SCG supply chains need emission data for compliance.' }],
    '/cbam-calculator', 'chemical', ['cbam-chemicals-india', 'cbam-chemicals-indonesia'], 'eu-carbon-border-tax-impact-indonesian-chemical-exports'),

  sol('TH', 'Thailand', 'manufacturing', 'Manufacturing SMEs', 'green-finance', 'Green Finance', 'Bank of Thailand sustainable banking guidelines and Thai Taxonomy offer green lending incentives for manufacturers with verified carbon data.', 'finance-score',
    financeSteps('Thailand', 'manufacturing'),
    [{ item: 'Thai Taxonomy', value: 'Phase 1 active (2023)' }, { item: 'Green bond market', value: 'THB 300B+ issued' }, { item: 'Interest benefit', value: '0.5-2% lower' }],
    [{ question: 'How can Thai manufacturers access green finance?', answer: 'Bank of Thailand sustainable banking guidelines enable commercial banks to offer preferential rates. Thai Taxonomy classifies eligible green activities.' }],
    '/climate-finance', 'automobile', ['green-finance-manufacturing-singapore', 'green-finance-manufacturing-indonesia'], 'green-loan-eligibility-pakistani-small-businesses'),

  // === MALAYSIA (MY) — 6 pages ===
  sol('MY', 'Malaysia', 'food-processing', 'Palm Oil & Food', 'scope3', 'Scope 3 Emissions', 'Malaysia produces 25% of global palm oil. EU Deforestation Regulation (EUDR) and CSRD require emission data across the palm oil value chain from plantation to refinery.', 'scope-estimator',
    scope3Steps('Malaysia', 'food processing'),
    [{ item: 'Grid factor (MY)', value: '0.585 kgCO₂/kWh' }, { item: 'Palm oil production', value: '25% of global output' }, { item: 'EUDR compliance', value: 'Required from 2025' }],
    [{ question: 'How are palm oil Scope 3 emissions measured in Malaysia?', answer: 'RSPO-aligned methodology covers plantation land use, mill processing, refinery energy, and transportation. Land use change emissions are the largest component.' }],
    '/verify', 'automobile', ['scope3-food-processing-indonesia', 'scope3-food-processing-thailand'], 'malaysia-palm-oil-scope-1-2-3-emission-breakdown'),

  sol('MY', 'Malaysia', 'manufacturing', 'Manufacturing', 'carbon-audit', 'Carbon Audit', 'Bursa Malaysia ESG reporting and MyCarbon platform create compliance requirements. The National Energy Transition Roadmap targets net-zero by 2050.', 'audit-checklist',
    auditSteps('Malaysia', 'manufacturing'),
    [{ item: 'Grid factor', value: '0.585 kgCO₂/kWh' }, { item: 'Bursa ESG', value: 'Enhanced reporting (2024)' }, { item: 'MyCarbon', value: 'National GHG reporting platform' }],
    [{ question: 'Is carbon auditing mandatory in Malaysia?', answer: 'Bursa Malaysia requires enhanced ESG reporting for listed companies. MyCarbon platform provides voluntary GHG reporting. Manufacturing exporters benefit from audits for buyer compliance.' }],
    '/verify', 'automobile', ['carbon-audit-manufacturing-thailand', 'carbon-audit-manufacturing-singapore'], 'carbon-audit-checklist-singapore-manufacturing'),

  sol('MY', 'Malaysia', 'manufacturing', 'Manufacturing SMEs', 'green-finance', 'Green Finance', 'Bank Negara Malaysia Climate Change and Principle-based Taxonomy (CCPT) and green sukuk market offer financing for manufacturers with verified carbon baselines.', 'finance-score',
    financeSteps('Malaysia', 'manufacturing'),
    [{ item: 'CCPT taxonomy', value: 'Active since 2021' }, { item: 'Green sukuk', value: 'MYR 10B+ issued' }, { item: 'SRI Sukuk Framework', value: 'Available' }],
    [{ question: 'What green finance is available for Malaysian manufacturers?', answer: 'Bank Negara CCPT classifies green activities. Green sukuk, SRI funds, and commercial bank green loans are available. Verified carbon data is the key eligibility criterion.' }],
    '/climate-finance', 'automobile', ['green-finance-manufacturing-singapore', 'green-finance-manufacturing-thailand'], 'green-loan-eligibility-pakistani-small-businesses'),

  sol('MY', 'Malaysia', 'chemicals', 'Chemical & Petrochemical', 'scope3', 'Scope 3 Reporting', 'Malaysia PETRONAS supply chain and Pengerang chemical hub require comprehensive Scope 3 reporting. Bursa ESG enhanced reporting adds compliance pressure.', 'scope-estimator',
    scope3Steps('Malaysia', 'chemicals'),
    [{ item: 'Grid factor', value: '0.585 kgCO₂/kWh' }, { item: 'Petronas supply chain', value: 'Extensive SME network' }, { item: 'Scope 3 share', value: '50-60%' }],
    [{ question: 'How do Malaysian chemical companies report Scope 3?', answer: 'PETRONAS supplier requirements and Bursa ESG guidelines follow GHG Protocol. Senseible maps supplier invoices to Scope 3 categories using Malaysia-specific emission factors.' }],
    '/verify', 'chemical', ['scope3-chemicals-singapore', 'scope3-chemicals-india'], 'malaysia-palm-oil-scope-1-2-3-emission-breakdown'),

  // === SRI LANKA (LK) — 6 pages ===
  sol('LK', 'Sri Lanka', 'textile', 'Apparel & Textile', 'scope3', 'Scope 3 Calculator', 'Sri Lanka apparel exports ($5.5B) to EU and US buyers face growing carbon disclosure requirements. MAS Holdings and Brandix supply chains need Scope 3 data from SME suppliers.', 'scope-estimator',
    scope3Steps('Sri Lanka', 'textile'),
    [{ item: 'Grid factor (LK)', value: '0.462 kgCO₂/kWh' }, { item: 'Apparel exports', value: '$5.5B annually' }, { item: 'Key buyers', value: 'Nike, Victoria Secret, Gap' }],
    [{ question: 'Why do Sri Lankan textile factories need Scope 3 data?', answer: 'Global brands like Nike and Gap require supply chain emission data under their SBTi commitments. Sri Lankan apparel SMEs in MAS Holdings and Brandix supply chains need to comply.' }],
    '/verify', 'textile', ['scope3-textile-bangladesh', 'scope3-textile-india'], 'msme-carbon-credits-sri-lanka-invoice-to-revenue'),

  sol('LK', 'Sri Lanka', 'manufacturing', 'Manufacturing SMEs', 'carbon-audit', 'Carbon Audit', 'CEA-EIA framework requires environmental assessments but lacks carbon-specific guidance. Sri Lankan manufacturers need audits for international buyer compliance.', 'audit-checklist',
    auditSteps('Sri Lanka', 'manufacturing'),
    [{ item: 'Grid factor', value: '0.462 kgCO₂/kWh' }, { item: 'Regulatory body', value: 'CEA' }, { item: 'Renewable share', value: '~30% (hydro)' }],
    [{ question: 'Is carbon auditing required in Sri Lanka?', answer: 'CEA requires environmental impact assessments for large projects but carbon auditing is voluntary for SMEs. International buyer requirements drive adoption.' }],
    '/verify', 'automobile', ['carbon-audit-manufacturing-india', 'carbon-audit-manufacturing-philippines'], 'msme-carbon-credits-sri-lanka-invoice-to-revenue'),

  sol('LK', 'Sri Lanka', 'manufacturing', 'Manufacturing', 'green-finance', 'Green Finance', 'CBSL sustainable finance guidelines and ADB green credit lines offer preferential rates for Sri Lankan manufacturers with verified emission data.', 'finance-score',
    financeSteps('Sri Lanka', 'manufacturing'),
    [{ item: 'CBSL guidelines', value: 'Sustainable finance (2019)' }, { item: 'ADB support', value: 'Green credit lines active' }, { item: 'Interest benefit', value: '1-3% lower' }],
    [{ question: 'How can Sri Lankan manufacturers access green finance?', answer: 'CBSL sustainable finance guidelines enable commercial banks to offer green loans. ADB and IFC provide credit lines. Verified carbon data from Senseible is the key requirement.' }],
    '/climate-finance', 'automobile', ['green-finance-manufacturing-india', 'green-finance-manufacturing-indonesia'], 'msme-carbon-credits-sri-lanka-invoice-to-revenue'),

  sol('LK', 'Sri Lanka', 'food-processing', 'Tea & Food Processing', 'scope3', 'Scope 3 Emissions', 'Sri Lanka Ceylon tea exports ($1.3B) face sustainability scrutiny from EU buyers. Processing energy, plantation inputs, and logistics need Scope 3 measurement.', 'scope-estimator',
    scope3Steps('Sri Lanka', 'food processing'),
    [{ item: 'Tea exports', value: '$1.3B annually' }, { item: 'Key markets', value: 'EU, Russia, Middle East' }, { item: 'Scope 3 share', value: '60-70%' }],
    [{ question: 'How are tea processing emissions calculated in Sri Lanka?', answer: 'Plantation inputs, withering/drying energy, packaging, and outbound logistics form the Scope 3 profile. Sri Lanka lower grid factor (0.462) benefits electricity-intensive processing.' }],
    '/verify', 'automobile', ['scope3-food-processing-indonesia', 'scope3-food-processing-thailand'], 'msme-carbon-credits-sri-lanka-invoice-to-revenue'),

  // === Additional high-intent pages ===
  sol('IN', 'India', 'manufacturing', 'Manufacturing MSMEs', 'green-finance', 'Green Loan Eligibility', 'SIDBI green loan schemes and RBI priority sector lending offer 2-4% lower rates for manufacturers with verified carbon data. Less than 5% of eligible MSMEs have applied.', 'finance-score',
    financeSteps('India', 'manufacturing'),
    [{ item: 'SIDBI green rate', value: '8-10% vs 12-14% normal' }, { item: 'RBI PSL benefit', value: 'Priority classification' }, { item: 'Eligible MSMEs', value: '63 million' }],
    [{ question: 'How do Indian manufacturers qualify for green loans?', answer: 'SIDBI, SBI, and ICICI offer green financing. Requirements include verified Scope 1+2 emissions baseline, reduction plan, and ESG disclosure. Senseible generates all required reports.' }],
    '/climate-finance', 'automobile', ['green-finance-textile-india', 'carbon-audit-manufacturing-india'], 'how-to-get-green-loans-india-carbon-data'),

  sol('VN', 'Vietnam', 'manufacturing', 'Manufacturing', 'green-finance', 'Green Finance', 'State Bank of Vietnam (SBV) green credit growth policy and IFC credit lines offer preferential rates for manufacturers with verified carbon data.', 'finance-score',
    financeSteps('Vietnam', 'manufacturing'),
    [{ item: 'SBV green credit', value: 'Active since 2018' }, { item: 'IFC lines', value: 'Via Vietcombank, BIDV' }, { item: 'Interest benefit', value: '1-3% lower' }],
    [{ question: 'How can Vietnamese manufacturers access green finance?', answer: 'SBV green credit policy enables commercial banks to offer preferential rates. IFC and ADB provide green credit facilities through local banks.' }],
    '/climate-finance', 'automobile', ['green-finance-manufacturing-indonesia', 'green-finance-manufacturing-thailand'], 'how-vietnamese-exporters-prepare-eu-cbam-90-days'),

  sol('BD', 'Bangladesh', 'steel', 'Steel & Metal', 'cbam', 'CBAM Compliance', 'Bangladesh steel exports to the EU, though smaller than India, face the same CBAM declaration requirements from 2026. Grid factor of 0.623 drives moderate emission intensity.', 'cbam-estimator',
    cbamSteps('Bangladesh', 'steel'),
    [{ item: 'Grid factor', value: '0.623 kgCO₂/kWh' }, { item: 'CBAM products', value: 'Steel, re-rolled products' }, { item: 'Carbon price', value: '€0 (no domestic)' }],
    [{ question: 'Does Bangladesh steel face CBAM obligations?', answer: 'Yes. Any steel product exported to the EU from Bangladesh requires CBAM declaration from 2026, regardless of volume. No domestic carbon price means zero credit against CBAM liability.' }],
    '/cbam-calculator', 'steel', ['cbam-steel-india', 'cbam-steel-vietnam'], 'eu-cbam-explained-emerging-market-exporters'),

  sol('ID', 'Indonesia', 'textile', 'Textile & Garment', 'scope3', 'Scope 3 Reporting', 'Indonesia textile exports ($14B) to EU and US face CSRD supply chain requirements. High grid factor (0.761) means Scope 2 is proportionally larger than regional peers.', 'scope-estimator',
    scope3Steps('Indonesia', 'textile'),
    [{ item: 'Grid factor', value: '0.761 kgCO₂/kWh' }, { item: 'Textile exports', value: '$14B annually' }, { item: 'Scope 2 impact', value: 'Higher than ASEAN average' }],
    [{ question: 'Why does Indonesia grid factor matter for textile Scope 3?', answer: 'At 0.761 kgCO₂/kWh (coal-heavy), Indonesian textile Scope 2 is 50% higher than Vietnam and 85% higher than Singapore. This affects total supply chain emissions reported to EU buyers.' }],
    '/verify', 'textile', ['scope3-textile-vietnam', 'scope3-textile-bangladesh'], 'eu-carbon-border-tax-impact-indonesian-chemical-exports'),

  sol('VN', 'Vietnam', 'chemicals', 'Chemical Industry', 'cbam', 'CBAM Readiness', 'Vietnam chemical exports to EU face CBAM obligations. MONRE environmental regulations and growing EU trade links make carbon compliance increasingly urgent.', 'cbam-estimator',
    cbamSteps('Vietnam', 'chemicals'),
    [{ item: 'Grid factor', value: '0.625 kgCO₂/kWh' }, { item: 'CBAM products', value: 'Fertilizers, basic chemicals' }, { item: 'Net-zero target', value: '2050' }],
    [{ question: 'Which Vietnamese chemical exports face CBAM?', answer: 'Ammonia, fertilizers, and hydrogen exports to the EU. Vietnam MONRE-EIA framework provides the regulatory basis for emission measurement.' }],
    '/cbam-calculator', 'chemical', ['cbam-chemicals-thailand', 'cbam-chemicals-india'], 'how-vietnamese-exporters-prepare-eu-cbam-90-days'),

  sol('TH', 'Thailand', 'textile', 'Textile & Garment', 'scope3', 'Scope 3 Calculator', 'Thailand textile exports ($7B) to EU face CSRD scrutiny. TGO Carbon Footprint program provides framework but most SME suppliers lack Scope 3 measurement capability.', 'scope-estimator',
    scope3Steps('Thailand', 'textile'),
    [{ item: 'Grid factor', value: '0.493 kgCO₂/kWh' }, { item: 'Textile exports', value: '$7B annually' }, { item: 'TGO participation', value: 'Growing among SMEs' }],
    [{ question: 'How do Thai textile SMEs measure Scope 3?', answer: 'Upload supplier invoices for cotton, fabric, and logistics. Senseible uses Thailand-specific emission factors (grid: 0.493) and TGO-aligned methodology.' }],
    '/verify', 'textile', ['scope3-textile-vietnam', 'scope3-textile-india'], 'thailand-food-processing-carbon-footprint-reduction'),

  sol('MY', 'Malaysia', 'steel', 'Steel & Metal', 'cbam', 'CBAM Compliance', 'Malaysian steel exports to the EU face CBAM declarations from 2026. Grid factor of 0.585 kgCO₂/kWh positions Malaysia between Singapore (low) and Indonesia (high) in emission intensity.', 'cbam-estimator',
    cbamSteps('Malaysia', 'steel'),
    [{ item: 'Grid factor', value: '0.585 kgCO₂/kWh' }, { item: 'CBAM products', value: 'Steel, aluminum' }, { item: 'Bursa reporting', value: 'Enhanced ESG (2024)' }],
    [{ question: 'How much will CBAM cost Malaysian steel exporters?', answer: 'With grid factor at 0.585, Malaysian steel has moderate emission intensity. Net CBAM costs are projected at €25-90/tonne by 2034 depending on production route.' }],
    '/cbam-calculator', 'steel', ['cbam-steel-india', 'cbam-steel-indonesia'], 'malaysia-palm-oil-scope-1-2-3-emission-breakdown'),

  sol('PH', 'Philippines', 'manufacturing', 'Manufacturing', 'scope3', 'Scope 3 Reporting', 'Philippine manufacturing exports to Japan, US, and EU require supply chain carbon data. SEC-ESG and buyer requirements drive Scope 3 measurement needs.', 'scope-estimator',
    scope3Steps('Philippines', 'manufacturing'),
    [{ item: 'Grid factor', value: '0.505 kgCO₂/kWh' }, { item: 'Key export markets', value: 'Japan, US, EU' }, { item: 'SEC-ESG', value: 'Sustainability reporting' }],
    [{ question: 'How do Philippine manufacturers calculate Scope 3?', answer: 'Upload raw material, logistics, and service invoices. Senseible applies Philippines-specific emission factors for accurate Scope 3 category mapping.' }],
    '/verify', 'automobile', ['scope3-manufacturing-indonesia', 'scope3-manufacturing-vietnam'], 'how-philippine-manufacturing-smes-start-carbon-reporting'),

  sol('PK', 'Pakistan', 'steel', 'Steel & Metal', 'cbam', 'CBAM Compliance', 'Pakistan steel and metal exports to the EU face CBAM declarations from 2026. Grid factor of 0.495 is favorable but lack of domestic carbon pricing means zero CBAM credit.', 'cbam-estimator',
    cbamSteps('Pakistan', 'steel'),
    [{ item: 'Grid factor', value: '0.495 kgCO₂/kWh' }, { item: 'Carbon price', value: '€0 (no domestic)' }, { item: 'SECP requirement', value: 'ESG (listed companies)' }],
    [{ question: 'How does CBAM affect Pakistani steel exports?', answer: 'All steel exports to the EU require CBAM declarations from 2026. Pakistan lower grid factor (0.495) is an advantage, but zero domestic carbon price means no CBAM liability offset.' }],
    '/cbam-calculator', 'steel', ['cbam-steel-india', 'cbam-steel-bangladesh'], 'eu-cbam-explained-emerging-market-exporters'),

  sol('LK', 'Sri Lanka', 'textile', 'Apparel Manufacturers', 'green-finance', 'Green Finance', 'CBSL sustainable finance guidelines and ADB green credit offer lower rates for Sri Lankan apparel manufacturers with verified emission baselines.', 'finance-score',
    financeSteps('Sri Lanka', 'textile'),
    [{ item: 'CBSL guidelines', value: 'Active' }, { item: 'Apparel exports', value: '$5.5B' }, { item: 'Interest benefit', value: '1-2% lower' }],
    [{ question: 'How can Sri Lankan apparel SMEs access green loans?', answer: 'CBSL guidelines enable commercial banks to offer green financing. ADB and IFC provide credit facilities. Verified carbon data from Senseible is required for applications.' }],
    '/climate-finance', 'textile', ['green-finance-textile-bangladesh', 'green-finance-textile-india'], 'msme-carbon-credits-sri-lanka-invoice-to-revenue'),

  sol('BD', 'Bangladesh', 'manufacturing', 'Manufacturing', 'green-finance', 'Green Finance Access', 'Bangladesh Bank green refinancing at 5% and IFC climate credit lines provide significantly lower financing costs for manufacturers with verified carbon data.', 'finance-score',
    financeSteps('Bangladesh', 'manufacturing'),
    [{ item: 'Green refinance rate', value: '5% (Bangladesh Bank)' }, { item: 'Normal rate', value: '9-12%' }, { item: 'IFC lines', value: 'Via BRAC Bank, City Bank' }],
    [{ question: 'What green finance exists for Bangladeshi manufacturers?', answer: 'Bangladesh Bank green refinance scheme at 5%, IFC climate credit lines through BRAC Bank and City Bank, and ADB green facilities. Carbon verification data is the key requirement.' }],
    '/climate-finance', 'automobile', ['green-finance-manufacturing-india', 'green-finance-manufacturing-pakistan'], 'green-loan-eligibility-pakistani-small-businesses'),

  sol('IN', 'India', 'logistics', 'Logistics & Transport', 'carbon-audit', 'Fleet Carbon Audit', 'Indian logistics sector contributes 13% of national emissions. E-way bill data combined with fuel invoices enables precise fleet emission measurement.', 'audit-checklist',
    auditSteps('India', 'logistics'),
    [{ item: 'Sector share', value: '13% of national emissions' }, { item: 'Diesel benchmark', value: '2.68 kgCO₂/liter' }, { item: 'E-way bill integration', value: 'Available' }],
    [{ question: 'How do Indian logistics companies measure fleet emissions?', answer: 'Upload diesel/petrol invoices and e-way bill data. Senseible calculates per-trip and per-km emission intensity using India-specific fuel factors.' }],
    '/verify', 'automobile', ['carbon-audit-logistics-philippines', 'carbon-audit-logistics-singapore'], 'logistics-scope-1-emissions-india'),

  sol('IN', 'India', 'food-processing', 'Food Processing', 'scope3', 'Scope 3 Calculator', 'India $50B food processing industry faces growing export compliance needs. Agricultural inputs, packaging, and cold chain logistics dominate Scope 3 emissions.', 'scope-estimator',
    scope3Steps('India', 'food processing'),
    [{ item: 'Industry size', value: '$50B and growing' }, { item: 'Scope 3 share', value: '65-75%' }, { item: 'Key categories', value: 'Agricultural inputs, logistics' }],
    [{ question: 'How do Indian food processors calculate Scope 3?', answer: 'Agricultural raw material procurement, packaging, cold storage electricity, and distribution logistics are primary categories. India grid factor (0.708) applies to cold chain.' }],
    '/verify', 'automobile', ['scope3-food-processing-thailand', 'scope3-food-processing-indonesia'], 'manufacturing-scope-3-emissions-india'),
];

// Get solution by slug
export const getSolutionBySlug = (slug: string): SolutionPage | undefined => {
  return solutionPages.find(s => s.slug === slug);
};

// Get related solutions
export const getRelatedSolutions = (slug: string, limit = 3): SolutionPage[] => {
  const current = getSolutionBySlug(slug);
  if (!current) return [];
  return solutionPages
    .filter(s => s.slug !== slug && (s.countryCode === current.countryCode || s.sector === current.sector || s.regulation === current.regulation))
    .slice(0, limit);
};

// Get all slugs for static generation
export const getAllSolutionSlugs = (): string[] => {
  return solutionPages.map(s => s.slug);
};
