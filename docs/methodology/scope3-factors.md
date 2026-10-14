# Scope 3 factors: research notes and drafts

Drafts for `public.scope3_factors` (pending migration `20261019100000_scope3_trail.sql`). The SQL is in `supabase/pending-migrations/scope3_factors_draft.template.sql`. Nothing here is approved: an author checks each value against the publication and inserts it as a draft, then a second person approves it.

## Rules these drafts follow

- **Geography:** India only (`IN`). A supplier's own figure (`SUPPLIER:<GSTIN>`, with its evidence document) always takes precedence.
- **Material:** exact HSN headings, or a freight mode. No chapter-wide or "all goods" factor.
- **Sourcing:** each value is attributed to the publication that states it. Any field that could not be read from the publication itself (table reference, page, publication year, GWP basis, boundary wording) is left as an `<angle-bracket>` placeholder. The SQL fails until each one is filled, so nothing is guessed.
- **What is left out:** a material is left out when the sources disagree, are unofficial, or would make a factor generic. Lines for those materials stay at Needs Data.

## How the values were checked

The primary documents could not be opened from the research session: the hosts were refused by its network policy. Those hosts were the Smart Freight Centre media bucket (403), steel.gov.in, pib.gov.in, worldsteel.org, indiaghgp.org and climatiq.io. Each value below is confirmed by independent search excerpts quoting the same publication, not by reading the PDF. The approver must read the cited page before approving.

## Drafted

| Factor key | Category / material | Value | Source | Confidence | Approver must check |
|---|---|---|---|---|---|
| `SFC_IN_RAIL_FREIGHT_WTW` v1.0 | 4 / `freight:rail` | 0.0106 kg CO2e per tonne-km (WTW = WTT 0.0064 + TTW 0.0041, as rounded in the source) | Smart Freight Centre, *India Default GHG Emission Values V1.0*, complementing the GLEC Framework; co-developed with the TCI-IIMB Supply Chain Sustainability Lab | Two independent excerpts give the same split and total | The latest version of the document (copies are labelled V1.0, v1.2 and V1_3), the table and page, the publication year, and the GWP basis. Method as described: Ministry of Railways annual-report data, a five-year average, IPCC 2006 fuel factors, TTW uplifted to WTW with the GLEC ratio |
| `MOS_IN_STEEL_<heading>` FY2023-24, for headings 7206, 7207, 7208, 7213, 7214, 7216 | 1 / `hsn:<heading>` | 2540 kg CO2 per tonne (2.54 tCO2 per tonne of crude steel, FY2023-24 national average) | Ministry of Steel, *Greening the Steel Sector in India: Roadmap and Action Plan*. The same figure appears in the draft National Steel Policy Vision 2047 | Several independent reports of the Ministry's figure. A Ministry slide deck shows 2.5490 | The boundary (which scopes; not stated in any excerpt), the section or slide, and the publication year. Then decide whether a crude-steel figure is acceptable per tonne of product (see caveats) |

### Air and sea freight: global defaults (approved approach; values to be read from the source)

Air and sea freight have no India-specific intensity: the SFC India defaults cover road and rail only. So the published international defaults are drafted with geography `GLOBAL`. Pending migration `20261020100000_scope3_global_freight.sql` allows `GLOBAL` only for air and sea freight. The method uses a global default only after the supplier's own factor and an India factor are both missing.

| Factor key | Material | Value | Source | Confidence | Approver must check |
|---|---|---|---|---|---|
| `GLEC_GLOBAL_AIR_LONG` | `freight:air:long` (printed distance of 1,500 km or more) | Placeholder. A secondary source quotes GLEC v3.2 Table 1 long haul as 0.936 (belly) and 0.608 (freighter) kg CO2e/tkm WTW | Smart Freight Centre, GLEC Framework | One secondary source | Use the GLEC default for an unknown aircraft type, since invoices rarely say belly or freighter. Also check the version, table, GWP basis and year |
| `GLEC_GLOBAL_AIR_SHORT` | `freight:air:short` (under 1,500 km) | Placeholder. The same source quotes freighter short haul as 1.516 | as above | One secondary source | as above |
| `DESNZ_GLOBAL_SEA_CONTAINER_AVG` | `freight:sea` | Placeholder. A secondary listing quotes DESNZ 2025 average container ship as 0.01612 kg CO2e/tkm (direct) | UK DESNZ, GHG conversion factors 2025 | One secondary source | Decide the boundary: direct only, or direct plus the WTT factor for well-to-wake (consistent with rail). Also check the sheet, row and GWP basis. GLEC's container defaults are per TEU-km, a unit the registry does not convert, so they are not used |

