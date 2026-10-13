// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `Exporters do not file CBAM declarations. The EU importer, as an authorised CBAM declarant, files one annual declaration by 30 September for the previous year's imports; the first, for 2026, is due by 30 September 2027. Your job is to give that importer verified emissions data per product, early enough to use it.

## At a glance

| Date | What happens | Who |
|---|---|---|
| 1 January 2026 | Definitive period starts | EU importers |
| 31 March 2026 | Applications submitted by this date allow imports to continue while pending | EU importers |
| 1 February 2027 | CBAM certificates go on sale | EU importers |
| From 2027, each quarter end | Hold certificates for at least 50% of embedded emissions imported so far that year | EU importers |
| 30 September 2027 | First annual declaration, covering 2026 | EU importers |
| Ongoing | Supply emissions data per installation and product | Non-EU producers |

## What goes into the annual declaration

- Total quantity of each CBAM good imported in the year.
- Total embedded emissions, from verified actual data or default values.
- The number of certificates to surrender, after the free-allocation adjustment.
- Any carbon price effectively paid in a third country, with evidence.
- Verification reports where actual data is used.

## What the exporter provides

| Data | Detail |
|---|---|
| Installation | Name, location, identifier and production route |
| Product | CN code and quantity per shipment or period |
| Direct emissions | Fuel combustion and process emissions per tonne |
| Indirect emissions | Electricity consumed (counted for cement and fertilisers) |
| Precursors | Embedded emissions of bought-in intermediate goods |
| Carbon price paid | Amount, legal basis and proof, if any |
| Verification | Statement from an accredited verifier |

## Worked example: a quarterly data pack

A small Indian steel unit sends 300 tonnes of hot-rolled coil to one EU buyer in Q2 2026.

| Field | Value |
|---|---|
| CN code | 7208 (hot-rolled flat products) |
| Quantity | 300 tonnes |
| Direct emissions intensity | 2.0 tCO2 per tonne (from 12 months of fuel and process records) |
| Embedded emissions | 600 tCO2 |
| Verification | Planned before 30 September 2027 |

The buyer adds this to its year total. If the unit sends nothing, the buyer applies the default value plus its 10% mark-up. Estimate the money at stake in the [CBAM cost calculator](/cbam-calculator).

## Common mistakes

1. Sending company-wide emissions instead of installation and product-level figures.
2. Leaving out precursors such as purchased pig iron or ammonia.
3. Sharing data after the buyer has already budgeted on default values.
4. Assuming CBAM covers a product (such as textiles) that it does not.

## Frequently asked questions

### Do I need to register in the CBAM Registry as an exporter?
No. Producers outside the EU can register installation data so declarants can reference it, but the declaration duty sits with the importer.

### What if my buyer imports less than 50 tonnes a year?
An importer bringing in 50 tonnes or less of covered goods in a year (excluding electricity and hydrogen) is exempt, so it may not need your data at all.

### How often should I send data?
Agree it with each buyer. Many ask quarterly so they can meet the 50% quarterly certificate holding from 2027 and file the annual declaration on time.

### Is the old quarterly CBAM report still required?
No. Quarterly reports belonged to the transitional period, which ended on 31 December 2025.

## Related

- [EU CBAM explained for emerging-market exporters](/climate-intelligence/eu-cbam-explained-emerging-market-exporters)
- [CBAM default values vs actual emissions](/climate-intelligence/cbam-default-values-vs-actual-emissions-msme-decision-guide)
- [CBAM for Indian exporters](/climate-intelligence/cbam-compliance-indian-exporters)

## Sources

- [Regulation (EU) 2023/956 (CBAM), consolidated text](https://eur-lex.europa.eu/eli/reg/2023/956/2025-10-20)
- [Regulation (EU) 2025/2083 (CBAM simplification)](https://eur-lex.europa.eu/eli/reg/2025/2083/oj)
- [Implementing Regulation (EU) 2025/2621 (default values)](https://eur-lex.europa.eu/eli/reg_impl/2025/2621/oj/eng)
- [European Commission: CBAM definitive regime](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en)
- [European Commission: price of CBAM certificates](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en)`;
