# Spend-based vs activity-based: which Scope 3 method should you use?

Canonical: https://senseible.earth/climate-intelligence/spend-based-vs-activity-based-scope-3-method-choice

Published 2026-05-21.

The GHG Protocol allows multiple methods to calculate Scope 3 emissions. The two that matter for most MSMEs are spend-based and activity-based. Picking the right one (sometimes for the same category) is one of the highest-leverage decisions in a Scope 3 program.

## The two methods in one sentence each

- **Spend-based.** Multiply how much you spent (₹ or USD) on a category by a published emission factor per currency unit.
- **Activity-based.** Multiply the physical quantity you bought (kg, tonne, kWh, km) by a published emission factor per physical unit.

Activity-based is more accurate. Spend-based is faster and works with data you already have.

## Comparison table

| Dimension | Spend-based | Activity-based |
| --- | --- | --- |
| Input data | Procurement spend (already in ERP) | Quantities purchased (often missing) |
| Accuracy | Lower | Higher |
| Cost to implement | Low | Moderate to high |
| Time to first number | Days | Weeks to months |
| Useful for reduction decisions | Weak: price changes confound | Strong: physical units are real |
| Acceptable for disclosure | Yes (with materiality flag) | Yes (preferred) |
| Acceptable for SBTi target setting | Yes for screening | Preferred for tracking progress in major categories |
| Acceptable for CBAM | No | Yes |

## When spend-based is the right answer

- **Initial screening.** You have no Scope 3 baseline and need one in 30 days to decide where to invest measurement effort.
- **Long-tail categories.** Categories that contribute < 5% of estimated total Scope 3, where activity-based effort is not economic.
- **Indirect categories.** Professional services, software subscriptions, where physical quantity is not a meaningful concept.

## When activity-based is the right answer

- **Material categories.** Anything over 10% of estimated total Scope 3 emissions.
- **Categories tied to a reduction lever.** If you can switch supplier, switch material, or switch freight mode, you need physical-unit measurement to see whether the switch worked.
- **Regulated categories.** CBAM declarations require verified actual emissions or the official default values, not spend conversions.
- **Customer-facing claims.** Product carbon footprints quoted to buyers must be activity-based per ISO 14067.

## The hybrid pattern

Most credible MSME Scope 3 programs use both, segmented by category.

| GHG Protocol Scope 3 category | Recommended method |
| --- | --- |
| Cat 1: Purchased goods (top 80% by spend) | Activity-based |
| Cat 1: Purchased goods (long tail) | Spend-based |
| Cat 2: Capital goods | Spend-based |
| Cat 3: Fuel- and energy-related | Activity-based |
| Cat 4: Upstream transport | Activity-based (GLEC) |
| Cat 5: Waste | Activity-based |
| Cat 6: Business travel | Activity-based |
| Cat 7: Employee commuting | Hybrid (survey-derived activity) |
| Cat 9: Downstream transport | Activity-based |
| Cat 11: Use of sold products | Activity-based modelling |
| Cat 12: End-of-life | Activity-based modelling |

## Why spend-based hides decisions

If your supplier raises prices but emits the same kg of CO2e per unit, your spend-based Scope 3 number goes *up* even though nothing physically changed. The reverse (supplier discounts your contract but does not decarbonise) makes your number *fall* even though emissions are flat. This is the central reason spend-based numbers are weak for management decisions.

## The data-quality tier mental model

A common way to describe Scope 3 data quality, building on the GHG Protocol's Technical Guidance for Calculating Scope 3 Emissions, is a tier system:

- **Tier 1.** Supplier-specific, primary, activity-based, third-party verified.
- **Tier 2.** Supplier-specific primary data without verification.
- **Tier 3.** Industry-average activity-based factors.
- **Tier 4.** Spend-based with environmentally extended input-output (EEIO) factors.
- **Tier 5.** Spend-based with generic factors.

Move up the tiers as the category becomes material. Do not move all categories simultaneously; sequence by emissions contribution.

## How to actually move from spend to activity

1. **Rank suppliers by Scope 3 contribution.** Use spend-based as the screening pass.
2. **Top 20 suppliers.** Request primary data via a standard questionnaire. Many will already have a footprint they can share.
3. **Top 100 suppliers.** Negotiate activity-data sharing into renewal contracts.
4. **Long tail.** Stay on spend-based until material conditions change.

**Honest rule.** Spend-based is for understanding. Activity-based is for deciding. Disclose both, label them clearly, and never let a spend-based reduction headline drift into a customer-facing claim.

## FAQ

**Will my auditor reject a spend-based scope 3 number?** Not if it is clearly labelled and the material categories use activity-based. Auditors reject *undisclosed* methodology, not the method itself.

**Can I improve spend-based accuracy without going activity-based?** Yes: use sector-specific EEIO factors instead of generic ones (e.g. Exiobase, USEEIO, India-EEIO). This typically narrows the uncertainty band.

**What about EU CSRD?** CSRD requires the methodology to be disclosed and consistent year-on-year. Material categories migrating from spend to activity must be re-baselined in the year of the switch.

## Related guides

- [What emissions data is hidden inside semi-finished imports?](https://senseible.earth/climate-intelligence/emissions-data-hidden-in-semi-finished-imports)
- [Scope 3 for Bangladesh Textile Exporters: What EU Buyers Need and How to Calculate It](https://senseible.earth/climate-intelligence/scope-3-calculator-bangladesh-textile-exporters)
- [Scope 3 Emissions in Your Supply Chain: MSME Calculator Guide](https://senseible.earth/climate-intelligence/scope-3-emissions-supply-chain-msme-calculator)
