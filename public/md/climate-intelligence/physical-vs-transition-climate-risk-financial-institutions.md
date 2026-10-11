# Physical vs transition climate risk: what financial institutions actually have to measure

Canonical: https://senseible.earth/climate-intelligence/physical-vs-transition-climate-risk-financial-institutions

Physical and transition risks are the two categories every climate-risk framework — TCFD, ISSB S2, RBI's draft disclosure guidance, MAS, ECB, NGFS — uses to organise climate exposure. The distinction matters because the data sources, modelling techniques, and mitigation levers are different. A risk team that treats them as one combined number is doing neither well.

This article is written for risk, credit, and treasury teams at banks, NBFCs, insurers, and asset managers in India and Asia who are operationalising the two categories in 2026.

## Definitions that actually hold up

**Physical risk** is the financial impact of climate-driven changes in the physical environment. It splits into two sub-types:

- *Acute*: discrete events such as floods, cyclones, heatwaves, wildfires. Probability-weighted loss is the right framing.
- *Chronic*: long-term shifts such as sea-level rise, declining water availability, agricultural-yield change. Discounted-cashflow framing is the right framing.

**Transition risk** is the financial impact of the move to a low-carbon economy. It has four sub-types:

- *Policy and legal* (carbon taxes, CBAM, mandated disclosure, litigation)
- *Technology* (cost curves of clean alternatives that strand incumbent capex)
- *Market* (shifts in customer preference, supplier costs, commodity prices)
- *Reputational* (brand and access-to-capital effects)

Most loan books have material exposure to both. The split varies by geography and sector.

## Where each one hurts most

| Portfolio | Dominant physical risk | Dominant transition risk |
| --- | --- | --- |
| Indian mortgage book | Coastal flooding, urban heat | Limited near-term |
| Textile MSME loans | Water stress, heat-related productivity loss | CBAM-equivalent EU buyer pressure |
| Power generation | Asset-level cyclone and water risk | Coal stranding, renewable price compression |
| Auto and components | Supply-chain disruption | ICE-to-EV transition |
| Agriculture | Drought, erratic monsoon | Land-use and methane-policy exposure |
| Commercial real estate (coastal) | Flooding, subsidence | Energy-efficiency retrofit cost |

A typical Indian universal bank's portfolio shows 60–70% of climate-VaR coming from transition risk and 30–40% from physical risk under a delayed-transition scenario; the ratio inverts under a hothouse scenario.

## Data sources that actually work

For physical risk:

- **Hazard layers**: WRI Aqueduct (water), IMD and NASA NEX-GDDP (heat and precipitation), Climate Central CoastalDEM (sea-level), JBA flood maps. Use at least two sources per hazard and reconcile.
- **Asset locations**: geocoded down to coordinates, not just PIN code. Pin-code level analysis is the single largest source of false confidence in Indian physical-risk modelling.
- **Vulnerability functions**: building type, age, construction quality, business-interruption sensitivity.

For transition risk:

- **Scenarios**: NGFS Phase V or later (Orderly, Disorderly, Hothouse, Below 2°C). RBI is expected to standardise on NGFS-aligned scenarios.
- **Sector pathways**: IEA NZE, IEA APS for India, CEEW pathways for India-specific sectors.
- **Counterparty data**: Scope 1, 2, and 3 emissions where disclosed; sector-average intensities where not. Use disclosed data for top exposures and modelled data for the long tail.

## Why combining them is wrong

The two risks correlate negatively in some sectors and positively in others. Combining them into a single Climate-VaR before stress testing hides this. A coal-heavy borrower has high transition risk and possibly low physical risk; a coastal hospitality borrower has high physical risk and low transition risk. Aggregating to one number averages out the actionable signal.

Best practice in 2026 is a two-by-two grid by counterparty: physical-risk band (low / medium / high) × transition-risk band (low / medium / high). Loan officers can act on a grid. They cannot act on a single index.

## Stress testing — when and how

RBI's draft guidance for Indian banks, MAS's published expectations, and the ECB's 2022 climate stress test all converge on:

- At least one short-term (1-year) shock scenario for physical hazards.
- At least one medium-term (5-year) transition scenario.
- At least one long-term (30-year) chronic-physical scenario.
- All three at the portfolio level, with top-exposure deep-dives.

Frequency: annual for the full exercise, with quarterly updates on top exposures and new originations.

## How this connects to MRV

Counterparty-level transition risk depends entirely on the quality of emissions data. Sector averages are acceptable for screening; they are inadequate for credit decisions on material exposures. This is where audit-grade MRV at the borrower level — what Senseible produces for MSME exporters — feeds directly into lender risk models. A bank lending to a CBAM-exposed steel exporter needs that exporter's actual scope-1 intensity, not the national average, to price transition risk into the loan.

## Common mistakes

- Treating climate risk as an ESG reporting task rather than a credit-risk discipline.
- Using vendor "climate scores" without methodology transparency.
- Modelling at pin-code or city level when asset-level coordinates exist.
- Running a single scenario and calling it a stress test.
- Updating annually but never feeding the output into credit underwriting.

## FAQ

**Is physical or transition risk bigger for Indian banks?** Transition risk dominates in absolute terms today because of CBAM and India-EU FTA exposure; physical risk is rising fastest.

**Do small banks need to do this?** Yes if they have material agriculture, MSME-export, or coastal real-estate exposure. The proportionality principle in RBI's draft guidance recognises smaller scope, not absence.

**Where do we start if we have no climate-risk function?** Start with a counterparty heatmap using public hazard layers and disclosed emissions for top 100 exposures. Build internal capability before buying a platform.

## Related guides

- [Can we reroute supply chains to reduce CBAM exposure legally?](https://senseible.earth/climate-intelligence/reroute-supply-chains-reduce-cbam-exposure)
- [How should Indian exporters prepare for EU CBAM compliance?](https://senseible.earth/climate-intelligence/cbam-compliance-indian-exporters)
- [What are the BRSR reporting requirements for Indian companies?](https://senseible.earth/climate-intelligence/brsr-reporting-requirements-india)
