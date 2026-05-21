# CBAM cost calculator

A free public estimator for EU Carbon Border Adjustment Mechanism exposure. Designed for exporters of steel, aluminium, cement, fertiliser, hydrogen and electricity from India and other emerging-market origins.

## What it computes

- Per-tonne embedded carbon for the selected CN customs code, using EU default values during the transition period (2026 quarterly updates) and actual verified emissions once available.
- EU CBAM certificate cost in EUR/tonne, applying the quarterly EU ETS reference price.
- Free-allocation phase-out schedule between 2026 and 2034, including the linear reduction factor.
- Comparison of default-value cost vs verified-actual cost so exporters can decide whether installing MRV is economically rational.

## Inputs

- CN customs code (8-digit).
- Annual export volume in tonnes.
- Destination EU member state (for documentation).
- Optional: actual verified specific emissions in tCO2e per tonne.

## Outputs

- Annual CBAM liability in EUR.
- Cost per tonne of product.
- Savings unlocked by verified emissions vs default values.
- Direct link to the appropriate sector solution page and to the [steel and aluminium CBAM compliance checklist](/climate-intelligence/steel-aluminum-exporters-cbam-compliance-checklist).

## Methodology

EU defaults are sourced from the European Commission's CBAM implementing regulations and updated each calendar quarter. ETS reference prices are taken from the most recent published EUA auction. All numbers are deterministic and reproducible — no model inference is used in the cost calculation itself.