Rule applied: a number confirmed by two or more independent excerpts is filled in (rail, steel). A number seen in only one secondary source is named in a hint, and the SQL fails until the author enters the value from the publication.

The air band (1,500 km) follows the GLEC short- and long-haul split and is chosen from the distance printed on the freight document. A line without a printed distance stays at Needs Data.

Steel caveats, recorded in the row:

- The figure is per tonne of crude steel. Applying it per tonne of finished product leaves out yield loss and rolling, so it understates. That is why cold-rolled (7209), coated (7210) and alloy-steel headings are not drafted.
- It is reported as CO2, not CO2e.
- It is a national average across blast furnace, DRI and scrap-EAF routes, so a supplier's own figure is far more accurate.
- The Ministry's 2030 target is reported both as ~2.4 and as 2.2 tCO2 per tonne of crude steel. This does not affect the FY2023-24 value. The Green Steel Taxonomy (December 2024) uses a different denominator, 2.2 tCO2e per tonne of finished steel, as its green-rating ceiling, so it is not used here.

Checked with the calculation module (`supabase/functions/_shared/scope3.ts`):

- 10 MT of TMT bar (HSN 7214) gives `10 MT = 10000 kg = 10 tonne x 2540 kgCO2e/tonne = 25400 kgCO2e`.
- A 30 t rake over 1,400 km gives `30000 kg / 1000 x 1400 km = 42000 t-km x 0.0106 = 445.2 kgCO2e`.
- A cold-rolled coil (7209) stays at Needs Data: no factor is drafted for it.

## Not drafted, and what would close the gap

| Material | Why not | Route |
|---|---|---|
| Road freight, India (`freight:road`) | The India values are given per vehicle class (LCV, MCV, HCV by GVW). The excerpts were garbled across classes, and one secondary article quotes about 66 g/tkm for heavy trucks, which could not be confirmed. A single road factor would also hide the vehicle class | Read the road table in the SFC India document. Then either add vehicle-class material keys (for example `freight:road:hcv`, a small schema change) or use an India average row if the document gives one |
| Cement (2523) | No official national average was found. Research figures differ: about 0.66 tCO2/t (CEEW) against 0.627 (TERI). The intensity also depends heavily on cement type (OPC, PPC, PSC), which HSN 2523 does not separate | Supplier EPDs: many Indian cement producers publish them. Add them as `SUPPLIER:<GSTIN>` factors with the EPD as evidence |
| Aluminium, plastics, paper and board, chemicals | No India-specific official averages were found | Supplier product carbon footprints or EPDs |
| Business travel, hotel stays | Not researched in this round. The India GHG Programme passenger factors date from 2015 | A later round |

## Sources consulted (via search)

- Smart Freight Centre, India Default GHG Emission Values V1.0: https://smart-freight-centre-media.s3.amazonaws.com/documents/India_Default_GHG_Emission_Values_SFC_INDIA_V1_3.pdf (and the `_latest` copy); announcement https://smartfreightcentre.org/news/13311661
- Ministry of Steel decarbonisation roadmap deck (hosted by worldsteel): https://worldsteel.org/wp-content/uploads/07_India.pdf
- Draft National Steel Policy Vision 2047 coverage: https://theprint.in/economy/steel-ministry-plans-new-policy-aims-to-almost-triple-capacity-to-604-million-tons-by-2047/3068329
- Taxonomy of Green Steel (December 2024): https://www.newsonair.gov.in/steel-and-heavy-industries-ministe-h-d-kumaraswamy-launches-taxonomy-of-green-steel
- India GHG Programme, 2015 India-specific rail factors (older; not used): https://indiaghgp.org/sites/default/files/Rail%20Transport%20Emission.pdf
- Cement intensity estimates (not used): TERI https://teriin.org/opinion/decarbonizing-built-environment-cop28-and-cements-challenge; Chemistry World https://chemistryworld.com/opinion/accelerating-decarbonisation-for-indias-cement-industry/4022929.article
