// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `The Global Logistics Emissions Council (GLEC) Framework v3.0 is the de-facto standard for logistics carbon accounting. It is also the basis of ISO 14083:2023.

## The core equation

Emissions per shipment = activity × emission factor

Where activity = tonne-kilometres (tkm), and emission factor depends on mode, vehicle, load factor and empty-return.

## Default factors GLEC publishes

GLEC publishes default intensity factors (per tonne-km) by mode and vehicle or vessel type. Take the values from the current GLEC Framework rather than from secondary sources. As a rough ranking:

| Mode | Vehicle / vessel | Relative intensity per tkm |
|---|---|---|
| Road | Large articulated truck | Medium |
| Road | Small rigid truck | Higher |
| Rail | Diesel or electric | Low |
| Sea | Large container ship or bulk carrier | Very low |
| Air | Long haul belly-hold | Very high |
| Inland waterway | Barge | Low |

> Air freight is far more carbon-intensive than sea freight per tonne-km. The biggest decarbonisation lever for MSMEs is often mode shift, not vehicle efficiency.

## What MSMEs typically miss

### Empty return legs
A truck that delivers full and returns empty should have the empty return trip's emissions allocated to the loaded tonne-km. GLEC defaults include an allowance for empty running; use the carrier's actual figure where available.

### Load factor
For example, if fuel use stayed the same, a truck running at 60% capacity would have emissions per tkm about 1.67 times those at 100%. Always ask the carrier for load factor.

### Hub transhipment
Air freight headline numbers exclude the road leg from factory to airport. Your real Scope 3 must include both.

## Practical workflow

1. Pull last 12 months of dispatch data
2. Bucket by mode and vehicle class
3. Apply GLEC defaults, switching to primary data where available
4. Run the [Logistics & Freight Emissions calculator](/calculators/logistics-emissions) to get ISO 14083-aligned outputs
5. Share with your top 3 buyers on next quarterly review`;
