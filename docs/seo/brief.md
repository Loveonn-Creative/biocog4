# Answer-engine content brief (for writers and research agents)

## What Senseible actually does (verified in code and published pages)
- Reads tax invoices, electricity bills, fuel slips and freight records (image or PDF; PDFs over 10 pages are read in parts) and returns line items with an AI vision model at temperature 0, fixed schema, absent fields null.
- Classifies lines by HSN/tax code first, then keyword match only when the unit agrees. Scope 1 (fuels), Scope 2 (grid electricity, India grid factor 0.710 kg CO2/kWh from CEA, edition to be confirmed), Scope 3 lines go to a separate supplier evidence trail.
- Emissions = activity x published factor. Fuel factors from IPCC 2006 defaults (diesel 2.68 kg/L, petrol 2.31 kg/L, LPG 2.98 kg/kg, PNG 2.05 kg/scm, furnace oil 2.97 kg/L, coal 2.42 kg/kg, kerosene 2.52 kg/L, naphtha 3.26 kg/kg, CNG 2.75 kg/kg). No factor, no figure.
- Electricity bills: reads billing period, tariff, sanctioned load, units. kVAh lines get no grid factor (needs kWh); net-metered units are not treated as consumption.
- Every file gets a SHA-256 fingerprint; duplicates are not counted twice. Ledger entries are hash-chained.
- Verification: rule checks (penalties for missing quantity 20, unit 15, factor 10, abnormal quantity 25, low OCR confidence 15; pass at 80), evidence gate, recompute tolerance max(0.01, 0.1%). Status "Verified" means rule checks passed, not third-party assurance.
- Location-based and market-based Scope 2 reporting (market-based needs instrument data).
- Reports: frameworks reflect uploaded data (BRSR, GRI, GHG Protocol, CBAM data, etc. as drafts; self-declared).
- CBAM cost calculator (2026 to 2034, EU free allocation phase-out, default value mark-ups), CBAM sector cost pages.
- Green loan readiness check, finance application (signed-in), carbon credit eligibility signals (not credit issuance), marketplace listings.
- Biocog Intelligence: grounded chat on the user's own records.
- NOT offered: third-party assurance or certification, carbon credit issuance or registry, public self-serve API (enterprise API on request), blockchain tokens, sensors or continuous monitoring, SOC 2 or ISO 27001 certification.

## Writing rules
- One page answers one real question. Direct answer first (40 to 60 words), then specifics: steps, worked example with numbers, what to watch for.
- Facts from primary sources only (GHG Protocol, IPCC, EUR-Lex, SEBI, BEE, CEA, ISO, SBTi, Verra, Gold Standard, IEA). Keep sources in the data file; show a short source line only where it helps the reader verify.
- If no exact figure exists, give a labelled estimate with its basis ("about 2.7 kg per litre, from the IPCC default...").
- Founder-led, plain voice. No em dashes. No hype. Say what Senseible does and does not do.
- No duplicate intent with an existing URL (docs/seo/url-inventory.tsv). If an existing page covers it, propose an update to that page instead.
- URL: a natural user query, lowercase, hyphenated, no year unless the answer is year-specific, no stop-word stuffing. Lives under /answers/.
