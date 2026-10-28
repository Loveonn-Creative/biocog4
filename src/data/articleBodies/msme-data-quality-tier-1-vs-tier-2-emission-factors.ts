// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `Two companies can report the same Scope 1 emissions and have wildly different data quality. The IPCC tier system gives you a vocabulary to talk about it.

## The three tiers

| Tier | What it uses | Relative uncertainty | Example |
|---|---|---|---|
| Tier 1 | Default IPCC factors + national activity data | Highest | Diesel × 2.645 kgCO2e/L |
| Tier 2 | Country or technology-specific factors + activity data | Medium | Diesel factor using India-specific fuel properties |
| Tier 3 | Direct measurement or facility-specific factors | Lowest | CEMS-measured stack CO2 + flow |

## When each tier is acceptable

- Tier 1: First baseline, screening, internal use
- Tier 2: CDP and CSRD reporting, most CBAM transitional-period reports
- Tier 3: EU ETS installations, ISO 14064-3 reasonable assurance. CBAM actual emissions (definitive period from 2026) must be installation-specific, though default values remain available

## The MSME progression path

### Year 1: Tier 1
Use default IPCC + DEFRA factors. [Senseible](/) defaults to Tier 1 with full traceability.

### Year 2: Tier 2
Apply the latest CEA grid factor. Use BEE-published industry-specific intensities. Incremental cost: minimal.

### Year 3+: Tier 3
For your largest emission source only. Install fuel meters on top three boilers. Use stack CEMS for CPCB-flagged sources.

## Data quality scoring

The Pedigree Matrix (Weidema 1996, used in Ecoinvent) scores five attributes 1–5:

- Reliability
- Completeness
- Temporal correlation
- Geographical correlation
- Technology correlation

A score of (1,1,1,1,1) is gold standard. Many MSME baselines start in the middle of the range. Aim to improve one number per year.

> Auditors tend to accept Tier 1 in year 1 but expect improvement over time. The trajectory matters more than the level.

## What to document

For every emission factor used: source, publication year, geography, technology assumption, uncertainty estimate. The compliance ledger in your dashboard captures this automatically.`;
