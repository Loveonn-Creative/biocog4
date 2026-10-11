# The GLEC Framework Explained: Freight Emissions Without the Jargon

Canonical: https://senseible.earth/climate-intelligence/glec-framework-explained-msme-freight-emissions

The Global Logistics Emissions Council (GLEC) Framework v3.0 is the de-facto standard for logistics carbon accounting. It is also the basis of ISO 14083:2023.

## The core equation

Emissions per shipment = activity × emission factor

Where activity = tonne-kilometres (tkm), and emission factor depends on mode, vehicle, load factor and empty-return.

## Default factors GLEC publishes

| Mode | Vehicle / vessel | Default kgCO2e per tkm |
| --- | --- | --- |
| Road | Articulated truck >40t | 0.062 |
| Road | Rigid 7.5–17t | 0.140 |
| Rail | Diesel | 0.028 |
| Rail | Electric (EU mix) | 0.018 |
| Sea | Container 8500+ TEU | 0.008 |
| Sea | Bulk handysize | 0.005 |
| Air | Long haul belly-hold | 0.500 |
| Inland waterway | Class V | 0.031 |

Air freight is roughly 60x worse than sea freight per tonne-km. The single biggest decarbonisation lever for MSMEs is mode shift, not vehicle efficiency.

## What MSMEs typically miss

### Empty return legs

A truck that delivers full and returns empty should have its emissions doubled per loaded tonne-km. GLEC default empty-running factor for road: 0.20–0.40.

### Load factor

A truck running at 60% capacity has emissions per tkm 1.67x higher than at 100%. Always ask the carrier for load factor.

### Hub transhipment

Air freight headline numbers exclude the road leg from factory to airport. Your real Scope 3 must include both.

## Practical workflow

1. Pull last 12 months of dispatch data
2. Bucket by mode and vehicle class
3. Apply GLEC defaults — primary data only if available
4. Run the [Logistics & Freight Emissions calculator](https://senseible.earth/calculators/logistics-emissions) to get ISO 14083-aligned outputs
5. Share with your top 3 buyers on next quarterly review

## Related guides

- [How do Logistics firms calculate Scope 1 emissions in India?](https://senseible.earth/climate-intelligence/logistics-scope-1-emissions-india)
- [Logistics Fleet Emissions in India: Scope 1 Measurement from Invoices](https://senseible.earth/climate-intelligence/logistics-scope-1-emissions-india-fleet-measurement)
