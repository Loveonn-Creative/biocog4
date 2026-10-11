# How should an MSME choose an MRV provider? A 12-point checklist

Canonical: https://senseible.earth/climate-intelligence/how-to-choose-an-mrv-provider-msme-checklist

Most MRV procurement decisions inside MSMEs are made on three criteria: price, the founder's network, and which vendor sent the best deck. None of these survive a real audit. This is the 12-point checklist a credible MRV selection process uses.

## The checklist

### Evidence layer

1. **Per-record source storage.** Does the platform store the original document (PDF, image) for every record, indefinitely? Not a thumbnail — the original.
2. **Document hashing.** Is each source document SHA-256 hashed at ingestion, with the hash stored separately from the document, so tampering can be detected?
3. **Methodology pinning.** Does every record carry the methodology version (GHG Protocol revision, IEA factor vintage, CBAM regulation version) used to compute it?
4. **Append-only ledger.** Can records be silently edited? They should not be. Corrections must produce a new record linked to the original.

### Math layer

1. **Deterministic math.** Is the carbon math deterministic (HSN-to-scope lookup, factor multiplication) or AI-generated? AI-generated emission estimates are not audit-grade.
2. **Localised factors.** Does the platform use country-specific grid factors (IEA 2023 for India, EPA for US, EEA for EU), or one global factor?
3. **Explainability.** For any final number, can the platform show a plain-language derivation chain (document → fields → methodology → output)?

### Audit & verification layer

1. **Verifier readiness.** Has the platform been used in third-party verification by a credible auditor? Ask for a reference customer and the auditor name.
2. **Export to verifier formats.** Can the platform export ISO 14064-compatible packages, CBAM declaration formats, and registry-ready evidence files?

### Operational layer

1. **Data ownership and exit.** Do you own the data, and can you export it in full, including source documents, on 30 days' notice? Lock-in clauses are common; read them.
2. **Security posture.** RLS or equivalent row-level isolation on every table holding emissions data. SOC 2 or ISO 27001 evidence if your buyers require it.
3. **Cost of growth.** What does the bill look like at 10x your current volume? Linear pricing is acceptable. Step-function jumps at thresholds are a red flag — they often indicate the vendor cannot scale your data without re-architecting.

## How to run the evaluation

Do not ask the vendor to self-rate. Ask for **artefacts**:

- A redacted real record from another customer showing the audit chain.
- A sample export package for an auditor.
- The methodology version log for the last 18 months.
- A reference customer who has passed third-party verification on the platform.
- A pricing schedule including the 10x-volume scenario in writing.

A vendor who cannot produce these in 48 hours is not audit-grade.

## What MSMEs typically get wrong

- **Choosing on UI.** Beautiful dashboards do not survive audit. Ugly traceability does.
- **Choosing on price alone.** The cheapest tool that fails verification costs ₹0 to buy and ₹15 lakh to rebuild from.
- **Choosing on AI features.** "AI-powered estimation" is the most common reason data fails audit. Use AI for OCR and field extraction; never for emission math.
- **Skipping the export test.** If you cannot extract your data in audit-ready format on day one, you will be unable to do so on day 730 either.

## Country-specific filters for Indian MSMEs

- IEA 2023 grid factors loaded for India by region (national grid + state-level variation where it matters).
- HSN-to-scope mapping (not just CN/HS for EU exports).
- BRSR-Core format exports for listed customers or those expecting to list.
- GSTIN-based deduplication for invoice ingestion (avoids double-counting the same invoice).
- CBAM declaration export for exporters into covered HS codes.

## Country-specific filters for cross-border MSMEs

- Country-aware grid factors for every country you operate in.
- Multi-currency cost capture per document (for green-finance and tax adapters).
- Local language OCR for the regions you operate in.
- Verifier networks active in your jurisdiction (a verifier accredited in EU does not automatically work in Indonesia).

## What "good enough for year one" looks like

If you cannot run the full 12-point evaluation immediately, prioritise these five:

1. Per-record source storage with hashing.
2. Deterministic math with methodology pinning.
3. Explainability per record.
4. Full data export on demand.
5. Pricing transparency at 10x volume.

If a vendor passes these five, the other seven can be evaluated in production over the first quarter.

## FAQ

**Should I build my own MRV?** Almost never. The fixed cost of a credible MRV system (audit ledger, registry exports, methodology version control) is high and does not produce competitive advantage. Buy and integrate.

**Can I switch MRV providers later?** Yes, but only if you owned the data and could export source documents. If you signed away export rights, switching means rebuilding history from scratch.

**Is the cheapest MRV enough for a small unit?** Often, yes — provided it meets the five priority criteria above. Cheap does not have to mean unsafe.

## Related guides

- [How can we trace every emission number back to raw sensor or invoice data?](https://senseible.earth/climate-intelligence/how-to-trace-emission-data-to-source)
- [What is Senseible and How is It Different from Sensibull?](https://senseible.earth/climate-intelligence/what-is-senseible-different-from-sensibull)
- [What Documents Do I Need for Carbon Verification?](https://senseible.earth/climate-intelligence/documents-needed-carbon-verification)
