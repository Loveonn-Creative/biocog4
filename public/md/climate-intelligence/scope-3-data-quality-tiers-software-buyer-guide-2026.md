# Scope 3 data quality tiers: what audit-grade actually requires from your software

Canonical: https://senseible.earth/climate-intelligence/scope-3-data-quality-tiers-software-buyer-guide-2026

Published 2026-05-23.

Most Scope 3 software in 2026 produces a number. Fewer produce a number that survives external assurance. The difference is data quality: specifically, the tier of input data used for each Scope 3 category and the transparency with which that tier is recorded against the number. For controls and evidence that hold up to assurance, see [ESG data management and assurance](https://senseible.earth/esg-data-management).

This article is for buyers of carbon software who have outgrown their first spend-based estimate and need a procurement specification that holds up under ISAE 3410, ISO 14064-3, or CDP scoring.

## The four-tier framework, plainly

Drawing on the GHG Protocol Scope 3 Technical Guidance and the PCAF data-quality scores, a practical four-tier hierarchy for data quality is:

- **Tier 1: Supplier-specific primary data.** Activity data and emission factor both from the supplier, ideally verified.
- **Tier 2: Hybrid.** Activity data from the supplier, emission factor from a recognised database (ecoinvent, DEFRA, EPA, IPCC, India GHG Programme).
- **Tier 3: Average data.** Activity data from the buyer, sector-average emission factor.
- **Tier 4: Spend-based.** Monetary spend converted through a sector spend factor (EXIOBASE, USEEIO, India-EXIO).

Each tier is generally more accurate than the next. Spend-based numbers are sufficient for screening; they fail almost all forms of credible disclosure on material categories.

## Why "audit-grade" is a real specification, not marketing

An assurance provider working to ISAE 3410 limited assurance asks three questions of every Scope 3 number:

1. What is the data tier?
2. Where is the source evidence?
3. What was the calculation method, including methodology version and emission-factor database vintage?

If any of these cannot be answered for a specific number, that number is excluded from assurance or qualified. Most early Scope 3 tools fail on question 2: they store the number but not the trail to the input.

A correct audit-grade record looks like this for a single Scope 3 Category 1 entry (illustrative values):

| Field | Value |
| --- | --- |
| Category | 1: Purchased goods and services |
| Activity | 12,400 kg cotton yarn purchased |
| Supplier | Supplier ID 9381 |
| Source document | Invoice INV-2025-04-318 |
| Document hash | 0x7f3a... |
| Data tier | Tier 2 |
| Emission factor | 6.9 kg CO2e/kg, ecoinvent 3.10, IN-MH market |
| Calculated emission | 85,560 kg CO2e |
| Methodology | GHG Protocol Scope 3, Category 1, hybrid method |
| Verifier note (optional) | Confirmed via supplier survey 2025-Q4 |

Anything less is below audit-grade for that line item.

## What good software does

Reasonable specification when buying:

- Captures and stores source documents at line-item granularity.
- Hashes documents for tamper-evidence.
- Records data tier per line, not per category.
- Locks emission-factor database vintage at the moment of calculation; does not retroactively change historical numbers.
- Supports method switching (spend-to-hybrid-to-supplier-specific) without recalculating history.
- Exports a verifier-ready trail without manual reconstruction.

What weaker software does:

- Stores aggregate numbers only.
- Silently updates emission factors when the database changes, breaking historical comparability.
- Forces a single method per category, removing the ability to mix tiers across the long tail and the top exposures.
- Cannot export evidence at line-item level.

## The Pareto-shaped reality of Scope 3

In most companies, a small share of Scope 3 line items accounts for most of the total. The right operational pattern is:

- Use supplier-specific (Tier 1 or 2) data for the top line items by emission contribution.
- Use sector-average (Tier 3) for the middle.
- Use spend-based (Tier 4) for the long tail.
- Disclose the mix explicitly.

Trying to upgrade everything to Tier 1 is impractical and unnecessary. Trying to leave everything at Tier 4 is non-defensible for material categories. The middle path is the audit-grade path.

## What this means for software selection

When evaluating Scope 3 software in 2026:

1. Ask for a sample line item with full audit trail. If they cannot produce one, the software cannot.
2. Ask which emission-factor databases are supported, at which vintage, and how vintage changes are handled.
3. Ask whether data tier is a stored field per line. If not, audit-grade is structurally impossible.
4. Ask for a sample export that an external verifier could work from in a week. Time the demo.
5. Ask how method-switching is handled when a previously-spend-based supplier provides primary data mid-year.

These five questions filter out many vendors.

## Common mistakes buyers make

- Buying on UI quality rather than data-model quality.
- Accepting a sector-average answer for material categories because it is faster.
- Mixing methodology versions across years and losing comparability.
- Letting the vendor pick the emission-factor database without disclosure.
- Treating supplier surveys as Tier 1 by default; they are Tier 1 only if verified.

## How this connects to MRV

The same line-item, evidence-linked, hash-anchored discipline that audit-grade Scope 3 requires is what an MRV layer provides natively. Companies that build on that layer can move from a first BRSR report to a CDP submission by changing only the disclosure wrapper; companies that start from spend-based estimates often end up redoing the work.

## FAQ

**Is spend-based ever acceptable?** Yes, for screening and for non-material long-tail categories, with disclosure.

**Does Tier 1 always require supplier verification?** For full Tier 1 yes; an unverified supplier survey is sometimes labelled Tier 2 in practice.

**How often should emission-factor databases be updated?** Lock them per reporting year. Update for the next year only. Never retroactively, without disclosure.

**Does our software vendor need to be assurance-firm-recognised?** The software does not require recognition; the data trail it produces does. Auditors look at the trail, not the vendor logo.

## Related guides

- [calculating supply chain emissions](https://senseible.earth/climate-intelligence/scope-3-emissions-supply-chain-msme-calculator)
- [spend-based versus activity-based Scope 3](https://senseible.earth/climate-intelligence/spend-based-vs-activity-based-scope-3-method-choice)
- [Scope 3 for Bangladesh textile exporters](https://senseible.earth/climate-intelligence/scope-3-calculator-bangladesh-textile-exporters)
- [embedded emissions in semi-finished imports](https://senseible.earth/climate-intelligence/emissions-data-hidden-in-semi-finished-imports)
