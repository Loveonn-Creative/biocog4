// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
// === 25 Country-Specific Problem-First SEO Articles ===
export default `For 1,000 tonnes of Indian blast-furnace steel at 2.1 tCO2 per tonne, the estimated CBAM cost to the EU importer is about €63,000 in 2026 with verified data, rising to about €173,000 in 2034, at the Q3 2026 certificate price of €82.32. With default values instead, 2026 is about €278,000.

## At a glance (1,000 tonnes, €82.32 per certificate)

| Year | Free allocation kept | Verified actual (2.1 tCO2/t) | Default value + mark-up |
|---|---|---|---|
| 2026 | 97.5% | €62,913 | €277,604 |
| 2027 | 95% | €65,733 | €315,656 |
| 2028 | 90% | €71,371 | €356,528 |
| 2030 | 51.5% | €114,791 | €399,948 |
| 2032 | 26.5% | €142,986 | €428,142 |
| 2034 | 0% | €172,872 | €458,028 |

Figures come from the Senseible CBAM engine using an indicative EU benchmark of 1.37 tCO2 per tonne and a default intensity of 4.28 tCO2 per tonne before mark-up. The official product benchmark and default value for your exact CN code decide the real number.

## How each year is calculated

Certificates owed = embedded emissions − (EU benchmark × share of free allocation kept that year). Cost = certificates × certificate price. Two things raise the cost over time: the free-allocation share falls to zero by 2034, and the default-value mark-up rises from 10% in 2026 to 20% in 2027 and 30% from 2028.

## Worked example: 2026, verified data

| Step | Value |
|---|---|
| Embedded emissions: 1,000 t × 2.1 | 2,100 tCO2 |
| Adjustment: 1.37 × 1,000 × 97.5% | 1,335.75 tCO2 |
| Certificates owed | 764.25 |
| × €82.32 | €62,913 |
| Per tonne of steel | ≈ €63 |

## What changes the number most

- **Production route.** Scrap-based electric arc furnace steel is often far below the benchmark, so it may owe little or nothing in early years. Coal-DRI and blast-furnace routes owe much more.
- **Verified vs default data.** The default value mark-up alone adds about €17 per tonne in 2026 in this example, and much more from 2028.
- **The certificate price.** Every €10 change in price moves the 2026 cost in this example by about €6,200.
- **Carbon price paid in India.** Only an amount effectively paid and documented can be deducted.

## What to do with this estimate

1. Run your own tonnage, route and intensity in the [CBAM cost calculator](/cbam-calculator).
2. Share the verified figure with your EU buyer before they budget for default values.
3. Use the 2030 and 2034 rows to price long-term contracts: the cost more than triples between 2026 and 2034 at today's price.

## Frequently asked questions

### Why is my 2026 cost so much higher than "2.5% of emissions"?
Because the 2.5% phase-out applies to the free-allocation benchmark, not to your emissions. Every tonne above the adjusted benchmark carries the full certificate price from 2026.

### Who pays this amount?
The EU importer, as an authorised CBAM declarant. In practice it shows up in the price negotiation with you.

### Which price should I use for planning?
The official CBAM certificate price for 2026 is the quarterly average of EU ETS auctions: €75.36 (Q1), €75.28 (Q2) and €82.32 (Q3). From 2027 it becomes a weekly average. Test a range.

### Does an EAF mill using scrap owe anything?
If its verified intensity is below the adjusted benchmark, the estimate is zero in early years. As free allocation falls, a cost appears, but it stays far below blast-furnace steel.

## Related

- [CBAM for Indian exporters](/climate-intelligence/cbam-compliance-indian-exporters)
- [Steel and aluminium CBAM checklist](/climate-intelligence/steel-aluminum-exporters-cbam-compliance-checklist)
- [CBAM default values vs actual emissions](/climate-intelligence/cbam-default-values-vs-actual-emissions-msme-decision-guide)
- [CBAM for steel manufacturers in India](/solutions/cbam-steel-india)

## Sources

- [Regulation (EU) 2023/956 (CBAM), consolidated text](https://eur-lex.europa.eu/eli/reg/2023/956/2025-10-20)
- [Regulation (EU) 2025/2083 (CBAM simplification)](https://eur-lex.europa.eu/eli/reg/2025/2083/oj)
- [Implementing Regulation (EU) 2025/2621 (default values)](https://eur-lex.europa.eu/eli/reg_impl/2025/2621/oj/eng)
- [European Commission: CBAM definitive regime](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en)
- [European Commission: price of CBAM certificates](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en)`;
