# What does "audit-grade carbon data" actually mean?

Canonical: https://senseible.earth/climate-intelligence/audit-grade-carbon-data-what-it-actually-means

"Audit-grade" is the most overused phrase in carbon software marketing. It has a precise meaning — and most products that claim it do not meet it. The phrase has five concrete properties. A dataset either has all five or it is not audit-grade.

## The five properties

1. **Traceability.** Every final number can be traced back to a specific source document or measurement, with no broken links in the chain.
2. **Methodology pinning.** Each record is tagged with the exact version of the methodology used to compute it (e.g. GHG Protocol Corporate Standard 2015 amendment, IEA grid factors 2023).
3. **Immutability.** Once recorded, the source document and its computed output cannot be silently altered. Changes leave an audit trail.
4. **Reproducibility.** Anyone with the same inputs and the same methodology version produces the same output. No black-box AI in the math.
5. **Explainability.** Any number can be decomposed into its inputs and the operations performed on them, in plain language a non-technical auditor can follow.

## Why each property matters

### Traceability

Auditors work backward. They pick a final emission figure, then trace it back through the calculation chain to the source. If the chain breaks — a missing invoice number, an orphaned spreadsheet row — the auditor cannot sign. Modern MRV stores the source document, the extracted fields, the methodology applied, and the output as one linked record.

### Methodology pinning

GHG Protocol guidance updates. IEA grid factors update annually. Emission factors for specific gases are revised. A number computed under the 2020 factors is not the same as a number computed under the 2024 factors. Audit-grade data carries the version it was computed under, so historical numbers remain reproducible even after the methodology has moved on.

### Immutability

Spreadsheets are the canonical anti-pattern. Anyone with edit access can change a number and no one knows when or why. Audit-grade systems use append-only logs, SHA-256 hashing of source documents, and version control on every record. Senseible records the document stub with its hash *before* processing begins so the audit trail exists even if processing later fails.

### Reproducibility

If a third party cannot rerun your calculation and get the same number, your number is not audit-grade. This is the single biggest reason black-box AI-generated emission estimates fail audit: the same input on the same day can produce different outputs depending on the model state. Deterministic math (HSN-to-scope, factor multiplication, GHG Protocol conversion) is reproducible. AI-generated estimates are not.

### Explainability

An auditor must be able to ask "how did you arrive at 12.4 tCO2e for this shipment?" and receive an answer like: "Invoice INV-2026-0421, 8 tonnes of HSN 7208 (hot-rolled steel), classified as Scope 3 Category 4 (upstream transport) by the GHG Protocol mapping, multiplied by GLEC sea-freight factor 1.55 tCO2e/tonne for the Chennai–Hamburg route." Anything less is not explainable.

## What is *not* required for audit-grade

- **Third-party assurance.** Useful and often legally required, but assurance is the *recognition* of audit-grade data, not its definition. Data can be audit-grade before any auditor sees it.
- **Blockchain.** Achieves immutability but is not the only way to do so. A properly designed RLS-enforced append-only database with hashed records is equally valid.
- **Real-time IoT sensors.** Useful for some categories. Most MSME emissions can be made audit-grade from existing invoices and bills.

## How to test whether a vendor's claim is real

Ask these five questions. If any answer is unclear, "audit-grade" is marketing copy.

1. *Show me the methodology version pinned to a record from 18 months ago. What changes if I rerun it today with current factors?*
2. *Show me the source document for this number. Can you prove it has not been altered since ingestion?*
3. *Walk me through how a 12.4 tCO2e figure was computed, in plain language.*
4. *If your AI model is retrained tomorrow, will my historical numbers change?*
5. *Can a different engineer at your company re-derive the same number from the same inputs?*

The acceptable answers are: full version history, SHA-256 hash on the source document, a complete derivation chain, "no — math is deterministic", and "yes, deterministically".

## Why this matters for MSMEs specifically

MSME owners often think audit-grade is "for big companies". It is not. Three forces are pulling audit-grade into MSME territory:

- **EU CBAM** requires verifiable per-shipment data from any exporter into covered sectors.
- **Green loans** increasingly require third-party-verified baselines for the preferential rate to hold.
- **Tier-1 buyers** (the Walmarts, IKEAs, H&Ms of the world) are pushing audit-grade requirements into their supplier code of conduct.

An MSME that built its baseline on non-audit-grade data will have to rebuild it within 24 months, at the worst possible time — when a buyer or banker asks. Building audit-grade from day one is the cheaper path.

## What Senseible enforces by default

- SHA-256 hash on every ingested document.
- Methodology version pinned per record (GHG Protocol, IEA factor vintage, CBAM regulation version).
- Append-only audit ledger.
- Deterministic math; AI restricted to OCR and field extraction.
- Per-record explainability surfaced in the verification UI.

These are not options. They are the default because anything less is not audit-grade.

## FAQ

**Is my Excel spreadsheet audit-grade?** Almost never. Excel fails immutability and version pinning by design. It can be the *intermediate* tool feeding an audit-grade system, but not the system of record.

**Does audit-grade cost more?** Audit-grade software typically costs less than non-audit-grade software because it does not have to be rebuilt at the audit step. The expensive path is to discover at year-end that the data fails.

**Can third-party verification fix non-audit-grade data after the fact?** No. A verifier signs only what is traceable. Non-traceable data gets rejected; that is the verifier's whole job.

## Related guides

- [How can we trace every emission number back to raw sensor or invoice data?](https://senseible.earth/climate-intelligence/how-to-trace-emission-data-to-source)
- [What is Senseible and How is It Different from Sensibull?](https://senseible.earth/climate-intelligence/what-is-senseible-different-from-sensibull)
- [What Documents Do I Need for Carbon Verification?](https://senseible.earth/climate-intelligence/documents-needed-carbon-verification)
