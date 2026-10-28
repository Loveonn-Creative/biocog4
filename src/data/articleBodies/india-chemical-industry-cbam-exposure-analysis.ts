// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `CBAM covers only a few chemical products: ammonia (CN 2814), nitric acid (2808 00 00), potassium nitrates (2834 21 00), nitrogen fertilisers (3102), most mixed fertilisers (3105, except 3105 60 00) and hydrogen (2804 10 00). Since 1 January 2026, EU buyers owe certificates on these, counting both direct and indirect emissions for fertilisers.

## At a glance

| Product | CN code | Emissions counted | Default value mark-up |
|---|---|---|---|
| Ammonia | 2814 | Direct and indirect | 1% |
| Nitric acid | 2808 00 00 | Direct and indirect (CO2 and N2O) | 1% |
| Urea and other nitrogen fertilisers | 3102 | Direct and indirect | 1% |
| Mixed fertilisers | 3105 (not 3105 60 00) | Direct and indirect | 1% |
| Potassium nitrates | 2834 21 00 | Direct and indirect | 1% |
| Hydrogen | 2804 10 00 | Direct only | 10% (2026), 20% (2027), 30% (2028 on) |

Specialty chemicals, dyes, pharmaceuticals, polymers and most organic chemicals are not covered under current law.

## Why the fertiliser chain is different

Fertiliser emissions are counted with their precursors. Ammonia made from natural gas or coal carries most of the footprint, and nitric acid adds nitrous oxide (N2O), a gas with a warming effect roughly 270 times CO2 over 100 years. A plant that buys ammonia must account for the ammonia's embedded emissions as well as its own.

## Worked example: indirect emissions from grid power

| Step | Value |
|---|---|
| Electricity used by a urea unit | 12,000 MWh a year |
| India grid factor (CEA v22.0, FY 2025-26) | 0.675 tCO2 per MWh |
| Indirect emissions | 8,100 tCO2 |
| Urea output | 60,000 tonnes |
| Indirect intensity added | 0.135 tCO2 per tonne |

Add direct process and combustion emissions, plus precursor ammonia, to get the full figure your EU buyer declares. Test the cost in the [CBAM cost calculator](/cbam-calculator).

## Hydrogen

Hydrogen importers are always covered (the 50-tonne exemption does not apply). Grey hydrogen from natural gas reforming carries far more embedded emissions than hydrogen from electrolysis on low-carbon power, so production route is decisive. Hydrogen default values carry the 10%, 20% and 30% mark-ups.

## A 5-step plan for Indian chemical exporters

1. Check each EU-bound product against the CN codes above. If it is not listed, CBAM does not apply, though EU buyers may still ask for product carbon footprints.
2. For covered products, collect gas, coal, power and raw-material records per plant.
3. Quantify N2O from nitric acid production where relevant.
4. Trace precursor emissions for bought-in ammonia.
5. Get the data verified before your buyer's first declaration (due 30 September 2027).

## Frequently asked questions

### Is urea covered by CBAM?
Yes. Urea falls under CN 3102 (mineral or chemical nitrogen fertilisers).

### Are dyes or textile chemicals covered?
No. CBAM covers only the products listed above within chemicals.

### Why is the fertiliser mark-up only 1%?
Implementing Regulation (EU) 2025/2621 sets a 1% mark-up for fertilisers, compared with 10% to 30% for steel, aluminium, cement and hydrogen.

### Do indirect emissions matter for hydrogen?
Under the definitive rules, hydrogen counts direct emissions only; fertilisers and cement count direct and indirect.

## Related

- [CBAM for Indian exporters](/climate-intelligence/cbam-compliance-indian-exporters)
- [EU CBAM explained for emerging-market exporters](/climate-intelligence/eu-cbam-explained-emerging-market-exporters)
- [CBAM for chemical manufacturers in India](/solutions/cbam-chemicals-india)

## Sources

- [Regulation (EU) 2023/956 (CBAM), consolidated text](https://eur-lex.europa.eu/eli/reg/2023/956/2025-10-20)
- [Regulation (EU) 2025/2083 (CBAM simplification)](https://eur-lex.europa.eu/eli/reg/2025/2083/oj)
- [Implementing Regulation (EU) 2025/2621 (default values)](https://eur-lex.europa.eu/eli/reg_impl/2025/2621/oj/eng)
- [European Commission: CBAM definitive regime](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en)
- [European Commission: price of CBAM certificates](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en)
- [Central Electricity Authority: CO2 Baseline Database v22.0](https://cea.nic.in/cdm-co2-baseline-view?mappingId=234&lang=en)
- [IPCC AR5/AR6 global warming potentials](https://www.ipcc.ch/report/ar6/wg1/)`;
