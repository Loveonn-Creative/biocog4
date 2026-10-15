# Batch 2: register for validation

**Status: awaiting founder validation. Nothing here is written or published.**

Source: four research passes over topic lists 4 to 18 (docs/seo/topics-queue.md) plus the 68 "later" rows from batch 1, checked against all 506 live URLs (docs/seo/url-inventory.tsv, including the 198 batch 1 answers). Full register, one row per candidate with question, intent, audience, overlap check, evidence, Senseible tie-in, estimate basis and flags: **docs/seo/batch-02.tsv**.

| Status | Count | Meaning |
|---|---|---|
| propose | 200 | New /answers/ pages for batch 2 (66 priority 1, 134 priority 2) |
| update | 20 | Same intent as a live page: improve that page instead of adding a competitor |
| review | 2 | Close to a live page; keep only if you want a product-specific version |
| merge | 10 | Duplicate intent inside the batch; folded into the stronger candidate |
| later | 76 | Valid but lower priority (49 priority 3); first in line for batch 3 |
| reject | 0 | |

Every subject has at most 8 pages; most have 1 to 4, because a question only gets its own page when India, an industry or an export market makes it genuinely distinct. 128 proposed rows carry a flag (a fast-changing rule or a figure to copy exactly from its source); writers must resolve each flag before a page ships, as in batch 1.

Skipped on purpose: consumer and lifestyle topics; claims Senseible cannot make (public API, speed or accuracy figures, IEA factors, credit issuance, voice input, transitional CBAM generator); subjects already owned by a live page; vendor and internal jargon with no real user question.

## What batch 2 covers (examples)

- **Factory and sector how-tos:** DG set kg CO2 per kWh, cupola vs induction furnace, brick kilns, calcination, glass, tiles per m2, moulding per kg, dye house per metre, cold storage, compressed air, chillers, boiler steam, PPC vs OPC cement, clinker.
- **Electricity:** kVAh bills, which CEA version for which year, residual mix and market-based Scope 2 in India, open access and group captive claims, time-of-day tariffs, maximum demand, battery storage.
- **Exporters:** CSDDD after the Omnibus, EUDR geolocation and India's risk category, EU packaging regulation, battery passport, SB 253 for Indian suppliers, SFDR data requests, HSN to CN mapping, copper and CN 7208 under CBAM.
- **Finance:** India's climate finance taxonomy, sustainability-linked loan KPIs, CGTMSE, priority sector, SIDBI energy efficiency loans, MACC curves, Article 6.2 host authorisation.
- **Honest product questions:** which plan for my volume, what happens when a plan ends, guest use, what Senseible does not calculate, auditor access, multiple GSTINs.

## Fix first: live pages that contradict the code or the flags

These are proposed as updates (status "update") and should be corrected before batch 2 adds related pages:
1. **/answers/carbon-credits-with-senseible** says "credit-ready signals" and mentions an additionality check (both on the flags list).
2. **/answers/senseible-carbon-api** mentions a partner programme the flags list as unverified.
3. **/answers/scope-3-category-1-spend-based** says Senseible "marks spend-based lines clearly"; the Scope 3 method uses no spend-based factor and shows "Needs data" instead.
4. **/answers/where-is-senseible-headquartered** claims grid factors for 19 countries; the code labels non-India factors "IEA 2023", which conflicts with the CEA-only rule.

## Decisions needed from you

1. **Hardware, IoT and meter feeds.** You said Senseible already takes hardware feeds, but no meter or IoT ingestion is visible in the code. Pages on smart meters, telematics and sensors currently say Senseible reads bills, not meters. Tell us how the feed works (which devices or files, who sets it up, what plan) and those pages will describe it accurately.
2. **Cancellation.** The refund policy says data export stays available for 30 days; the plan code keeps records and moves the account to Snapshot after a 7-day grace period. Which is right for the "what happens when my plan ends" page?
3. **Brief vs code.** The product brief says ledger entries are hash-chained; no hash chain was found in code (each file has a SHA-256 fingerprint and duplicates are blocked). Confirm before any page mentions a chained ledger.
4. **Scope of fuel and freight pages.** The fuel table has no MMBtu unit and no coke factor, and Scope 3 freight is calculated only with printed weight, distance and an approved factor. Pages will say this unless you want them changed first.
5. **The two "review" rows** (what Senseible does not calculate; can Senseible calculate freight): keep as product pages, or fold into the existing method pages?

## How to validate

In batch-02.tsv change the first column for any row: `propose` stays, `drop` removes it, or edit the question. Send the file back or list the slugs to drop, and answer the decisions above. Writing starts only after that.
