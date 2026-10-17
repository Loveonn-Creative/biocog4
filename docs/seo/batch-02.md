# Batch 2: register for validation

**Status: approved by the owner (October 2026). Publishing in reviewed batches of 50.**

| Group | Drafted | Reviewed | Held | Live |
|---|---|---|---|---|
| A (priority 1, rows 1 to 50) | 50 | 50 | 2 (duplicates: dg-power-vs-grid-electricity-carbon-per-kwh, is-india-low-risk-under-eudr; in docs/seo/held/) | 48 |
| B (rows 51 to 100) | 50 | 50 | 1 (duplicate: how-is-buffer-pool-contribution-calculated, folded into how-much-of-my-credits-go-to-buffer-pool; in docs/seo/held/) | 49 |
| C (rows 101 to 150) | 50 | 50 | 1 (group-captive-solar-scope-2-reporting: same intent as live group-captive-solar-scope-2, its BRSR table and method note to be added there instead; in docs/seo/held/). rail-vs-road-freight-emissions-india was held, then rebuilt on the India default freight factors and published (October 2026) | 49 |
| D (rows 151 to 200) | 49 | 49 | 1 not written (depreciation-on-solar-and-energy-saving-equipment: no allowed income tax source; Income-tax Act 2025 rates unconfirmed) | 49 |
| E (batch 3 start: 50 rows from the batch 2 "later" list plus the last product row) | 40 | 40 | 10 not written: 8 duplicates of live pages (compressed-air, CSDDD textile, multi-page HT bill, limestone calcination, R-22, SLL KPIs, VM0042, purchased steam); 2 unverifiable figures (CBAM CN 7208 India default, Bangladesh grid factor) | 40 |

Each page is drafted, then independently reviewed for accuracy against primary sources, originality against the nearest live page, search intent, quality and duplication. Pages that cannot be made certain are held, not published. Links to batch 2 pages not yet live are deferred and added when those pages publish.

Source: four research passes over topic lists 4 to 18 (docs/seo/topics-queue.md) plus the 68 "later" rows from batch 1, checked against all 506 live URLs (docs/seo/url-inventory.tsv, including the 198 batch 1 answers). Full register, one row per candidate with question, intent, audience, overlap check, evidence, Senseible tie-in, estimate basis and flags: **docs/seo/batch-02.tsv**.

| Status | Count | Meaning |
|---|---|---|
| propose | 202 | New /answers/ pages for batch 2 (includes the 2 product rows the owner kept) |
| update | 20 | Same intent as a live page: improve that page instead of adding a competitor |
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

## Live pages checked (owner, October 2026)

- Fixed: **/answers/scope-3-category-1-spend-based** (the automatic reader shows lines without activity data as needing data; spend-based estimates are provided separately, labelled as such, per the owner rule in brief.md) and **/answers/where-is-senseible-headquartered** (electricity is calculated with India's CEA factor today; other countries' factors are added once reviewed).
- Kept as they are, because the product has them: **/answers/carbon-credits-with-senseible** (the Carbon Credits section runs the three gates and shows a credit-ready signal) and **/answers/senseible-carbon-api** (the partner programme has its own Partners page).

## Decisions taken (owner, October 2026)

1. **Capabilities outside the code exist.** Hardware and meter feeds are taken, set up with the Senseible team for each customer. Rows about meters, telematics and sensors now say so.
2. **Plan terms:** records stay saved on the server and the 7-day period is for renewal. Plan terms are not published as instructions unless the owner asks, so the plan-expiry page stays in "later".
3. **Hash-chained ledger:** pages may mention it; the chained-ledger hardening is built separately and deployed only after a risk and use-case review.
4. **Fuel and freight:** checked against IPCC 2006. One correction: CNG was 2.75 kg CO2 per kg; IPCC natural gas gives 2.69 (the basis PNG already uses), corrected in its own PR with earlier records still valid. No MMBtu unit or coke factor yet and freight needs printed weight, distance and an approved factor: these are scope limits, not errors, so pages state them.
5. **Both review rows are kept** as product pages (now "propose": 202 in total).

## How to validate

In batch-02.tsv change the first column for any row: `propose` stays, `drop` removes it, or edit the question. Send the file back or list the slugs to drop, and answer the decisions above. Writing starts only after that.
