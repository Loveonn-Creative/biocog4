// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `Indonesia is the world's largest palm oil producer. The EU Deforestation Regulation (EUDR), RSPO, and Indonesia's mandatory ISPO converge on small mills and out-growers in 2026.

## What each scheme demands

| Scheme | Carbon scope | Deforestation cutoff | Smallholder support |
|---|---|---|---|
| EUDR | None (deforestation-free and legality evidence only) | 31 Dec 2020 | Limited grace period |
| RSPO | Full LCA per tonne CPO | 2005 | Group certification allowed |
| ISPO (mandatory) | Mill-level emissions | National forest definition | Subsidised audit |

## Where the carbon actually sits

- Land use change at planting, which is far higher on peatland
- POME methane (palm oil mill effluent), large if untreated
- Boiler fuel (mostly fibre and shell): biogenic, but with CH4
- Transport of FFB and CPO

> Untreated POME is often the largest hidden source at a mill, and methane capture can remove most of it.

## The 2026 mill checklist

1. GIS polygon for every supplying smallholder block
2. Forest-cover proof at 31 Dec 2020 cutoff
3. Mill-level Scope 1 + 2 inventory
4. POME capture installed or planned
5. Traceability to plantation for every batch shipped

## Use Senseible to compile

[Senseible](/) parses Pertamina diesel, PLN electricity bills, and CPO dispatch records, and the output can be mapped to RSPO and ISPO data requests. EUDR polygon upload is a separate workflow.

## Financing

Development finance institutions and Indonesian banks offer green loans for mills with verified mitigation plans. Typical documentation requirement: 12-month emissions baseline, 3-year reduction plan, third-party verification.`;
