// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `Suppose an ice-cream MSME with 30 cold rooms reports Scope 1 from its diesel gensets only. Once refrigerant leakage is included, the true Scope 1 figure can be several times higher.

## The GWP shock

| Refrigerant | Common use | GWP (AR6) |
|---|---|---|
| R-22 | Old AC, cold rooms (HCFC phase-out 2030) | 1,960 |
| R-404A | Commercial refrigeration | 4,728 |
| R-134a | MAC, beverage cooling | 1,530 |
| R-410A | Modern AC | 2,256 |
| R-32 | New AC | 771 |
| R-744 (CO2) | Industrial refrigeration | 1 |
| R-290 (propane) | Small commercial | 3 |

> Losing 1 kg of R-404A adds about 4.7 tCO2e, roughly what burning 1,760 litres of diesel emits.

## How to actually measure leak

The IPCC default emission factor approach:

Annual leakage rate = (refrigerant added during year) / (system charge)

IPCC default annual leak rates for commercial and industrial refrigeration are given as ranges by equipment type, and they are higher than most MSMEs assume because they only count obvious refills.

## A leak detection program that works

### Month 1
Compile last 3 years of refrigerant purchase invoices. Calculate actual leakage rate per system.

### Month 2
Install electronic leak detectors on large systems (mandatory under the EU F-gas Regulation above a CO2-equivalent charge threshold, voluntary in India).

### Month 3
Plan transition: new systems on R-744 or R-290. Old R-22/R-404A systems on accelerated retirement.

### Month 4 onwards
Quarterly inspections logged. Record on [Senseible](/): refrigerant lines feed Scope 1 automatically.

## Financial case

Suppose a cold store's R-404A systems leak 108 kg a year. That is about 510 tCO2e from refrigerant alone. At an illustrative internal carbon price of INR 4,000/t, that is about INR 20 lakh per year of avoidable cost, plus the cost of the lost refrigerant. Compare that with a quote for retrofitting to R-744 to see the payback.

## Regulatory direction

India's HFC freeze under the Kigali Amendment starts in 2028, with reductions from 2032. The HCFC phase-out (including R-22) completes in 2030, apart from a small servicing tail to 2040. Leak reporting rules may tighten as the phase-down proceeds.`;
