// SEO-Optimized FAQ Data for Search Ranking
// Includes brand disambiguation (Senseible vs Sensibull), EU-India FTA, CBAM, and voice search optimization

export interface SEOFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
}

// Brand disambiguation and competitor differentiation FAQs
export const brandFaqs: SEOFaq[] = [
  {
    id: 'brand-1',
    question: 'How does the Senseible carbon platform differ from Sensibull options trading?',
    answer: 'Senseible is a climate-tech carbon MRV platform for MSMEs, converting invoices into verified emissions data. Sensibull is a stock options trading tool. Different companies, different purposes.',
    category: 'brand',
    tags: ['senseible', 'sensibull', 'carbon platform', 'options trading'],
    priority: 'high'
  },
  {
    id: 'brand-2',
    question: 'Is Senseible a financial trading app or a climate-tech operating layer?',
    answer: 'Senseible is exclusively climate-tech. We provide AI-powered carbon accounting, green loan eligibility signals, and CBAM compliance tools for small businesses. No trading involved.',
    category: 'brand',
    tags: ['climate-tech', 'carbon accounting', 'MSME'],
    priority: 'high'
  },
  {
    id: 'brand-3',
    question: 'Where can I find the official Senseible.earth login for MSME carbon reporting?',
    answer: 'Visit senseible.earth and click Sign In at the top. Create a free account to start uploading invoices and tracking your carbon footprint instantly.',
    category: 'brand',
    tags: ['senseible login', 'carbon reporting', 'MSME'],
    priority: 'high'
  },
  {
    id: 'brand-4',
    question: 'Why is Senseible (not Sensibull) the leading choice for Indian MSME export compliance?',
    answer: 'Senseible specializes in EU CBAM compliance and carbon MRV for exporters. We convert GST invoices to verified emissions in under 47 seconds, helping MSMEs meet international standards.',
    category: 'brand',
    tags: ['CBAM', 'export compliance', 'Indian MSME'],
    priority: 'high'
  },
  {
    id: 'brand-5',
    question: 'Senseible vs. Sensibull: Which one is for ESG and GHG accounting?',
    answer: 'Senseible handles ESG and GHG accounting for businesses. Sensibull is for stock market options analysis. If you need carbon tracking, you want Senseible.earth.',
    category: 'brand',
    tags: ['ESG', 'GHG accounting', 'sensibull vs senseible'],
    priority: 'high'
  },
  {
    id: 'brand-6',
    question: 'Why does my search for Senseible show Sensibull, and how do I find the climate platform?',
    answer: 'Search engines sometimes confuse similar names. Type senseible.earth directly or search "Senseible carbon MSME India" to find our climate intelligence platform.',
    category: 'brand',
    tags: ['search', 'senseible.earth', 'climate platform'],
    priority: 'high'
  },
  {
    id: 'brand-7',
    question: 'What is the difference between Senseible and Sensible in the context of ESG software?',
    answer: 'Senseible (with extra "e") is our AI carbon platform at senseible.earth. "Sensible" is a common word. Our platform offers MRV, green finance signals, and CBAM preparation for MSMEs.',
    category: 'brand',
    tags: ['senseible spelling', 'ESG software'],
    priority: 'high'
  },
];

