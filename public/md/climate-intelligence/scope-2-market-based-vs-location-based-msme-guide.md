# Market-Based vs Location-Based Scope 2: Which Number Do You Report?

Canonical: https://senseible.earth/climate-intelligence/scope-2-market-based-vs-location-based-msme-guide

Scope 2 looks deceptively simple — "electricity emissions" — until you discover the GHG Protocol requires you to report two different numbers.

## The two methods

### Location-based

Multiply your kWh consumed by the average grid emission factor of the country or sub-region where consumption occurs. India national grid factor: 0.716 kgCO2e/kWh (CEA 2024).

### Market-based

Reflects emissions from electricity that you have contractually purchased — green PPAs, RECs, I-RECs — which can be lower. If you have no contracts, you use the residual mix factor (typically slightly higher than the grid average).

| Scenario | Location-based | Market-based |
| --- | --- | --- |
| Standard grid only | Same as market | Residual mix |
| 100% solar PPA | Grid factor | ~0 kgCO2e/kWh |
| Rooftop solar self-consumption | Grid factor for what you import | 0 for what you generate |

CDP, SBTi and CSRD all require dual reporting. CBAM only accepts the actual contracted electricity factor with proof.

## Common MSME mistakes

- Claiming zero Scope 2 because rooftop solar covers daytime — but importing from grid at night
- Buying RECs from a different country than consumption
- Counting the same green attribute twice (PPA energy + REC purchase)

## What to do

1. Start with location-based — it is the regulator default
2. Add market-based only if you hold valid REC, I-REC or PPA documentation
3. Report both side by side in your annual disclosure
4. For CBAM, attach the bilateral PPA contract to the verification file

Run both numbers automatically in the [Product Carbon Footprint calculator](https://senseible.earth/calculators/product-carbon-footprint).

## Related guides

- [How do we maintain historical carbon data when methodologies change?](https://senseible.earth/climate-intelligence/maintain-historical-carbon-data-methodology-changes)
- [What are the different types of carbon credits in voluntary markets?](https://senseible.earth/climate-intelligence/carbon-credit-types-voluntary-markets)
- [How do we select the right emission factors for our calculations?](https://senseible.earth/climate-intelligence/emission-factors-selection-guidance)
