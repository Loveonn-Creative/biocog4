// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `Scope 2 looks deceptively simple ("electricity emissions") until you discover the GHG Protocol requires you to report two different numbers.

## The two methods

### Location-based
Multiply your kWh consumed by the average grid emission factor of the country or sub-region where consumption occurs. India national grid factor: 0.675 kgCO2/kWh (CEA CO2 Baseline Database v22.0, FY 2025-26).

### Market-based
Reflects emissions from electricity that you have contractually purchased (green PPAs, RECs, I-RECs), which can be lower. If you have no contracts, you use the residual mix factor (typically slightly higher than the grid average).

| Scenario | Location-based | Market-based |
|---|---|---|
| Standard grid only | Same as market | Residual mix |
| 100% solar PPA | Grid factor | ~0 kgCO2e/kWh |
| Rooftop solar self-consumption | Grid factor for what you import | 0 for what you generate |

> CDP, SBTi and CSRD all require dual reporting. CBAM is different: indirect (electricity) emissions count only for cement and fertilisers, and replacing the default electricity factor with an actual one requires evidence such as a direct technical connection or a qualifying power purchase agreement.

## Common MSME mistakes

- Claiming zero Scope 2 because rooftop solar covers daytime, while importing from grid at night
- Buying RECs from a different country than consumption
- Counting the same green attribute twice (PPA energy + REC purchase)

## What to do

1. Start with location-based: it is the regulator default
2. Add market-based only if you hold valid REC, I-REC or PPA documentation
3. Report both side by side in your annual disclosure
4. For CBAM, attach the bilateral PPA contract to the verification file

Run both numbers automatically in the [Product Carbon Footprint calculator](/calculators/product-carbon-footprint).`;
