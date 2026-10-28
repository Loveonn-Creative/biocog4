// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `To turn an electricity bill into emissions, multiply the kWh billed by your country's grid emission factor. In India, the Central Electricity Authority's CO2 Baseline Database v22.0 gives 0.675 tCO2 per MWh (0.675 kg per kWh) for FY 2025-26, so a 10,000 kWh monthly bill equals about 6.8 tonnes of CO2.

## At a glance

| Input | Where to find it | Example |
|---|---|---|
| Electricity used | "Units consumed" or kWh on the bill | 10,000 kWh a month |
| Grid emission factor | National authority (India: CEA) | 0.675 kgCO2 per kWh |
| Monthly emissions | kWh × factor | 6,750 kgCO2 (6.75 t) |
| Annual emissions | Sum of 12 bills | ≈ 81 tCO2 |

## The formula

Scope 2 emissions (kgCO2) = electricity consumed (kWh) × grid emission factor (kgCO2 per kWh).

This is location-based Scope 2 under the GHG Protocol. If you buy renewable power through a contract or certificates, also report market-based Scope 2.

## Worked example: 12 months of bills

| Month | kWh | kgCO2 at 0.675 |
|---|---|---|
| April | 9,400 | 6,345 |
| May | 10,800 | 7,290 |
| June | 11,200 | 7,560 |
| July to March (9 months) | 88,600 | 59,805 |
| **Year** | **120,000** | **81,000 (81.0 t)** |

Upload your bills on the [Senseible homepage](/) and the line items are read and multiplied for you, with the factor and source shown.

## Common mistakes

1. Using the bill amount in rupees instead of kWh.
2. Mixing kWh and MWh (1 MWh = 1,000 kWh).
3. Using an old or foreign grid factor. Always state the version and year.
4. Forgetting diesel generator use, which is Scope 1, not Scope 2.
5. Counting rooftop solar output as grid electricity.

## Frequently asked questions

### Which grid factor should I use outside India?
Your country's official factor: for example, Vietnam's annual factor from the Department of Climate Change. Note the year and source next to the result.

### My bill shows kVAh, not kWh. What now?
Use the kWh (active energy) figure for emissions. If only kVAh appears, ask your utility for kWh or use the power factor stated on the bill.

### Does a green tariff reduce my footprint?
It reduces market-based Scope 2 if it comes with valid contractual instruments. Location-based Scope 2 still uses the grid factor.

### Is a newer Indian factor available?
CEA publishes the CO2 Baseline Database annually. Version 22.0 covers FY 2025-26; check the CEA site for a newer version before final reporting.

## Related

- [Market-based vs location-based Scope 2](/climate-intelligence/scope-2-market-based-vs-location-based-msme-guide)
- [Scope 2 emissions for manufacturers in India](/climate-intelligence/manufacturing-scope-2-emissions-india)
- [BRSR reporting requirements in India](/climate-intelligence/brsr-reporting-requirements-india)

## Sources

- [Central Electricity Authority: CO2 Baseline Database v22.0](https://cea.nic.in/cdm-co2-baseline-view?mappingId=234&lang=en)
- [GHG Protocol Scope 2 Guidance](https://ghgprotocol.org/scope-2-guidance)`;
