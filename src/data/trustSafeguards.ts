// Product safeguards explained on /trust#safeguards. Each entry replaces two
// earlier near-duplicate articles (listed in `replaces`); those URLs now
// redirect to the matching anchor on /trust (see src/data/articleRedirects.ts).
// Describe how the product works today. No performance statistics or customer
// stories unless they are measured and sourced.
export interface TrustSafeguard {
  id: string;
  title: string;
  summary: string;
  points: string[];
  replaces: string[];
}

export const trustSafeguards: TrustSafeguard[] = [
  {
    id: 'trust-score',
    title: 'Trust score instead of pass or fail',
    summary: 'Each verified record gets a 0 to 100 score with reason codes, so you can see what is strong, what is weak and which action raises the score, instead of a bare pass or fail.',
    points: [
      'The score combines data completeness, how well the emission factor matches the line item, document integrity and classification confidence.',
      'Reason codes are specific, for example "HSN matched, vendor verified, date gap detected".',
      'The next best action is shown, such as adding a supplier GSTIN or a missing month of bills.',
    ],
    replaces: ['why-every-invoice-needs-trust-score', 'trust-score-replaces-pass-fail-63m-msmes'],
  },
  {
    id: 'proof-graph',
    title: 'Proof graph: every number traced to its source',
    summary: 'Every figure can be followed from the source document through the line item, emission factor and scope classification to the CO2e result, with the factor source and methodology version shown at each step.',
    points: [
      'Example: 1,200 litres of diesel × 2.645 kgCO2e per litre = 3,174 kgCO2e, classified as Scope 1 direct combustion.',
      'The same documents and methodology version reproduce the same number later.',
      'Auditors and buyers can check provenance without asking for the underlying spreadsheets.',
    ],
    replaces: ['proof-graph-how-carbon-value-calculated', 'proof-graphs-black-box-ai-carbon-trust'],
  },
  {
    id: 'auto-validation',
    title: 'Pre-submission checks',
    summary: 'Before you submit, the platform checks for the gaps that most often cause rework: missing vendor GSTIN, invoices older than 12 months, amounts far outside your normal range and baselines built on too few documents.',
    points: [
      'Each flag comes with a specific fix, for example "Upload two more invoices to establish a baseline".',
      'Outlier checks catch unit and typing errors, such as kWh entered as MWh, before they reach a report.',
    ],
    replaces: ['auto-validation-catches-gaps-before-submit', 'pre-submission-validation-cuts-rejection-40-percent'],
  },
  {
    id: 'benchmarking',
    title: 'Sector benchmarking',
    summary: 'Your intensity figures are compared with sector benchmarks adjusted for your country grid factor, so a raw total becomes a position relative to similar businesses.',
    points: [
      'Comparisons are by sector and country, not against global corporations.',
      'Where a benchmark is weak or missing, the comparison says so rather than guessing.',
    ],
    replaces: ['dynamic-benchmarking-400m-msmes', 'sector-benchmarking-context-raw-data-decisions'],
  },
  {
    id: 'confidence-bands',
    title: 'Confidence bands instead of false precision',
    summary: 'Results are shown as a range with the sources of uncertainty listed, for example "1,247 kgCO2e ± 5%", because document extraction and emission factors both carry uncertainty.',
    points: [
      'Lines matched by HSN code carry narrower bands than keyword-matched or generic classifications.',
      'Better evidence, such as an HSN-coded invoice instead of manual entry, narrows the band.',
      'Ranges follow the uncertainty guidance in the GHG Protocol and ISO 14064 rather than hiding it.',
    ],
    replaces: ['confidence-bands-beat-false-precision', 'confidence-bands-honest-mrv-approach'],
  },
  {
    id: 'revenue-preview',
    title: 'Value preview before verification',
    summary: 'After a document is processed you can see an indicative range of what verified data could be worth in carbon credit or financing terms, with the price and assumptions shown.',
    points: [
      'The preview is an estimate, not an offer: it states the price per tonne and the low and high multipliers used.',
      'Actual credit eligibility depends on additionality, methodology and buyer requirements.',
    ],
    replaces: ['see-carbon-revenue-before-verify', 'real-time-revenue-preview-mrv-to-money'],
  },
  {
    id: 'audit-trail',
    title: 'One-click audit trail export',
    summary: 'Export a spreadsheet in which every row carries the document hash, date, vendor, activity data, emission factor and source, calculation, verification score and methodology version.',
    points: [
      'A summary sheet lists the methodology version, entry count and verified count.',
      'The same package can be shared with a lender, an auditor or a buyer without rework.',
    ],
    replaces: ['one-click-audit-trails-investors-need', 'one-click-audit-trails-save-200-hours'],
  },
  {
    id: 'dispute-simulation',
    title: 'Dispute simulation',
    summary: 'Run your records through the questions an auditor would ask. Each data point is marked defensible or vulnerable, with the evidence that would close the gap.',
    points: [
      'A verified GSTIN or an HSN-matched line is defensible; a keyword-only classification or a missing unit is vulnerable.',
      'Fixing vulnerable points before an audit avoids surprise challenges later.',
    ],
    replaces: ['dispute-simulation-auditor-challenge', 'dispute-simulation-prepare-auditor-challenges'],
  },
  {
    id: 'data-connectors',
    title: 'Fewer manual-entry errors',
    summary: 'Typed data is the most common source of unit and digit errors. Reading values directly from uploaded documents or connected systems removes most of that risk.',
    points: [
      'Document upload with extraction replaces retyping figures from bills.',
      'Each data source carries its own uncertainty, which feeds the confidence band.',
    ],
    replaces: ['manual-entry-carbon-data-error-source', 'manual-data-entry-source-carbon-fraud-risk'],
  },
  {
    id: 'greenwashing-flags',
    title: 'Explainable greenwashing flags',
    summary: 'Integrity flags say exactly which pattern triggered them and how to resolve it, instead of a bare "high risk" label.',
    points: [
      'Checks cover suspiciously round numbers, missing invoice details, low extraction confidence and identical factors across all records.',
      'A legitimate pattern, such as every invoice being for the same fuel, can be explained with a note and re-checked.',
    ],
    replaces: ['greenwashing-flags-explainable-not-just-high-risk', 'explainable-greenwashing-flags-transparency'],
  },
];
