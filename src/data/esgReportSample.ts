// Copy for /esg-report-sample, shared by the page and its prerendered SEO
// content. Every fact comes from the owner-supplied report
// (Senseible_ESG_Report_sample_2026.pdf, 64 pages, generated 19 September
// 2026): page numbers are the report's own. Counts: GRI Content Index pages
// 51 to 53 list 56 disclosures; the BRSR Core map, pages 54 and 55, lists 19
// codes (P6 A1 to P8 A12, P1 G1 to G7). Nothing here claims assurance,
// compliance or a result the report does not state.

export const ESG_SAMPLE_META = {
  path: '/esg-report-sample',
  title: 'Sample ESG Report for India: GRI, BRSR Core, TCFD',
  description: 'See a real 64-page ESG report made with Senseible: GRI Content Index, BRSR Core map, TCFD climate risks and every emission factor shown. Free with a work email.',
  h1: 'See what a buyer-ready ESG report looks like, page by page.',
  published: '2026-09-19',
};

export const ESG_SAMPLE_INTRO = 'Senseible’s own 2026 ESG report, built on the Senseible platform from utility bills, fuel invoices and payroll records. Mapped to GRI, BRSR Core, TCFD, the UN SDGs and the UN Global Compact, with every emission factor printed.';

/** Short, quotable answer for search and AI answer engines. */
export const ESG_SAMPLE_ANSWER = 'A credible ESG report for an Indian company covers environment, social and governance topics, shows Scope 1, 2 and 3 emissions with the factors and sources used, maps each disclosure to the frameworks readers ask for (GRI, BRSR Core, TCFD), and states its boundaries, gaps and assurance status. This 64-page sample shows all of that.';

export const ESG_SAMPLE_FACTS = [
  { value: '31', label: 'sections' },
  { value: '56', label: 'GRI disclosures indexed' },
  { value: '19', label: 'BRSR Core codes mapped' },
];

export const ESG_SAMPLE_PROBLEMS = [
  {
    title: 'A buyer or bank asked for your ESG report, and you have never written one.',
    body: 'See the structure reviewers expect before you start: environment, social and governance in 31 sections, a materiality matrix, dated targets, and a ready email for sending the report to partners.',
  },
  {
    title: 'Every request names a different framework.',
    body: 'GRI, BRSR Core, TCFD, CSRD. The report answers them from one dataset: a GRI Content Index and a BRSR Core map point each disclosure to the page that covers it.',
  },
  {
    title: 'Numbers nobody can check get sent back.',
    body: 'Every emission factor, its source, the reporting boundary and the known gaps are printed, so a buyer, lender or auditor can recompute the figures instead of taking them on trust.',
  },
];

export const ESG_SAMPLE_TAKEAWAYS = [
  { text: 'How a double materiality assessment is presented: 15 topics on one matrix, and the four steps behind it.', pages: 'Pages 6 to 8' },
  { text: 'A Scope 1, 2 and 3 inventory with each scope’s share, year-on-year change and a pathway to the 2030 target.', pages: 'Page 16' },
  { text: 'The factor tables: diesel, petrol, natural gas, LPG, grid electricity and the Scope 3 categories, each with its source.', pages: 'Pages 59 and 60' },
  { text: 'Climate risks and opportunities in TCFD terms, each with a time horizon and a response.', pages: 'Page 23' },
  { text: 'A GRI Content Index of 56 disclosures and a BRSR Core map of 19 codes.', pages: 'Pages 50 to 55' },
  { text: 'What honest limits look like: which Scope 3 categories are not yet covered, and why the report is not yet assured.', pages: 'Page 60' },
  { text: 'A ready-to-send email for sharing an ESG report with buyers and partners.', pages: 'Page 63' },
];

