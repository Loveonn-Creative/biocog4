# Batch 1: register for validation

**Status: awaiting founder validation. Nothing here is written or published.**

Source: five research passes over about 150 topics (three topic lists), checked against all 307 live URLs (docs/seo/url-inventory.tsv). The full register, one row per candidate with question, intent, audience, overlap check, evidence, Senseible tie-in, estimate basis and flags: **docs/seo/batch-01.tsv**.

| Status | Count | Meaning |
|---|---|---|
| propose | 200 | New /answers/ pages for batch 1 (105 priority 1, 95 priority 2) |
| update | 29 | Same intent as a live page: improve that page instead of adding a competitor |
| merge | 4 | Duplicate intent inside the batch; folded into the stronger candidate |
| later | 68 | Valid but lower priority; first in line for batch 2 |
| reject | 0 | (two long URLs were shortened instead) |

No topic gets more than 8 pages. About 40 subjects got 0 or 1 because they are internal product terms with no genuine user question (for example multi-tenant architecture, climate finance data layer, sustainability workflows) or because live pages already answer them. That is deliberate, per "never generate pages to meet a volume target".

## How to validate

In batch-01.tsv change the first column for any row: `propose` stays, `drop` removes it, or edit the question. Send the file back or list the slugs to drop. Writing starts only after that.

## Fix first: live pages with an accuracy problem

1. **/climate-intelligence/carbon-credits-solar-installations-monetize** overstates the credit opportunity: Verra and Gold Standard largely exclude grid-connected renewable energy outside least developed countries. Correct before writing new credit pages.
2. **/climate-intelligence/how-to-calculate-carbon-footprint-electricity-bills** says to use a printed power factor for kVAh. The method (and the White Paper) needs the bill's own kWh reading; kWh = kVAh x average power factor is circular.
3. **CBAM calculator (src/lib/cbamEngine.ts)** applies one EU benchmark (1.52 t/t) to every steel route and has no coal-based DRI route, which is common in India. Verify against the Commission's published CBAM benchmarks before any route comparison page goes live.

## Product facts to confirm (pages must not overclaim)

- Duplicate check: SHA-256 catches only byte-identical files. A re-scan or new photo of the same paper bill is not caught. Pages will say this and recommend invoice number plus supplier GSTIN checks.
- No published accuracy rate for AI bill reading exists; pages describe failure modes and controls, not a percentage.
- Fuel factors: confirm whether they are CO2 only or CO2e. Coal 2.42 kg/kg may overstate low-grade Indian coal by roughly 20 to 40%.
- CEA edition behind the 0.710 kg/kWh grid factor.
- Whether records can be tagged by facility (needed before a multi-plant page claims plant totals).

## Rules held for every page

- 42 proposed pages cover fast-changing rules (CBAM, CSRD after Omnibus, CCTS, SBTi, RBI climate disclosure, REC multipliers, GRI 102). Each carries a "last reviewed" date and goes in the regulation review queue.
- Pages on things Senseible does not do (travel, commuting, use phase, refrigerants, grid factors outside India) say so plainly and point to the right method.
- Legal edge cases (CBAM declarant under DDP, CBAM contract clauses) need a lawyer's read before publishing.
- Estimates are labelled with their basis; sources stay in the data file, with a short source line on the page where it helps the reader verify.

## Updates to existing pages (29)

