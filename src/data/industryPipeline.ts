/**
 * Industry pipeline mechanics.
 *
 * Describes, per industry, how the platform actually moves a business from
 * document capture to verified emissions to a monetisation pathway.
 *
 * Rules for anything added here:
 * - No company names, no claimed savings, no reduction percentages, no
 *   timeframes attributed to platform performance. Those would be fabricated.
 * - Numbers may only cite published external references the platform already
 *   uses (IEA 2023 grid factors, EU CBAM transitional defaults, HSN/CN codes,
 *   GHG Protocol category numbering).
 * - Each industry emphasises a different part of the chain so the four layers
 *   do not read the same across sectors.
 */

export interface PipelineLayer {
  /** Short mechanical statement of what happens at this layer. */
  summary: string;
  /** Concrete, checkable points. */
  points: string[];
}

export interface IndustryPipeline {
  /** One line naming what is structurally hard in this sector. */
  problem: string;
  visibility: PipelineLayer;
  verification: PipelineLayer;
  supplyChain: PipelineLayer;
  monetization: PipelineLayer;
  /** External references behind any number used above. */
  references: string[];
}

export const INDUSTRY_PIPELINES: Record<string, IndustryPipeline> = {
  textile: {
    problem:
      'Textile exporters are asked for product-level carbon data by EU buyers long before they have any emissions baseline, and the data sits in utility bills and job-work invoices nobody has ever read as carbon evidence.',
    visibility: {
      summary:
        'The emission signal for a textile unit is already inside documents the unit files for tax — it just has never been read as carbon data.',
      points: [
        'State DISCOM bills carry consumed units (kWh) and sanctioned load; consumed units drive Scope 2 against the grid factor for the billing region.',
        'Dyeing and processing job-work invoices carry the fuel line — furnace oil, briquette, LPG, coal — which maps to Scope 1 combustion by HSN code.',
        'Fibre, yarn and dye purchase invoices carry HSN codes that place the spend in Scope 3 Category 1 (purchased goods and services).',
        'Freight and courier invoices for shipment to port map to Scope 3 Category 4 (upstream transport).',
      ],
    },
    verification: {
      summary:
        'Verification either returns a number with its factor and source, or it returns the exact reason it cannot.',
      points: [
        'A DISCOM bill with an amount but no kWh cannot be converted: the platform returns a data gap naming the missing field, not a spend-based estimate.',
        'Processing invoices that state fuel by cost only are held as unverified until the quantity and unit are present.',
        'Every accepted document is hashed, so the same bill cannot be counted twice across a quarter or re-submitted to a second buyer.',
        'The grid factor, its vintage and the HSN mapping used are recorded against each line, so the number can be reproduced later.',
      ],
    },
    supplyChain: {
      summary:
        'A buyer asking for Scope 3 wants your emissions attached to your identity, not a PDF attached to an email.',
      points: [
        'The tax identifier on the invoice (GSTIN in India, and the equivalent registration in each supported country) is what links a supplier record to the buying brand.',
        'The buyer sees the verified Scope 1/2/3 split, the confidence attached to it, and the evidence hash — enough to place it in their own Category 1 inventory.',
        'The buyer does not see the underlying invoices, prices or customer names unless the supplier explicitly shares them.',
        'Because each document is hash-pinned, a buyer can spot-check a claim without the supplier having to reopen its books.',
      ],
    },
    monetization: {
      summary:
        'For textiles the realistic first return is not a carbon credit — it is keeping the order and lowering the border cost.',
      points: [
        'A verified actual-emissions figure replaces the EU default value in a buyer\'s CBAM-adjacent screening, which matters where the buyer prices carbon into the order.',
        'Verified solar or energy-efficiency invoices are the evidence a lender needs for a sustainability-linked loan KPI.',
        'Marketplace listing requires an additional, project-grade reduction — the platform states plainly when a unit has disclosure-grade data but not credit-grade data.',
      ],
    },
    references: [
      'IEA electricity grid emission factors (2023 edition) for Scope 2 conversion',
      'GHG Protocol Corporate Value Chain (Scope 3) Standard, Categories 1 and 4',
      'HSN/CN commodity codes for fibre, dye and fuel classification',
    ],
  },

  chemical: {
    problem:
      'Chemical units carry process emissions that never appear on a fuel bill, so an invoice-only footprint understates the plant and fails the first serious audit question.',
    visibility: {
      summary:
        'Two distinct streams have to be captured, and they arrive as different document types.',
      points: [
        'Energy stream: electricity bills, furnace oil and natural gas invoices, boiler fuel purchases — Scope 1 combustion and Scope 2.',
        'Feedstock stream: raw material and catalyst invoices with HSN codes, which sit in Scope 3 Category 1.',
        'Process emissions from reaction chemistry are not on any invoice; they are declared separately and flagged as a different data type from invoice-derived lines.',
        'Effluent treatment and hazardous waste manifests map to Scope 3 Category 5 (waste generated in operations).',
      ],
    },
    verification: {
      summary:
        'The platform separates what it derived from evidence from what a plant asserted about its own process.',
      points: [
        'Invoice-derived lines carry a factor, a source and a document hash; declared process lines carry the declaration and are labelled as such in every export.',
        'A footprint that has energy but no declared process emissions is reported as incomplete for this sector rather than presented as a total.',
        'Fuel invoices that state litres or tonnes convert; those that state only value are returned as a gap with the missing field named.',
      ],
    },
    supplyChain: {
      summary:
        'Chemical suppliers are usually two tiers away from the brand doing the asking, which is exactly where Scope 3 breaks.',
      points: [
        'A verified record keyed to the registered tax identifier lets a tier-1 formulator pull a real number for its own Category 1 instead of an industry average.',
        'Where a downstream customer exports to the EU, the chemical input becomes part of their embedded emissions — verified upstream data is what stops a default value being applied.',
        'Commercially sensitive inputs stay hidden: the shared record carries scope totals and confidence, not the bill of materials.',
      ],
    },
    monetization: {
      summary:
        'The near-term value is qualifying as a supplier, followed by financing against process-efficiency evidence.',
      points: [
        'Buyers running supplier screening increasingly reject unquantified suppliers before price is discussed; a verified baseline is the entry condition.',
        'Heat recovery, boiler replacement and renewable procurement invoices form the evidence set a green credit line asks for.',
        'The platform does not represent process-emission reductions as tradeable credits without a recognised methodology behind them.',
      ],
    },
    references: [
      'GHG Protocol Corporate Standard, treatment of process emissions',
      'GHG Protocol Scope 3 Standard, Categories 1 and 5',
      'IEA electricity grid emission factors (2023 edition)',
    ],
  },

  steel: {
    problem:
      'Steel is inside the EU CBAM goods list, so from the definitive period an exporter without verified actual emissions is priced against a default value it cannot argue with.',
    visibility: {
      summary:
        'CBAM asks for emissions per tonne of goods, which means production output has to be captured alongside energy.',
      points: [
        'Coal, coke and natural gas purchase invoices carry quantity and HSN code — direct Scope 1 combustion.',
        'Electricity bills for the arc furnace and rolling mill carry kWh — Scope 2, converted at the regional grid factor.',
        'Dispatch and sales invoices carry tonnage, which supplies the denominator for an intensity figure.',
        'Ore, scrap and flux invoices sit in Scope 3 Category 1.',
      ],
    },
    verification: {
      summary:
        'An intensity number is only produced when both numerator and denominator are evidenced.',
      points: [
        'Without dispatch tonnage the platform reports absolute emissions and declares intensity as a data gap — it does not divide by an assumed output.',
        'Each CN code on the export side is checked against the CBAM goods list rather than inferred from the product description.',
        'Where a domestic carbon price applies, it is recorded as a separate, evidenced deduction rather than folded into the emission figure.',
      ],
    },
    supplyChain: {
      summary:
        'Secondary steel producers sell into construction, auto and engineering buyers who each need the same number in a different format.',
      points: [
        'One verified dataset renders as a buyer-facing Scope 3 record, a CBAM-oriented intensity view, and a lender-facing baseline — without recomputation.',
        'Scrap-based routes usually carry materially lower intensity than integrated routes; a verified figure is what makes that difference legible to a buyer.',
        'Buyer visibility is limited to scope totals, intensity where evidenced, and hashes.',
      ],
    },
    monetization: {
      summary:
        'For steel the measurable financial event is the difference between actual and default emissions at the EU border.',
      points: [
        'The CBAM calculator prices the gap between an evidenced intensity and the applicable transitional default, using published EU values — the exposure is computed, not estimated by the platform.',
        'That same evidence supports green loan and transition-finance conversations where the lender needs a baseline to write a KPI against.',
        'Credit generation from a route change is treated as a project question requiring a recognised methodology, and is not asserted from invoices alone.',
      ],
    },
    references: [
      'EU Regulation 2023/956 (CBAM) goods scope and transitional default values',
      'CN customs codes for iron and steel products',
      'IEA electricity grid emission factors (2023 edition)',
    ],
  },

  logistics: {
    problem:
      'Fleet emissions are the most computable in any sector and still the least reported, because fuel spend is booked as cost and never converted to tonne-kilometres.',
    visibility: {
      summary:
        'Fuel and trip documents together give both the activity and the service unit.',
      points: [
        'Fuel invoices carry litres by fuel type — direct Scope 1 for owned fleet.',
        'Consignment notes and e-way bills carry origin, destination and consignment weight, which produce tonne-kilometres.',
        'Third-party carrier invoices are Scope 3 Category 4, not Scope 1, and are separated accordingly.',
        'Warehouse and cold-storage electricity bills are Scope 2; reefer fuel is Scope 1.',
      ],
    },
    verification: {
      summary:
        'The logistics engine refuses to compute rather than assume a missing leg.',
      points: [
        'Weight or distance missing means no tonne-km figure is produced; the platform states which field is absent instead of substituting a typical load.',
        'Mode is taken from the document, not guessed — road, rail, sea and air carry materially different factors.',
        'Backhaul and empty running are only reflected where the documents evidence them.',
      ],
    },
    supplyChain: {
      summary:
        'A logistics provider is somebody else\'s Scope 3 Category 4, and that is the whole commercial case.',
      points: [
        'A verified per-consignment or per-lane figure is directly consumable by a shipper building its own Category 4 inventory.',
        'Shippers running tenders with a carbon criterion can compare carriers on evidenced intensity rather than self-declared claims.',
        'Customer identities and rates are not exposed; the shared record is the emissions view.',
      ],
    },
    monetization: {
      summary:
        'Value shows up in tenders first, in financing second.',
      points: [
        'Carriers that can produce a verified lane-level figure remain eligible for shipper tenders that now screen on carbon data.',
        'EV and CNG fleet invoices are the evidence base for green asset financing and for green-invoice advance where the counterparty supports it.',
        'Fleet-level fuel switching may be credit-eligible only under a recognised methodology; the platform distinguishes that from disclosure readiness.',
      ],
    },
    references: [
      'GHG Protocol Scope 3 Standard, Category 4 (upstream transportation and distribution)',
      'GLEC-aligned tonne-kilometre activity basis',
      'IEA electricity grid emission factors (2023 edition) for warehouse Scope 2',
    ],
  },

  construction: {
    problem:
      'Most of a building\'s carbon is embodied in materials bought before the site opens, and it is invisible in a footprint that only counts site diesel and site power.',
    visibility: {
      summary:
        'Material procurement is the dominant stream and it arrives as ordinary purchase invoices.',
      points: [
        'Cement, steel, aggregate, glass and aluminium invoices carry quantity and HSN code — Scope 3 Category 1, and usually the largest block.',
        'Site diesel for gensets and equipment is Scope 1; temporary site power connection is Scope 2.',
        'Material haulage invoices are Scope 3 Category 4.',
        'Debris and construction waste disposal records are Scope 3 Category 5.',
      ],
    },
    verification: {
      summary:
        'Embodied carbon is only as good as the quantity on the invoice.',
      points: [
        'Cement and steel lines require tonnage or bag count; a value-only line is held as a gap rather than converted through a spend proxy.',
        'Blended and low-clinker cement is treated as a distinct material only when the invoice identifies the grade — otherwise the ordinary grade is used and the assumption is recorded.',
        'Project boundary is declared explicitly so a single project\'s footprint is not mixed with company-level totals.',
      ],
    },
    supplyChain: {
      summary:
        'Developers and contractors are increasingly asked for embodied carbon by tenants, funds and green-building assessors.',
      points: [
        'A verified material-level record answers the embodied-carbon question with evidence instead of a generic materials database.',
        'Subcontractors registered under their own tax identifier can be linked so their emissions land in the main contractor\'s Scope 3 rather than disappearing.',
        'Commercial rates stay private; the shared view is quantities converted to emissions with their factors.',
      ],
    },
    monetization: {
      summary:
        'In real estate the evidence supports asset-level finance and certification work rather than credit sales.',
      points: [
        'Green building certification and green-bond-linked lending both require material-level substantiation; verified records are directly usable as that substantiation.',
        'Low-carbon material substitution becomes a defensible claim once the baseline material mix is evidenced.',
        'The platform does not represent building-level efficiency as a saleable carbon credit.',
      ],
    },
    references: [
      'GHG Protocol Scope 3 Standard, Categories 1, 4 and 5',
      'HSN codes for cement, steel and construction materials',
      'IEA electricity grid emission factors (2023 edition)',
    ],
  },

  automobile: {
    problem:
      'OEMs push carbon requirements down the tier chain faster than tier-2 and tier-3 suppliers can build any accounting capability, and the tier-3 layer is where the data goes dark.',
    visibility: {
      summary:
        'For a component maker the footprint is mostly bought-in material plus plant energy.',
      points: [
        'Steel, aluminium, polymer and casting invoices carry quantity and HSN code — Scope 3 Category 1.',
        'Plant electricity bills for presses, assembly and compressed air — Scope 2 at the regional grid factor.',
        'Paint shop and heat-treatment fuel invoices — Scope 1.',
        'Inbound and outbound freight — Scope 3 Category 4; part dispatch notes give the unit denominator.',
      ],
    },
    verification: {
      summary:
        'A per-part figure requires a part count, and the platform will not synthesise one.',
      points: [
        'Emissions per component are produced only when dispatch quantity is evidenced; otherwise the plant total is reported and the per-part figure is declared a gap.',
        'Purchased components from a sub-supplier are marked as unverified upstream data unless that supplier has its own verified record.',
        'Every conversion carries its factor and source so an OEM audit can reproduce it.',
      ],
    },
    supplyChain: {
      summary:
        'This is the sector where the tier chain, not the single company, is the unit of measurement.',
      points: [
        'A tier-2 supplier with a verified record links to its tier-1 by tax identifier, and the tier-1 to the OEM, so Category 1 stops being an industry average at each hop.',
        'The OEM sees scope totals, confidence and evidence hashes — never the supplier\'s cost base.',
        'Where a sub-supplier is unverified, that portion is shown as a declared gap rather than filled with a proxy, which is what makes the number auditable.',
      ],
    },
    monetization: {
      summary:
        'Supplier qualification is the immediate return; financing follows the evidence.',
      points: [
        'Verified carbon data is becoming a line item in OEM supplier scorecards alongside quality and delivery — an unquantified supplier loses points before commercial talks.',
        'Renewable PPA and efficiency retrofit invoices give a lender the KPI evidence for sustainability-linked terms.',
        'Plant-level reductions are disclosure evidence; credit eligibility is a separate, methodology-bound question and is labelled as such.',
      ],
    },
    references: [
      'GHG Protocol Scope 3 Standard, Categories 1 and 4',
      'HSN codes for automotive components and raw materials',
      'IEA electricity grid emission factors (2023 edition)',
    ],
  },
};