export type AskerId = 'listed_customer' | 'eu_buyer' | 'lender' | 'global';
export const ESG_SAMPLE_ASKERS: { id: AskerId; label: string; frameworks: string; why: string; sections: { name: string; page: number }[] }[] = [
  {
    id: 'listed_customer',
    label: 'A listed Indian customer',
    frameworks: 'BRSR and BRSR Core',
    why: 'Listed companies report value-chain data under SEBI’s BRSR. The BRSR Core map shows which section answers each code.',
    sections: [{ name: 'BRSR Core disclosure map', page: 54 }, { name: 'GHG emissions analysis', page: 15 }, { name: 'Energy management', page: 17 }, { name: 'Water stewardship', page: 19 }, { name: 'Waste and circular economy', page: 21 }],
  },
  {
    id: 'eu_buyer',
    label: 'An EU customer',
    frameworks: 'GRI, with CSRD and ESRS topics',
    why: 'EU buyers usually want your emissions, how you measured them and how you manage your own suppliers.',
    sections: [{ name: 'GHG emissions analysis', page: 15 }, { name: 'Supply chain responsibility', page: 36 }, { name: 'Methodology and reporting boundaries', page: 58 }, { name: 'Stakeholder communication toolkit', page: 63 }],
  },
  {
    id: 'lender',
    label: 'A bank or investor',
    frameworks: 'TCFD',
    why: 'Lenders look at climate risk, targets and how sound the data is. The report shows each, and says plainly that it is not assured.',
    sections: [{ name: 'Climate risk and TCFD disclosure', page: 23 }, { name: 'Environmental targets and action plan', page: 24 }, { name: 'Governance framework', page: 39 }, { name: 'Methodology and reporting boundaries', page: 58 }],
  },
  {
    id: 'global',
    label: 'A global framework',
    frameworks: 'GRI, UN Global Compact, UN SDGs',
    why: 'For a sustainability rating, a supplier portal or your own website, start from the indexes.',
    sections: [{ name: 'GRI Content Index', page: 50 }, { name: 'UN Global Compact principles', page: 56 }, { name: 'UN SDG alignment', page: 49 }],
  },
];

export const ESG_SAMPLE_OBJECTIONS = [
  {
    q: 'Will auditors and buyers accept a report like this?',
    a: 'It is built to be checked, not taken on trust. Every factor and source is printed, the boundary and gaps are stated, and the report says plainly that it has not been independently assured. Assurance is an independent assurer’s job; the report gives them a clean trail to start from.',
  },
  {
    q: 'We are an MSME. We do not have this kind of data.',
    a: 'Most of it comes from documents you already keep: electricity and water bills, fuel invoices, waste manifests and payroll records. Senseible reads bills and invoices directly, so nobody types numbers into a spreadsheet.',
  },
  {
    q: 'Which framework do we actually need?',
    a: 'Usually the one your customer or lender names. The report maps one dataset to GRI, BRSR Core, TCFD, the UN SDGs and the UN Global Compact, so every request is answered from the same numbers.',
  },
  {
    q: 'Will you spam me or share my details?',
    a: 'No. Your details are used to send the report and to understand who reads it. They are never sold, they are kept for at most 90 days, and updates come only if you tick the box. Ask our Data Officer to delete them at any time.',
  },
];

/** Honest comparison: the other columns describe common practice, not a named competitor. */
export const ESG_SAMPLE_COMPARE = {
  columns: ['Spreadsheet template', 'Consultant-written', 'Made with Senseible'],
  rows: [
    { label: 'Where the numbers come from', cells: ['Typed in by hand', 'Collected by the consultant, often from your spreadsheets', 'Read from your bills and invoices, each kept as evidence'] },
    { label: 'Emission factors and sources', cells: ['Only if you add them', 'Varies by consultant', 'Printed for every factor'] },
    { label: 'GRI and BRSR Core index', cells: ['You build it', 'Usually included', 'Included'] },
    { label: 'Next year', cells: ['Start again', 'A new engagement', 'Emissions update as new bills arrive'] },
    { label: 'Independent assurance', cells: ['Separate', 'Separate', 'Separate, with the evidence trail ready'] },
  ],
};

export const ESG_SAMPLE_PREVIEWS = [
  { src: '/resources/esg-report-sample/cover.webp', alt: 'Cover of the Senseible Sample ESG Report 2026, listing GRI, TCFD, BRSR, ISSB, CSRD, UN SDGs and UNGC as alignment references', caption: 'Cover' },
  { src: '/resources/esg-report-sample/emissions-inventory.webp', alt: 'Report page 16: emissions inventory by scope with share and year-on-year change, and a five-year emissions pathway chart', caption: 'Page 16: emissions inventory' },
  { src: '/resources/esg-report-sample/gri-index.webp', alt: 'Report page 51: GRI Content Index table mapping each GRI disclosure to a report section', caption: 'Page 51: GRI Content Index' },
];
