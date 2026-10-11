# Trust and Technical Validation

Canonical: https://senseible.earth/trust

How Senseible verifies emission data: evidence hashing, methodology versioning, confidence bands, framework coverage and greenwashing safeguards.

## How each safeguard works

### Trust score instead of pass or fail

Each verified record gets a 0 to 100 score with reason codes, so you can see what is strong, what is weak and which action raises the score, instead of a bare pass or fail.

- The score combines data completeness, how well the emission factor matches the line item, document integrity and classification confidence.
- Reason codes are specific, for example "HSN matched, vendor verified, date gap detected".
- The next best action is shown, such as adding a supplier GSTIN or a missing month of bills.

### Proof graph: every number traced to its source

Every figure can be followed from the source document through the line item, emission factor and scope classification to the CO2e result, with the factor source and methodology version shown at each step.

- Example: 1,200 litres of diesel × 2.68 kgCO2e per litre = 3,216 kgCO2e, classified as Scope 1 direct combustion.
- The same documents and methodology version reproduce the same number later.
- Auditors and buyers can check provenance without asking for the underlying spreadsheets.

### Pre-submission checks

Before you submit, the platform checks for the gaps that most often cause rework: missing vendor GSTIN, invoices older than 12 months, amounts far outside your normal range and baselines built on too few documents.

- Each flag comes with a specific fix, for example "Upload two more invoices to establish a baseline".
- Outlier checks catch unit and typing errors, such as kWh entered as MWh, before they reach a report.

### Sector benchmarking

Your intensity figures are compared with sector benchmarks adjusted for your country grid factor, so a raw total becomes a position relative to similar businesses.

- Comparisons are by sector and country, not against global corporations.
- Where a benchmark is weak or missing, the comparison says so rather than guessing.

### Confidence bands instead of false precision

Results are shown as a range with the sources of uncertainty listed, for example "1,247 kgCO2e ± 5%", because document extraction and emission factors both carry uncertainty.

- Lines matched by HSN code carry narrower bands than keyword-matched or generic classifications.
- Better evidence, such as an HSN-coded invoice instead of manual entry, narrows the band.
- Ranges follow the uncertainty guidance in the GHG Protocol and ISO 14064 rather than hiding it.

### Value preview before verification

After a document is processed you can see an indicative range of what verified data could be worth in carbon credit or financing terms, with the price and assumptions shown.

- The preview is an estimate, not an offer: it states the price per tonne and the low and high multipliers used.
- Actual credit eligibility depends on additionality, methodology and buyer requirements.

### One-click audit trail export

Export a spreadsheet in which every row carries the document hash, date, vendor, activity data, emission factor and source, calculation, verification score and methodology version.

- A summary sheet lists the methodology version, entry count and verified count.
- The same package can be shared with a lender, an auditor or a buyer without rework.

### Dispute simulation

Run your records through the questions an auditor would ask. Each data point is marked defensible or vulnerable, with the evidence that would close the gap.

- A verified GSTIN or an HSN-matched line is defensible; a keyword-only classification or a missing unit is vulnerable.
- Fixing vulnerable points before an audit avoids surprise challenges later.

### Fewer manual-entry errors

Typed data is the most common source of unit and digit errors. Reading values directly from uploaded documents or connected systems removes most of that risk.

- Document upload with extraction replaces retyping figures from bills.
- Each data source carries its own uncertainty, which feeds the confidence band.

### Explainable greenwashing flags

Integrity flags say exactly which pattern triggered them and how to resolve it, instead of a bare "high risk" label.

- Checks cover suspiciously round numbers, missing invoice details, low extraction confidence and identical factors across all records.
- A legitimate pattern, such as every invoice being for the same fuel, can be explained with a note and re-checked.