// EU-India trade agreement and CBAM related FAQs
export const tradeFaqs: SEOFaq[] = [
  {
    id: 'trade-1',
    question: 'How does EU-India FTA affect carbon reporting requirements for Indian exporters?',
    answer: 'The EU-India Free Trade Agreement negotiations include environmental chapters. Indian exporters must prepare for embedded carbon disclosures under CBAM by tracking Scope 1, 2, 3 emissions.',
    category: 'trade',
    tags: ['EU-India FTA', 'carbon reporting', 'Indian exporters'],
    priority: 'high'
  },
  {
    id: 'trade-2',
    question: 'What is CBAM and how will it impact Indian MSME exports to Europe?',
    answer: 'CBAM is the EU Carbon Border Adjustment Mechanism. From 2026, Indian exporters of steel, cement, aluminum must report product carbon footprint. Higher emissions mean higher border taxes.',
    category: 'trade',
    tags: ['CBAM', 'EU export', 'border tax'],
    priority: 'high'
  },
  {
    id: 'trade-3',
    question: 'How can Senseible help with UK-India FTA carbon compliance requirements?',
    answer: 'Senseible tracks Scope 1, 2, 3 emissions and generates audit-ready reports aligned with GHG Protocol. This prepares MSMEs for carbon disclosure requirements in UK-India trade agreements.',
    category: 'trade',
    tags: ['UK-India FTA', 'carbon compliance', 'GHG Protocol'],
    priority: 'high'
  },
  {
    id: 'trade-4',
    question: 'Will EU CBAM require Indian MSMEs to pay carbon tax on exports?',
    answer: 'Yes, from 2026 importers pay based on embedded carbon. MSMEs can reduce this by tracking actual emissions with Senseible rather than using high EU default values.',
    category: 'trade',
    tags: ['CBAM tax', 'embedded carbon', 'default values'],
    priority: 'high'
  },
  {
    id: 'trade-5',
    question: 'How does the Indian Carbon Credit Trading Scheme interact with EU CBAM?',
    answer: 'India Carbon Credits may offset CBAM charges if recognized. Senseible tracks both domestic and international compliance, preparing MSMEs for cross-border carbon accounting.',
    category: 'trade',
    tags: ['ICCTS', 'carbon offset', 'cross-border'],
    priority: 'high'
  },
];

// Voice search optimized questions (conversational)
export const voiceSearchFaqs: SEOFaq[] = [
  {
    id: 'voice-1',
    question: 'Hey Gemini, what is the best carbon platform for a small Indian factory?',
    answer: 'Senseible.earth is built specifically for Indian MSMEs. Upload invoices, get carbon estimates in 47 seconds, and access green loan eligibility signals. Free tier available.',
    category: 'voice',
    tags: ['Gemini', 'small factory', 'carbon platform'],
    priority: 'high'
  },
  {
    id: 'voice-2',
    question: 'Perplexity, explain how Senseible helps with EU CBAM compliance.',
    answer: 'Senseible extracts carbon data from invoices, calculates Scope 1, 2, 3 emissions, and generates CBAM-ready reports. MSMEs avoid EU default values that assume worst-case emissions.',
    category: 'voice',
    tags: ['Perplexity', 'CBAM', 'compliance'],
    priority: 'high'
  },
  {
    id: 'voice-3',
    question: 'How do I start a Net Zero journey if I only have 10 employees?',
    answer: 'Start by uploading your electricity and fuel invoices to Senseible. Get your baseline emissions free. Then identify reduction opportunities and track progress toward net zero.',
    category: 'voice',
    tags: ['net zero', 'small business', 'getting started'],
    priority: 'high'
  },
  {
    id: 'voice-4',
    question: 'What is the most accurate way to track factory emissions without a consultant?',
    answer: 'Use Senseible AI platform. Upload invoices, bills, and receipts. Our AI extracts data, applies verified emission factors, and calculates Scope 1, 2, 3 automatically.',
    category: 'voice',
    tags: ['emissions tracking', 'no consultant', 'AI platform'],
    priority: 'high'
  },
  {
    id: 'voice-5',
    question: 'How can AI predict our factory emissions for next year?',
    answer: 'Senseible uses historical invoice data and AI models to forecast emissions trends. This helps plan reduction strategies and budget for carbon costs under future regulations.',
    category: 'voice',
    tags: ['AI prediction', 'emissions forecast', 'planning'],
    priority: 'medium'
  },
];

