# Calculators hub

Five free, public, deterministic calculators. No login. No data sent to third parties. All math is computed client-side or in a stateless edge function.

## The five calculators

1. **Product Carbon Footprint (PCF).** Bottom-up cradle-to-gate PCF for a single SKU, aligned to ISO 14067 and the GHG Protocol Product Standard. Returns kgCO2e per unit and a breakdown by life-cycle stage.
2. **Supplier emissions risk.** Scores a supplier list by emission intensity, data quality, and country grid factor. Surfaces the suppliers contributing the largest Scope 3 share.
3. **Energy transition savings.** Models solar PV, energy efficiency, and grid PPA scenarios against the user's current electricity bill. Returns payback period, tCO2e avoided, and green loan eligibility flag.
4. **Logistics emissions.** GLEC-aligned freight emissions for road, rail, sea and air. Inputs accept tonne-kilometres or invoice line items.
5. **Carbon pricing impact.** Forecasts cost exposure under EU ETS, EU CBAM, India CCTS and an optional internal carbon price.

## Why deterministic

Every output is reproducible from the same inputs. The platform does not use AI to generate numbers — AI is used only to parse uploaded documents into numeric fields. Failures are explicit (e.g. "missing tonne-kilometre input") rather than silently estimated.

## Saving runs

Each calculator includes a Save Run action. Saved runs sync to the [calculator history page](/calculators/history) and can be exported as CSV or JSON. Premium accounts get real-time autosave; free accounts use manual save.
