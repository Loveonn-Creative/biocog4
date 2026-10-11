# Tier 1 vs Tier 2 vs Tier 3 Emission Factors: How Good Is Your Data, Really?

Canonical: https://senseible.earth/climate-intelligence/msme-data-quality-tier-1-vs-tier-2-emission-factors

Two companies can report the same Scope 1 emissions and have wildly different data quality. The IPCC tier system gives you a vocabulary to talk about it.

## The three tiers

| Tier | What it uses | Typical uncertainty | Example |
| --- | --- | --- | --- |
| Tier 1 | Default IPCC factors + national activity data | ±20–40% | Diesel × 2.68 kgCO2e/L |
| Tier 2 | Country or technology-specific factors + activity data | ±10–25% | Indian fleet diesel factor adjusted for Bharat VI |
| Tier 3 | Direct measurement or facility-specific factors | ±5–15% | CEMS-measured stack CO2 + flow |

## When each tier is acceptable

- Tier 1: First baseline, screening, internal use
- Tier 2: CDP A-list, CSRD compliance, most CBAM transitional
- Tier 3: CBAM definitive period (2026+), EU ETS, ISO 14064-3 reasonable assurance

## The MSME progression path

### Year 1 — Tier 1

Use default IPCC + DEFRA factors. [Senseible](https://senseible.earth/) defaults to Tier 1 with full traceability.

### Year 2 — Tier 2

Apply CEA grid factors per state. Use BEE-published industry-specific intensities. Incremental cost: zero.

### Year 3+ — Tier 3

For your largest emission source only. Install fuel meters on top three boilers. Use stack CEMS for CPCB-flagged sources.

## Data quality scoring

The Pedigree Matrix (Weidema 1996, used in Ecoinvent) scores five attributes 1–5:

- Reliability
- Completeness
- Temporal correlation
- Geographical correlation
- Technology correlation

A score of (1,1,1,1,1) is gold standard. Most MSME baselines start at (3,2,2,3,3). Aim to improve one number per year.

Auditors are increasingly forgiving of Tier 1 in year 1, intolerant of Tier 1 by year 3. The trajectory matters more than the level.

## What to document

For every emission factor used: source, publication year, geography, technology assumption, uncertainty estimate. The compliance ledger in your dashboard captures this automatically.

## Related guides

- [How can we trace every emission number back to raw sensor or invoice data?](https://senseible.earth/climate-intelligence/how-to-trace-emission-data-to-source)
- [What is Senseible and How is It Different from Sensibull?](https://senseible.earth/climate-intelligence/what-is-senseible-different-from-sensibull)
- [What Documents Do I Need for Carbon Verification?](https://senseible.earth/climate-intelligence/documents-needed-carbon-verification)
