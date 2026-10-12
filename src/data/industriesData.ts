// Industry pages rendered at /industries/:industry.
// The build-time SEO registry (src/lib/seo/routeRegistry.ts) reads this list,
// so adding an industry here adds its prerendered page and sitemap entry.
//
// Content rules: no company names, no claimed savings or reduction
// percentages, no invented case studies. Worked examples use illustrative
// quantities with the same emission factors as the extraction pipeline.
// CBAM coverage follows Regulation (EU) 2023/956 Annex I: cement, iron and
// steel, aluminium, fertilisers, hydrogen and electricity.

export type ExampleFactor = 'GRID' | 'DIESEL' | 'PNG' | 'LPG' | 'COAL' | 'FURNACE_OIL';

export interface ExampleInput { label: string; unit: string; factor: ExampleFactor; qty: number; max: number }

export interface IndustryData {
  id: string;
  name: string;
  /** Label for the sector switcher. */
  short: string;
  tagline: string;
  description: string;
  /** Directly covered by EU CBAM. */
  cbam: boolean;
  /** The request that brings this sector's businesses to Senseible. */
  buyer: { who: string; question: string };
  scope1Sources: string[];
  scope2Sources: string[];
  scope3Sources: string[];
  reductionStrategies: string[];
  /** Monthly quantities for the worked example (illustrative, adjustable). */
  example: ExampleInput[];
  /** What the worked example leaves out, stated plainly. */
  exampleNote: string;
  keywords: string[];
}

