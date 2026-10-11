// Industry landing pages rendered at /industries/:industry.
// The build-time SEO registry (src/lib/seo/routeRegistry.ts) reads this list,
// so adding an industry here automatically adds its prerendered page and sitemap entry.
import { Factory, Truck, Building2, Car, Shirt, FlaskConical, HardHat } from 'lucide-react';

export interface IndustryData {
  id: string;
  name: string;
  icon: typeof Factory;
  tagline: string;
  description: string;
  scope1Sources: string[];
  scope2Sources: string[];
  scope3Sources: string[];
  reductionStrategies: string[];
  keywords: string[];
}

export const industries: IndustryData[] = [
  {
    id: 'textile',
    name: 'Textile Manufacturing',
    icon: Shirt,
    tagline: 'Sustainable Fashion Starts with Data',
    description: 'Textiles are not covered by EU CBAM, but EU brands reporting under CSRD now ask suppliers for facility emissions. Fuel and electricity bills are enough to answer most requests.',
    scope1Sources: [
      'Diesel generators and boilers',
      'On-site fuel combustion for dyeing',
      'Company-owned transportation',
      'Fugitive emissions from chemicals'
    ],
    scope2Sources: [
      'Electricity for spinning mills',
      'Power for weaving looms',
      'Cooling and heating systems',
      'Lighting and machinery'
    ],
    scope3Sources: [
      'Raw cotton and fiber procurement',
      'Chemical dyes and auxiliaries',
      'Packaging materials',
      'Freight and logistics',
      'Employee commuting',
      'Waste treatment'
    ],
    reductionStrategies: [
      'Solar rooftop installations (40-60% electricity reduction)',
      'Energy-efficient motors and VFDs',
      'Water recycling in dyeing processes',
      'Sustainable fiber sourcing',
      'LED lighting retrofits'
    ],
    keywords: ['textile carbon footprint', 'garment emissions', 'sustainable fashion', 'tirupur exports', 'EU CBAM textile']
  },
  {
    id: 'chemical',
    name: 'Chemical Industry',
    icon: FlaskConical,
    tagline: 'Precision Chemistry, Precise Emissions',
    description: 'Chemical manufacturing is energy-intensive with complex process emissions. Accurate MRV is critical for compliance and green financing.',
    scope1Sources: [
      'Process emissions from reactions',
      'On-site fuel combustion',
      'Flaring and venting',
      'Fugitive emissions from storage'
    ],
    scope2Sources: [
      'Electricity for reactors and pumps',
      'Steam generation',
      'Cooling systems',
      'Laboratory equipment'
    ],
    scope3Sources: [
      'Raw material procurement',
      'Catalyst and auxiliary chemicals',
      'Packaging and containers',
      'Product distribution',
      'Waste disposal and treatment'
    ],
    reductionStrategies: [
      'Process optimization and catalyst efficiency',
      'Heat recovery systems',
      'Green chemistry alternatives',
      'Renewable energy procurement',
      'Closed-loop cooling systems'
    ],
    keywords: ['chemical industry emissions', 'process emissions', 'green chemistry', 'chemical manufacturing carbon']
  },
  {
    id: 'steel',
    name: 'Steel Production',
    icon: HardHat,
    tagline: 'Green Steel for a Net-Zero Future',
    description: 'Steel is one of the hardest-to-abate sectors. Early movers on carbon accounting will access premium markets and green financing.',
    scope1Sources: [
      'Blast furnace operations',
      'Coal and coke combustion',
      'Direct reduction processes',
      'On-site transport and handling'
    ],
    scope2Sources: [
      'Electric arc furnaces',
      'Rolling mill electricity',
      'Compressed air systems',
      'Material handling equipment'
    ],
    scope3Sources: [
      'Iron ore and coal procurement',
      'Limestone and fluxes',
      'Scrap metal sourcing',
      'Product transportation',
      'End-of-life recycling'
    ],
    reductionStrategies: [
      'Electric arc furnace transition',
      'Hydrogen-based direct reduction',
      'Scrap utilization optimization',
      'Energy efficiency in rolling mills',
      'Carbon capture readiness'
    ],
    keywords: ['green steel', 'steel emissions', 'blast furnace carbon', 'electric arc furnace', 'steel decarbonization']
  },
  {
    id: 'logistics',
    name: 'Logistics & Transportation',
    icon: Truck,
    tagline: 'Move Goods, Not Carbon',
    description: 'Fleet emissions are highly trackable through fuel invoices. Logistics companies can unlock significant savings through route optimization and fleet electrification.',
    scope1Sources: [
      'Diesel/petrol vehicle fleet',
      'CNG and LPG vehicles',
      'Refrigeration units',
      'Warehouse generators'
    ],
    scope2Sources: [
      'Warehouse electricity',
      'Electric vehicle charging',
      'Office and facility power',
      'Cold storage systems'
    ],
    scope3Sources: [
      'Third-party carriers',
      'Packaging materials',
      'Vehicle maintenance',
      'Employee commuting',
      'Business travel'
    ],
    reductionStrategies: [
      'Route optimization algorithms',
      'Fleet electrification roadmap',
      'Driver training for fuel efficiency',
      'Load optimization',
      'Solar-powered warehouses'
    ],
    keywords: ['logistics emissions', 'fleet carbon', 'transportation sustainability', 'green logistics', 'supply chain emissions']
  },
  {
    id: 'construction',
    name: 'Construction & Real Estate',
    icon: Building2,
    tagline: 'Build Green, Build Value',
    description: 'Embodied carbon in construction is receiving increased scrutiny. Green building certifications drive premium valuations and tenant demand.',
    scope1Sources: [
      'On-site diesel equipment',
      'Construction vehicles',
      'Generator usage',
      'Concrete production'
    ],
    scope2Sources: [
      'Site electricity consumption',
      'Tower crane operations',
      'Temporary facilities',
      'Lighting and ventilation'
    ],
    scope3Sources: [
      'Cement and concrete',
      'Steel and aluminum',
      'Glass and ceramics',
      'Material transportation',
      'Waste disposal'
    ],
    reductionStrategies: [
      'Low-carbon cement alternatives',
      'Prefabricated components',
      'Material efficiency design',
      'Renewable energy on-site',
      'Waste reduction and recycling'
    ],
    keywords: ['embodied carbon', 'construction emissions', 'green building', 'sustainable construction', 'real estate sustainability']
  },
  {
    id: 'automobile',
    name: 'Automobile Manufacturing',
    icon: Car,
    tagline: 'Drive the Transition',
    description: 'Auto manufacturers face pressure from both regulation and OEMs demanding supply chain transparency. Early carbon accounting creates competitive advantage.',
    scope1Sources: [
      'Paint shop operations',
      'On-site fuel combustion',
      'Welding and fabrication',
      'Testing and quality control'
    ],
    scope2Sources: [
      'Assembly line electricity',
      'HVAC systems',
      'Paint booth ventilation',
      'Compressed air'
    ],
    scope3Sources: [
      'Component procurement',
      'Raw materials (steel, aluminum, plastics)',
      'Tier 2/3 supplier emissions',
      'Vehicle logistics',
      'End-of-life vehicle recycling'
    ],
    reductionStrategies: [
      'Renewable energy PPAs',
      'Energy-efficient paint processes',
      'Supplier engagement programs',
      'Lightweighting initiatives',
      'Closed-loop material systems'
    ],
    keywords: ['automotive emissions', 'car manufacturing carbon', 'auto supply chain', 'EV transition', 'automotive sustainability']
  }
];

// CBAM-exposed industry IDs
export const cbamExposedSectors = ['steel', 'chemical'];

export const getIndustryById = (id: string): IndustryData | undefined =>
  industries.find(i => i.id === id);