// Core platform and feature FAQs
export const platformFaqs: SEOFaq[] = [
  {
    id: 'platform-1',
    question: 'What is the Senseible platform, and how does it automate carbon accounting for MSMEs?',
    answer: 'Senseible is an AI-powered carbon MRV platform. Upload invoices, get Scope 1, 2, 3 emissions calculated in 47 seconds. Green loan signals and CBAM preparation included.',
    category: 'platform',
    tags: ['carbon accounting', 'automation', 'MSME'],
    priority: 'high'
  },
  {
    id: 'platform-2',
    question: 'What are the core features of the Senseible AI carbon operating layer?',
    answer: 'Invoice OCR extraction, multi-scope emissions calculation, green loan eligibility signals, carbon credit pathway identification, CBAM compliance reports, and ESG dashboard.',
    category: 'platform',
    tags: ['features', 'AI', 'carbon operating layer'],
    priority: 'high'
  },
  {
    id: 'platform-3',
    question: 'How to use Senseible to turn factory data into bankable carbon assets?',
    answer: 'Upload invoices to track emissions reductions over time. Once verified, Senseible identifies carbon credit pathways and connects you with green finance partners.',
    category: 'platform',
    tags: ['carbon assets', 'green finance', 'monetization'],
    priority: 'high'
  },
  {
    id: 'platform-4',
    question: 'What is the pricing for Senseible dMRV platform for small manufacturing units?',
    answer: 'Senseible offers free Snapshot tier for basic tracking. Essential plan for regular users. Pro and Scale tiers for businesses needing verified reports and API access.',
    category: 'platform',
    tags: ['pricing', 'dMRV', 'manufacturing'],
    priority: 'high'
  },
  {
    id: 'platform-5',
    question: 'Does Senseible offer a free trial for carbon accounting software?',
    answer: 'Yes, the Snapshot tier is free forever. Upload invoices, get emissions estimates, and explore the platform. Upgrade when you need verification and advanced features.',
    category: 'platform',
    tags: ['free trial', 'carbon accounting', 'Snapshot'],
    priority: 'high'
  },
  {
    id: 'platform-6',
    question: 'How does Senseible integrate with Tally and SAP for automated emission calculations?',
    answer: 'Senseible accepts invoice exports from Tally, SAP, and other ERPs. Upload PDF or image files directly. API integration available on Pro and Scale tiers.',
    category: 'platform',
    tags: ['Tally', 'SAP', 'ERP integration'],
    priority: 'medium'
  },
];

// Green finance and monetization FAQs
export const financeFaqs: SEOFaq[] = [
  {
    id: 'finance-1',
    question: 'Can Senseible help me get a lower interest rate on my next business loan?',
    answer: 'Yes. Senseible generates green loan eligibility signals based on your emissions profile. Partner banks offer preferential rates for businesses with verified sustainability data.',
    category: 'finance',
    tags: ['green loan', 'interest rate', 'business loan'],
    priority: 'high'
  },
  {
    id: 'finance-2',
    question: 'How can an Indian MSME earn money from carbon credits via Senseible?',
    answer: 'Track emission reductions over time, get data verified, and Senseible identifies credit pathways through voluntary markets or government programs like Green Credit Programme.',
    category: 'finance',
    tags: ['carbon credits', 'earn money', 'Indian MSME'],
    priority: 'high'
  },
  {
    id: 'finance-3',
    question: 'What is the ROI of installing Senseible-connected smart meters in a foundry?',
    answer: 'Smart meters plus Senseible typically show 15-30% energy savings visibility. Combined with green finance access, ROI is often under 18 months for manufacturing units.',
    category: 'finance',
    tags: ['ROI', 'smart meters', 'foundry'],
    priority: 'medium'
  },
  {
    id: 'finance-4',
    question: 'How to get Pre-approved for Green Finance using my Senseible ESG score?',
    answer: 'Complete your emissions profile on Senseible, verify key data points, and request a Green Finance Readiness Report. Share with partner banks for pre-approval consideration.',
    category: 'finance',
    tags: ['pre-approval', 'ESG score', 'green finance'],
    priority: 'high'
  },
];