export const industries: IndustryData[] = [
  {
    id: 'steel', name: 'Steel Production', short: 'Steel', cbam: true,
    tagline: 'Show actual emissions per tonne, not the EU default',
    description: 'Iron and steel are covered by EU CBAM. EU importers declare embedded emissions per tonne; without a producer’s actual data, default values apply and the cost rises.',
    buyer: { who: 'EU importer', question: 'What are the embedded emissions per tonne of the steel you ship to us?' },
    scope1Sources: ['Coal and coke in furnaces', 'Reheating furnace fuel', 'Direct reduction processes', 'On-site transport and handling'],
    scope2Sources: ['Electric arc and induction furnaces', 'Rolling mill drives', 'Compressed air', 'Material handling'],
    scope3Sources: ['Iron ore, pellets and sponge iron', 'Scrap purchases', 'Limestone and fluxes', 'Freight to port'],
    reductionStrategies: ['Higher scrap share in the charge', 'Furnace and reheating efficiency', 'Renewable electricity for arc and induction furnaces', 'Waste heat recovery', 'Hydrogen-based direct reduction (long term)'],
    example: [
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 400000, max: 2000000 },
      { label: 'Coal', unit: 'kg', factor: 'COAL', qty: 60000, max: 500000 },
      { label: 'Furnace oil', unit: 'litre', factor: 'FURNACE_OIL', qty: 8000, max: 100000 },
    ],
    exampleNote: 'Energy only. CBAM embedded emissions per tonne also need production quantities and, for some routes, precursor and process emissions.',
    keywords: ['steel carbon footprint', 'CBAM steel India', 'embedded emissions per tonne', 'steel exporter CBAM', 'green steel'],
  },
  {
    id: 'aluminium', name: 'Aluminium', short: 'Aluminium', cbam: true,
    tagline: 'Electricity decides most of the number',
    description: 'Aluminium is covered by EU CBAM. For extrusion, casting and remelting units, the power bill and the source of the metal (primary or scrap) drive the embedded emissions buyers ask for.',
    buyer: { who: 'EU importer', question: 'Can you give us actual embedded emissions for these extrusions, and how much is recycled metal?' },
    scope1Sources: ['Melting and holding furnace fuel', 'Homogenising and ageing ovens', 'Anode consumption in smelting', 'Forklifts and on-site vehicles'],
    scope2Sources: ['Electrolysis (smelters)', 'Extrusion presses', 'Induction heating', 'Compressed air and cooling'],
    scope3Sources: ['Primary ingot and billet purchases', 'Scrap purchases', 'Alloying elements', 'Inbound and outbound freight'],
    reductionStrategies: ['Higher recycled content', 'Renewable electricity supply', 'Furnace burner and insulation upgrades', 'Press and die efficiency', 'Billet heating with recovered heat'],
    example: [
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 250000, max: 1500000 },
      { label: 'Piped natural gas', unit: 'scm', factor: 'PNG', qty: 30000, max: 300000 },
      { label: 'Diesel', unit: 'litre', factor: 'DIESEL', qty: 2000, max: 30000 },
    ],
    exampleNote: 'Energy only. The emissions embedded in purchased primary metal, often the largest share, come from the metal supplier’s data.',
    keywords: ['aluminium carbon footprint', 'CBAM aluminium', 'aluminium extrusion emissions', 'recycled aluminium carbon'],
  },
  {
    id: 'cement', name: 'Cement and Clinker', short: 'Cement', cbam: true,
    tagline: 'Process emissions you cannot see on a fuel bill',
    description: 'Cement is covered by EU CBAM. Most cement emissions come from calcining limestone into clinker, so clinker ratio and kiln fuel matter more than anything else.',
    buyer: { who: 'EU importer or project developer', question: 'What is the embedded carbon per tonne of this cement, and what is its clinker content?' },
    scope1Sources: ['Clinker calcination (process CO₂)', 'Kiln fuel: coal, petcoke, alternative fuels', 'Captive power plant fuel', 'Mining and on-site vehicles'],
    scope2Sources: ['Raw and cement mills', 'Kiln drives and fans', 'Crushers and conveyors', 'Packing plant'],
    scope3Sources: ['Purchased clinker', 'Fly ash, slag and gypsum', 'Inbound fuel freight', 'Outbound distribution'],
    reductionStrategies: ['Blended cements with fly ash or slag', 'Waste heat recovery power', 'Alternative fuels in the kiln', 'Efficient grinding', 'Lower clinker factor'],
    example: [
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 600000, max: 3000000 },
      { label: 'Coal', unit: 'kg', factor: 'COAL', qty: 900000, max: 5000000 },
      { label: 'Diesel', unit: 'litre', factor: 'DIESEL', qty: 10000, max: 100000 },
    ],
    exampleNote: 'Energy only. Calcination CO₂, usually the largest source, depends on clinker produced and is not in this example.',
    keywords: ['cement carbon footprint', 'CBAM cement', 'clinker emissions', 'cement exporter carbon'],
  },
  {
    id: 'fertiliser', name: 'Fertilisers', short: 'Fertilisers', cbam: true,
    tagline: 'Gas, ammonia and nitrous oxide',
    description: 'Fertilisers are covered by EU CBAM. Natural gas used as feedstock and fuel, and nitrous oxide from nitric acid production, dominate the embedded emissions.',
    buyer: { who: 'EU importer', question: 'What are the embedded emissions per tonne of this fertiliser, including nitrous oxide?' },
    scope1Sources: ['Natural gas as ammonia feedstock', 'Reformer and boiler fuel', 'Nitrous oxide from nitric acid', 'On-site vehicles'],
    scope2Sources: ['Compressors', 'Granulation and drying', 'Pumps and cooling water', 'Bagging lines'],
    scope3Sources: ['Purchased ammonia', 'Phosphate rock and potash', 'Sulphur and acids', 'Freight and port handling'],
    reductionStrategies: ['Nitrous oxide abatement catalysts', 'Reformer and steam system efficiency', 'Low-carbon ammonia sourcing', 'Renewable electricity for utilities'],
    example: [
      { label: 'Piped natural gas', unit: 'scm', factor: 'PNG', qty: 200000, max: 2000000 },
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 300000, max: 2000000 },
      { label: 'Diesel', unit: 'litre', factor: 'DIESEL', qty: 3000, max: 50000 },
    ],
    exampleNote: 'Energy only. Nitrous oxide and feedstock emissions need production data and are not in this example.',
    keywords: ['fertiliser carbon footprint', 'CBAM fertiliser', 'ammonia emissions', 'urea carbon'],
  },
  {
    id: 'textile', name: 'Textile Manufacturing', short: 'Textile', cbam: false,
    tagline: 'Your bills already hold the answer',
    description: 'Textiles are not covered by EU CBAM, but global apparel brands ask suppliers for factory energy and emissions for their own Scope 3. Fuel and electricity bills answer most requests.',
    buyer: { who: 'Apparel brand', question: 'Please share your factory’s energy use and emissions for last year.' },
    scope1Sources: ['Boilers for dyeing and processing', 'Diesel generators', 'Thermic fluid heaters', 'Company vehicles'],
    scope2Sources: ['Spinning and weaving machines', 'Dyeing and finishing lines', 'Humidification and cooling', 'Compressed air'],
    scope3Sources: ['Fibre and yarn purchases', 'Dyes and chemicals', 'Job-work processing', 'Freight to port'],
    reductionStrategies: ['Rooftop solar', 'Efficient motors and variable speed drives', 'Boiler fuel switch and heat recovery', 'Water recycling in dyeing', 'Preferred fibre sourcing'],
    example: [
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 50000, max: 500000 },
      { label: 'Coal for boiler', unit: 'kg', factor: 'COAL', qty: 15000, max: 150000 },
      { label: 'Diesel for generator', unit: 'litre', factor: 'DIESEL', qty: 1500, max: 20000 },
    ],
    exampleNote: 'Scope 1 and 2 only. Fibre and chemical purchases (Scope 3) come from purchase invoices.',
    keywords: ['textile carbon footprint', 'garment factory emissions', 'apparel supplier emissions', 'tirupur exports carbon'],
  },
  {
    id: 'chemical', name: 'Chemicals', short: 'Chemicals', cbam: false,
    tagline: 'Steam, solvents and process emissions',
    description: 'Most chemicals are not covered by EU CBAM (fertilisers and hydrogen are). Customers and listed buyers still ask for site emissions, and process emissions need careful separation from fuel.',
    buyer: { who: 'Multinational customer', question: 'Can you report Scope 1 and 2 for the site that makes our product?' },
    scope1Sources: ['Boiler and thermic fluid fuel', 'Process emissions from reactions', 'Flaring and venting', 'Fugitive emissions from storage'],
    scope2Sources: ['Reactors, pumps and agitators', 'Chillers and cooling towers', 'Vacuum and compressed air', 'Effluent treatment'],
    scope3Sources: ['Raw material and solvent purchases', 'Catalysts and auxiliaries', 'Drums and packaging', 'Waste disposal'],
    reductionStrategies: ['Heat integration and recovery', 'Solvent recovery', 'Boiler fuel switch', 'Renewable electricity', 'Leak detection and repair'],
    example: [
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 120000, max: 1000000 },
      { label: 'Furnace oil', unit: 'litre', factor: 'FURNACE_OIL', qty: 6000, max: 80000 },
      { label: 'Piped natural gas', unit: 'scm', factor: 'PNG', qty: 15000, max: 200000 },
    ],
    exampleNote: 'Combustion and electricity only. Process and fugitive emissions are calculated separately.',
    keywords: ['chemical industry emissions', 'chemical plant carbon footprint', 'process emissions', 'specialty chemicals Scope 3'],
  },
  {
    id: 'ceramics', name: 'Ceramics and Tiles', short: 'Ceramics', cbam: false,
    tagline: 'Kilns and dryers set the footprint',
    description: 'Tiles and sanitaryware are not covered by EU CBAM. Kiln and spray-dryer fuel make up most of a ceramics unit’s emissions, and export buyers ask for a footprint per square metre.',
    buyer: { who: 'Importer or project specifier', question: 'What is the carbon footprint per square metre of these tiles?' },
    scope1Sources: ['Kiln fuel', 'Spray dryer fuel', 'Coal gasifiers', 'On-site vehicles'],
    scope2Sources: ['Ball mills', 'Hydraulic presses', 'Glazing lines', 'Polishing'],
    scope3Sources: ['Clay and feldspar', 'Glazes and frits', 'Packaging', 'Freight to port'],
    reductionStrategies: ['Kiln heat recovery to dryers', 'Fuel switch from coal gasifiers', 'Efficient presses and mills', 'Rooftop solar'],
    example: [
      { label: 'Piped natural gas', unit: 'scm', factor: 'PNG', qty: 80000, max: 800000 },
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 100000, max: 1000000 },
      { label: 'Diesel', unit: 'litre', factor: 'DIESEL', qty: 1000, max: 20000 },
    ],
    exampleNote: 'Energy only. A per-square-metre footprint also needs production volume and purchased materials.',
    keywords: ['ceramic tile carbon footprint', 'morbi ceramics emissions', 'tile export carbon'],
  },
  {
    id: 'paper', name: 'Paper and Packaging', short: 'Paper', cbam: false,
    tagline: 'Boilers, pulp and the packaging question',
    description: 'Paper and board are not covered by EU CBAM. Brands buying packaging ask for emissions per tonne, and boiler fuel and pulp source decide most of the answer.',
    buyer: { who: 'Brand buying packaging', question: 'What are the emissions per tonne of the board you supply us?' },
    scope1Sources: ['Boiler fuel: coal, biomass, gas', 'Lime kiln', 'Captive power', 'On-site vehicles'],
    scope2Sources: ['Pulpers and refiners', 'Paper machine drives', 'Vacuum systems', 'Converting lines'],
    scope3Sources: ['Pulp and waste paper', 'Starch and chemicals', 'Inks and adhesives', 'Freight'],
    reductionStrategies: ['Higher recycled fibre', 'Biomass or gas boilers', 'Heat recovery from dryers', 'Efficient vacuum and drives'],
    example: [
      { label: 'Coal for boiler', unit: 'kg', factor: 'COAL', qty: 200000, max: 2000000 },
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 300000, max: 2000000 },
      { label: 'Diesel', unit: 'litre', factor: 'DIESEL', qty: 2000, max: 30000 },
    ],
    exampleNote: 'Energy only. Biogenic CO₂ from biomass is reported as zero and never credited.',
    keywords: ['paper mill emissions', 'packaging carbon footprint', 'corrugated board carbon'],
  },
  {
    id: 'food-processing', name: 'Food Processing', short: 'Food', cbam: false,
    tagline: 'Boilers, cold rooms and refrigerants',
    description: 'Food processing is not covered by EU CBAM. Retail and FMCG customers ask suppliers for emissions, and boilers, cold storage and refrigerant top-ups are the main sources on site.',
    buyer: { who: 'Retail or FMCG customer', question: 'Please report your site emissions for our supplier programme.' },
    scope1Sources: ['Boiler fuel', 'Diesel generators', 'Refrigerant top-ups', 'Delivery vehicles'],
    scope2Sources: ['Cold rooms and freezers', 'Processing and packing lines', 'Compressors', 'Lighting'],
    scope3Sources: ['Raw produce and milk', 'Packaging', 'Third-party transport', 'Waste'],
    reductionStrategies: ['Refrigerant leak checks', 'Heat recovery from compressors', 'Boiler fuel switch', 'Rooftop solar for cold storage'],
    example: [
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 60000, max: 600000 },
      { label: 'LPG for boiler', unit: 'kg', factor: 'LPG', qty: 4000, max: 50000 },
      { label: 'Diesel', unit: 'litre', factor: 'DIESEL', qty: 2500, max: 30000 },
    ],
    exampleNote: 'Combustion and electricity only. Refrigerant leaks and farm inputs are calculated separately.',
    keywords: ['food processing emissions', 'dairy plant carbon footprint', 'cold storage emissions'],
  },
  {
    id: 'logistics', name: 'Logistics and Transport', short: 'Logistics', cbam: false,
    tagline: 'Fuel invoices are the evidence',
    description: 'Fleet emissions are traceable through fuel invoices. Shippers ask carriers for emissions by lane or consignment for their Scope 3 Category 4.',
    buyer: { who: 'Shipper', question: 'What are the emissions for the consignments you moved for us this quarter?' },
    scope1Sources: ['Diesel trucks', 'CNG and LPG vehicles', 'Reefer units', 'Warehouse generators'],
    scope2Sources: ['Warehouse electricity', 'EV charging', 'Cold storage', 'Offices'],
    scope3Sources: ['Subcontracted carriers', 'Vehicle maintenance', 'Packaging', 'Business travel'],
    reductionStrategies: ['Load and route planning', 'Driver training', 'Fleet electrification where routes allow', 'Solar for warehouses'],
    example: [
      { label: 'Diesel', unit: 'litre', factor: 'DIESEL', qty: 30000, max: 300000 },
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 15000, max: 200000 },
      { label: 'LPG', unit: 'kg', factor: 'LPG', qty: 500, max: 10000 },
    ],
    exampleNote: 'Fuel-based. Per-consignment figures also need distance and weight for each shipment.',
    keywords: ['logistics emissions', 'fleet carbon footprint', 'freight emissions per consignment', 'Scope 3 category 4'],
  },
  {
    id: 'construction', name: 'Construction and Real Estate', short: 'Construction', cbam: false,
    tagline: 'Embodied carbon is in the materials',
    description: 'On-site fuel is small next to the embodied carbon in cement and steel. Developers and lenders increasingly ask for both.',
    buyer: { who: 'Developer or lender', question: 'What are the site emissions and the embodied carbon of materials on this project?' },
    scope1Sources: ['Diesel for site equipment', 'Construction vehicles', 'Generators', 'Site batching plant fuel'],
    scope2Sources: ['Site electricity', 'Tower cranes', 'Site offices', 'Lighting'],
    scope3Sources: ['Cement and concrete', 'Steel and aluminium', 'Glass and tiles', 'Material transport'],
    reductionStrategies: ['Blended cement and lower-carbon concrete', 'Grid power instead of generators', 'Prefabrication', 'Material efficiency in design'],
    example: [
      { label: 'Diesel for equipment', unit: 'litre', factor: 'DIESEL', qty: 12000, max: 150000 },
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 20000, max: 300000 },
      { label: 'LPG', unit: 'kg', factor: 'LPG', qty: 300, max: 5000 },
    ],
    exampleNote: 'Site energy only. Embodied carbon of materials comes from purchase quantities and material factors.',
    keywords: ['construction emissions', 'embodied carbon', 'site emissions', 'green building carbon'],
  },
  {
    id: 'automobile', name: 'Automotive Components', short: 'Auto parts', cbam: false,
    tagline: 'OEMs are asking their tier suppliers',
    description: 'Vehicle makers ask component suppliers for emissions to report their own supply chain. Casting, forging, paint shops and purchased steel and aluminium drive the number.',
    buyer: { who: 'Vehicle maker (OEM)', question: 'Please submit your plant’s Scope 1 and 2 and a footprint for the parts you supply.' },
    scope1Sources: ['Forging and heat-treatment furnaces', 'Paint shop ovens', 'Generators', 'On-site vehicles'],
    scope2Sources: ['Machining centres', 'Assembly lines', 'Compressed air', 'Paint booth ventilation'],
    scope3Sources: ['Steel and aluminium', 'Castings and forgings bought in', 'Plastics and rubber', 'Freight to OEM'],
    reductionStrategies: ['Renewable electricity', 'Furnace efficiency and heat recovery', 'Compressed air leak repair', 'Supplier engagement on steel and aluminium'],
    example: [
      { label: 'Grid electricity', unit: 'kWh', factor: 'GRID', qty: 150000, max: 1000000 },
      { label: 'Piped natural gas', unit: 'scm', factor: 'PNG', qty: 20000, max: 200000 },
      { label: 'Diesel', unit: 'litre', factor: 'DIESEL', qty: 2000, max: 30000 },
    ],
    exampleNote: 'Plant energy only. A part footprint also needs purchased material weights.',
    keywords: ['auto component emissions', 'automotive supplier carbon', 'tier 2 supplier Scope 3', 'OEM supplier emissions'],
  },
];

/** Sectors directly covered by EU CBAM. */
export const cbamExposedSectors = industries.filter(i => i.cbam).map(i => i.id);

export const getIndustryById = (id: string): IndustryData | undefined =>
  industries.find(i => i.id === id);
