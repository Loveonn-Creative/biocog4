# Answer-engine content brief (for writers and research agents)

## What Senseible actually does (verified in code and published pages)
- Reads tax invoices, electricity bills, fuel slips and freight records (image or PDF; PDFs over 10 pages are read in parts) and returns line items with an AI vision model at temperature 0, fixed schema, absent fields null.
- Classifies lines by HSN/tax code first, then keyword match only when the unit agrees. Scope 1 (fuels), Scope 2 (grid electricity, India grid factor by the bill's financial year from the CEA CO2 Baseline Database: 0.675 kg CO2/kWh for FY 2025-26, version 22.0), Scope 3 lines go to a separate supplier evidence trail.
- Emissions = activity x published factor. Fuel factors from IPCC 2006 defaults (diesel 2.645 kg/L, petrol 2.176 kg/L (IPCC carbon content at Indian density, PPAC), LPG 2.98 kg/kg, PNG 2.05 kg/scm, furnace oil 2.97 kg/L, coal 1.76 kg/kg Indian / 2.44 kg/kg imported, kerosene 2.52 kg/L, naphtha 3.26 kg/kg, CNG 2.69 kg/kg). No factor, no figure.
- Electricity bills: reads billing period, tariff, sanctioned load, units. On kVAh bills it uses the printed kWh; otherwise kVAh times the printed power factor (labelled an estimate) or kWh the user enters (labelled "Entered by you"); without one of these the line waits for kWh. Two meter readings in a photo give units as their difference. Net-metered units are not treated as consumption.
- Every file gets a SHA-256 fingerprint; duplicates are not counted twice. Ledger entries are hash-chained (owner, October 2026; the chained-ledger hardening is being built separately).
- Spend-based Scope 3 is provided (owner, October 2026): where only spend is available, Senseible provides a spend-based estimate, labelled as spend-based with wider uncertainty (as the white paper says). The automatic document reader does not apply spend-based factors on its own: a line without a printed quantity shows Needs Data. Never write that Senseible does not offer spend-based estimates.
- Hardware and meter feeds are taken (owner, October 2026): set up with the Senseible team for each customer, not a self-serve integration. Capabilities can exist outside the visible code (manual workflows, services, hardware); never write that Senseible lacks one without the owner's word.
- Plan terms: records stay saved on the server; a 7-day period after expiry is for renewal. Do not publish plan terms as instructions unless the owner asks.
- Verification: rule checks (penalties for missing quantity 20, unit 15, factor 10, abnormal quantity 25, low OCR confidence 15; pass at 80), evidence gate, recompute tolerance max(0.01, 0.1%). Status "Verified" means rule checks passed, not third-party assurance.
- Location-based and market-based Scope 2 reporting (market-based needs instrument data).
- Reports: frameworks reflect uploaded data (BRSR, GRI, GHG Protocol, CBAM data, etc. as drafts; self-declared).
- CBAM cost calculator (2026 to 2034, EU free allocation phase-out, default value mark-ups), CBAM sector cost pages.
- Green loan readiness check, finance application (signed-in), carbon credit eligibility signals (not credit issuance), marketplace listings.
- Biocog Intelligence: grounded chat on the user's own records.
- NOT offered: third-party assurance or certification, carbon credit issuance or registry, public self-serve API (enterprise API on request), blockchain tokens, SOC 2 or ISO 27001 certification.

## Writing rules
- One page answers one real question. Direct answer first (40 to 60 words), then specifics: steps, worked example with numbers, what to watch for.
- Facts from primary sources only (GHG Protocol, IPCC, EUR-Lex, SEBI, BEE, CEA, ISO, SBTi, Verra, Gold Standard, IEA). Keep sources in the data file; show a short source line only where it helps the reader verify.
- If no exact figure exists, give a labelled estimate with its basis ("about 2.7 kg per litre, from the IPCC default...").
- Founder-led, plain voice. No em dashes. No hype. Say what Senseible does and does not do.
- No duplicate intent with an existing URL (docs/seo/url-inventory.tsv). If an existing page covers it, propose an update to that page instead.
- URL: a natural user query, lowercase, hyphenated, no year unless the answer is year-specific, no stop-word stuffing. Lives under /answers/.