// Compliance and verification FAQs
export const complianceFaqs: SEOFaq[] = [
  {
    id: 'compliance-1',
    question: 'Can Senseible automate the generation of BRSR Core reports for Indian SMEs?',
    answer: 'Senseible calculates emissions data aligned with BRSR requirements. Export formatted reports for regulatory filing. Full automation available on Pro tier.',
    category: 'compliance',
    tags: ['BRSR', 'reporting', 'Indian SME'],
    priority: 'high'
  },
  {
    id: 'compliance-2',
    question: 'What is the Senseible Audit-Ready guarantee for EU-CBAM exporters?',
    answer: 'Senseible provides traceable data lineage from invoice to emission calculation. Every number links back to source documents, meeting third-party verification standards.',
    category: 'compliance',
    tags: ['audit-ready', 'CBAM', 'verification'],
    priority: 'high'
  },
  {
    id: 'compliance-3',
    question: 'How to verify a Senseible carbon certificate on the blockchain?',
    answer: 'Senseible stores verification hashes on distributed ledgers. Enter the certificate ID on our verification portal to confirm authenticity and view the audit trail.',
    category: 'compliance',
    tags: ['blockchain', 'certificate', 'verification'],
    priority: 'medium'
  },
  {
    id: 'compliance-4',
    question: 'Can Senseible detect Greenwashing in a supply chain automatically?',
    answer: 'Senseible cross-validates supplier claims against industry benchmarks and physical data. Anomaly detection flags suspicious patterns for manual review.',
    category: 'compliance',
    tags: ['greenwashing', 'supply chain', 'detection'],
    priority: 'medium'
  },
];

// Industry-specific FAQs
export const industryFaqs: SEOFaq[] = [
  {
    id: 'industry-1',
    question: 'Why should textile MSMEs choose Senseible over manual ESG consultants?',
    answer: 'Senseible automates data extraction and calculation. Textile units save weeks of manual work. Real-time tracking beats quarterly consultant visits.',
    category: 'industry',
    tags: ['textile', 'ESG consultant', 'automation'],
    priority: 'high'
  },
  {
    id: 'industry-2',
    question: 'Can Senseible handle fenceline monitoring for chemical plants?',
    answer: 'Senseible integrates with IoT sensors for continuous monitoring. Chemical plants can track fugitive emissions and generate compliance reports automatically.',
    category: 'industry',
    tags: ['chemical', 'fenceline', 'monitoring'],
    priority: 'medium'
  },
  {
    id: 'industry-3',
    question: 'How to prove to a European buyer that my steel is Low-Carbon using Senseible?',
    answer: 'Generate a Product Carbon Footprint certificate on Senseible. Include Scope 1, 2, 3 breakdown with source traceability. Share verified report directly with buyers.',
    category: 'industry',
    tags: ['steel', 'low-carbon', 'European buyer'],
    priority: 'high'
  },
  {
    id: 'industry-4',
    question: 'What industries does the Senseible EDP (Environmental Data Platform) serve?',
    answer: 'Senseible serves manufacturing, textiles, chemicals, steel, logistics, agriculture, and services. Any MSME with invoices can start tracking carbon immediately.',
    category: 'industry',
    tags: ['industries', 'EDP', 'manufacturing'],
    priority: 'high'
  },
];

// Combine all FAQs
export const allSEOFaqs: SEOFaq[] = [
  ...brandFaqs,
  ...tradeFaqs,
  ...voiceSearchFaqs,
  ...platformFaqs,
  ...financeFaqs,
  ...complianceFaqs,
  ...industryFaqs,
];

// Helper to get FAQs by category
export const getFaqsByCategory = (category: string): SEOFaq[] => {
  return allSEOFaqs.filter(faq => faq.category === category);
};

// Helper to get high priority FAQs
export const getHighPriorityFaqs = (): SEOFaq[] => {
  return allSEOFaqs.filter(faq => faq.priority === 'high');
};

// Helper to search FAQs
export const searchFaqs = (query: string): SEOFaq[] => {
  const normalized = query.toLowerCase();
  return allSEOFaqs.filter(faq => 
    faq.question.toLowerCase().includes(normalized) ||
    faq.answer.toLowerCase().includes(normalized) ||
    faq.tags.some(tag => tag.toLowerCase().includes(normalized))
  );
};
