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
  description: 'See a 64-page sample ESG report made with Senseible: GRI Content Index, BRSR Core map, TCFD risks and every emission factor shown. Free with a work email.',
  h1: 'See what a buyer-ready ESG report looks like, page by page.',
  published: '2026-09-19',
};

export const ESG_SAMPLE_INTRO = 'A 64-page sample ESG report, built the way Senseible builds them: from utility bills, fuel invoices and payroll records. Figures are illustrative. Mapped to GRI, BRSR Core, TCFD, the UN SDGs and the UN Global Compact, with every emission factor printed.';

/** Short, quotable answer for search and AI answer engines. */
export const ESG_SAMPLE_ANSWER = 'A credible ESG report for an Indian company covers environment, social and governance topics, shows Scope 1, 2 and 3 emissions with the factors and sources used, maps each disclosure to the frameworks readers ask for (GRI, BRSR Core, TCFD), and states its boundaries, gaps and assurance status. This 64-page sample shows all of that.';

export const ESG_SAMPLE_FACTS = [
  { value: '31', label: 'sections' },
  { value: '56', label: 'GRI disclosures indexed' },
  { value: '19', label: 'BRSR Core codes mapped' },
];

/** When to open the report: the situation, the short answer, one line of detail. Written for skimming. */
export const ESG_SAMPLE_USES_TITLE = 'Open it when one of these lands on your desk';
export const ESG_SAMPLE_PROBLEMS = [
  { ask: 'A buyer or bank wants your ESG report.', answer: 'Borrow the structure.', detail: '31 sections, a materiality matrix and dated targets, laid out the way reviewers read them.' },
  { ask: 'Every request names a different framework.', answer: 'Answer them all from one dataset.', detail: 'A GRI index and a BRSR Core map point each disclosure to its page.' },
  { ask: 'Your numbers keep getting questioned.', answer: 'Show the working.', detail: 'Every factor, source and boundary is printed, so anyone can recompute.' },
];

export const ESG_SAMPLE_TAKEAWAYS_TITLE = 'What’s inside, page by page';
export const ESG_SAMPLE_TAKEAWAYS = [
  { text: 'Double materiality, presented: 15 topics on one matrix and the four steps behind it.', pages: 'pp. 6-8' },
  { text: 'A Scope 1, 2 and 3 inventory with shares, year-on-year change and a 2030 pathway.', pages: 'p. 16' },
  { text: 'Every emission factor with its source: fuels, grid electricity, Scope 3.', pages: 'pp. 59-60' },
  { text: 'Climate risks in TCFD terms, each with a time horizon and a response.', pages: 'p. 23' },
  { text: 'A GRI index (56 disclosures) and a BRSR Core map (19 codes).', pages: 'pp. 50-55' },
  { text: 'Honest limits: what is not covered yet, and why it is not assured.', pages: 'p. 60' },
  { text: 'A ready email for sending the report to buyers and partners.', pages: 'p. 63' },
];

export type AskerId = 'listed_customer' | 'eu_buyer' | 'lender' | 'global';
export const ESG_SAMPLE_ASKERS: { id: AskerId; label: string; frameworks: string; why: string; sections: { name: string; page: number }[]; guide?: { label: string; to: string } }[] = [
  {
    id: 'listed_customer',
    label: 'A listed Indian customer',
    frameworks: 'BRSR and BRSR Core',
    why: 'Listed companies report value-chain data under SEBI’s BRSR. The BRSR Core map shows which section answers each code.',
    sections: [{ name: 'BRSR Core disclosure map', page: 54 }, { name: 'GHG emissions analysis', page: 15 }, { name: 'Energy management', page: 17 }, { name: 'Water stewardship', page: 19 }, { name: 'Waste and circular economy', page: 21 }],
    guide: { label: 'What BRSR and BRSR Core ask for, in plain words', to: '/brsr-reporting' },
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

export const ESG_SAMPLE_OBJECTIONS_TITLE = 'Fair questions, short answers';
/** Verdict first, then one line of why: readers see the answer at a glance. */
export const ESG_SAMPLE_OBJECTIONS = [
  { q: 'Will auditors and buyers accept it?', verdict: 'It is built to be checked.', a: 'Factors, sources, boundary and gaps are all printed. It also says plainly that it is not independently assured, so an assurer knows where to start.' },
  { q: 'We are an MSME. We do not have this data.', verdict: 'You probably do.', a: 'Most of it sits in electricity and water bills, fuel invoices, waste manifests and payroll. Senseible reads the bills and invoices for you.' },
  { q: 'Which framework do we need?', verdict: 'Usually the one your customer or lender names.', a: 'One dataset maps to GRI, BRSR Core, TCFD, the UN SDGs and the UN Global Compact.' },
  { q: 'Will you spam me or share my details?', verdict: 'No.', a: 'We use them only to send the report and see who reads it. Never sold, kept 90 days, deleted sooner if you ask. Updates only if you tick the box.' },
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