- `product-carbon-footprint`: /answers/product-carbon-footprint: same intent but only two sentences; expand with a worked example (materials x factor + allocated energy + inbound transport, per declared unit) instead of a new page
- `how-to-calculate-carbon-footprint-electricity-bills`: /climate-intelligence/how-to-calculate-carbon-footprint-electricity-bills has a short kVAh FAQ; update it with the power factor relation (kWh = kVAh x average PF) and the wo
- `does-verra-accept-solar-projects-in-india`: /climate-intelligence/carbon-credits-solar-installations-monetize: covers solar credit maths but never says Verra excludes most grid-connected renewable energy outside least developed
- `how-to-choose-an-mrv-provider-msme-checklist`: /climate-intelligence/how-to-choose-an-mrv-provider-msme-checklist covers the same intent; add checks on factor sourcing, duplicate handling, export of audit trail and API status r
- `brsr-core-assurance-or-assessment`: Update /climate-intelligence/brsr-reporting-requirements-india, which covers BRSR Core and value chain; add the assurance or assessment choice and glide path.
- `ccts-emission-intensity-per-tonne`: Update /climate-intelligence/india-carbon-credit-trading-scheme-targets with a worked intensity calculation.
- `maintain-historical-carbon-data-methodology-changes`: /climate-intelligence/maintain-historical-carbon-data-methodology-changes covers the same intent; add the specific grid factor edition case (CEA database editions) and a wor
- `how-to-trace-emission-data-to-source`: /climate-intelligence/how-to-trace-emission-data-to-source has the same intent; update it with a field-by-field list (document fingerprint, date, vendor and tax ID, quantity, unit, factor 
- `how-to-run-double-materiality-assessment`: /climate-intelligence/csrd-double-materiality-assessment-msme-supplier holds the double-materiality intent for this site's audience; extend with an impact-and-financial scoring worked 
- `how-to-export-scope-3-data-from-tally`: /answers/tally-sap-integration states that ERP feeds are on request; add generic steps (purchase register with stock item quantity, unit and HSN) so the page answers the user's actual how
- `iso-14064-verification-accepted-for-cbam`: /climate-intelligence/cbam-verification-non-eu-producer has a 'Who can verify' section; add an FAQ that ISO 14064-3 verification is not by itself CBAM verification by an accredited ver
- `green-loan-vs-sustainability-linked-loan`: /climate-intelligence/msme-climate-finance-instruments-comparison-2026 already compares SLLs, green bonds and receivables; add a direct GLP vs SLLP decision box there.
- `when-does-ccts-carbon-credit-trading-start`: /climate-intelligence/india-carbon-credit-trading-scheme-targets states certificates trade on power exchanges; add dated trading-start status rather than a new URL.
- `india-carbon-credit-trading-scheme-targets`: /climate-intelligence/india-carbon-credit-trading-scheme-targets covers CCTS targets; add the PAT to CCTS transition and ESCerts rather than a new page.
- `is-there-a-state-wise-grid-emission-factor-india`: /emission-factors/grid-electricity gives the national 0.71 factor; add a section explaining that CEA publishes one integrated national grid factor and how state or captive supp
- `refrigerant-refill-emissions-scope-1`: Update /climate-intelligence/msme-cold-chain-refrigerant-leak-carbon-2026 to cover office and factory AC refill invoices, not only cold chain.
- `do-recs-make-scope-2-zero`: /climate-intelligence/scope-2-market-based-vs-location-based-msme-guide already explains market-based reporting and REC pitfalls; add a short REC quality-criteria and residual-mix section there inste
- `recs-vs-green-tariff-vs-open-access`: /climate-intelligence/green-energy-open-access-india covers open access in depth; add a REC and green tariff comparison block there rather than a near-duplicate.
- `kvah-vs-kwh-for-scope-2`: Update /climate-intelligence/how-to-calculate-carbon-footprint-electricity-bills, which has a short kVAh section; add a power-factor worked example and kVAh billing context.
- `india-recs-reduce-scope-2`: Update /climate-intelligence/scope-2-market-based-vs-location-based-msme-guide with an India REC section instead of a separate page.
- `nbfc-msme-loan-book-financed-emissions`: /climate-intelligence/financed-emissions-banks-india already covers MSME data quality ladders; add a worked score-5 to score-2 example there instead of a new page.
- `cbam-data-indian-steel-mill-sends-eu-buyer`: /climate-intelligence/steel-aluminum-exporters-cbam-compliance-checklist (and the importer-side /climate-intelligence/cbam-supplier-data-steel-importer-poland) already hold this inte
- `msme-circular-economy-iso-59020-reporting`: /climate-intelligence/msme-circular-economy-iso-59020-reporting has the same intent; add worked inflow and outflow metric calculations there.
- `cbam-verification-cost-small-steel-plant`: /climate-intelligence/cbam-verification-non-eu-producer covers the process; add a labelled cost range and drivers.
- `which-emission-factor-database-india`: Update /climate-intelligence/emission-factors-selection-guidance with an India-specific comparison table.
- `choose-carbon-base-year`: Update /climate-intelligence/maintain-historical-carbon-data-methodology-changes, which covers recalculation; add a short base-year selection section rather than a new page.
- `png-bill-scm-to-co2`: Update /emission-factors/png (2.05 kg/scm) with an MMBtu and GCV conversion worked example instead of a new page.
- `biomass-boiler-emissions-scope-1`: Update /climate-intelligence/biogenic-carbon-accounting-food-textile-msme; add boiler-specific CH4 and N2O worked numbers and the separate biogenic CO2 line.
- `black-carbon-in-ghg-inventory`: Update /climate-intelligence/methane-black-carbon-reductions-vs-co2 with a short 'not a Kyoto gas, report separately' section.
