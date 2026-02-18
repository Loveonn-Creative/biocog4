import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= DOCUMENT HASH GENERATION (DETERMINISTIC) =============
async function generateDocumentHash(content: string, mimeType: string): Promise<string> {
  // Use first 10KB of content for faster hashing while maintaining uniqueness
  const hashInput = content.substring(0, 10000) + mimeType;
  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============= METHODOLOGY VERSION (APPEND-ONLY VERSIONING) =============
const METHODOLOGY_VERSION = {
  name: 'BIOCOG_MVR_INDIA',
  version: 'v1.0.2', // Updated: Fixed scope assignment, deterministic caching
  country: 'IN',
  factorVersion: 'IND_EF_2025',
  confidenceVersion: 'CONF_v1.0',
};

// ============= HSN CODE MASTER (RULE-BASED - NO AI) =============
const HSN_MASTER: Record<string, { productCategory: string; industryCode: string; industryName: string; defaultScope: number }> = {
  // Fuel & Energy: Scope 1/2
  '27': { productCategory: 'FUEL', industryCode: 'ENERGY', industryName: 'Mineral Fuels & Oils', defaultScope: 1 },
  '10': { productCategory: 'BIOMASS', industryCode: 'AGRI', industryName: 'Agricultural Biomass', defaultScope: 1 },
  '12': { productCategory: 'BIOMASS', industryCode: 'AGRI', industryName: 'Oil Seeds & Biomass', defaultScope: 1 },
  // Metals & Minerals: Scope 3
  '72': { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', industryName: 'Iron & Steel', defaultScope: 3 },
  '73': { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL_PRODUCTS', industryName: 'Steel Articles', defaultScope: 3 },
  '74': { productCategory: 'RAW_MATERIAL', industryCode: 'COPPER', industryName: 'Copper', defaultScope: 3 },
  '76': { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', industryName: 'Aluminium', defaultScope: 3 },
  '25': { productCategory: 'RAW_MATERIAL', industryCode: 'CEMENT', industryName: 'Cement & Minerals', defaultScope: 3 },
  // Plastics, Chemicals
  '39': { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', industryName: 'Plastics & Polymers', defaultScope: 3 },
  '28': { productCategory: 'CHEMICALS', industryCode: 'CHEMICALS', industryName: 'Inorganic Chemicals', defaultScope: 3 },
  '29': { productCategory: 'CHEMICALS', industryCode: 'CHEMICALS', industryName: 'Organic Chemicals', defaultScope: 3 },
  '40': { productCategory: 'RAW_MATERIAL', industryCode: 'RUBBER', industryName: 'Rubber & Elastomers', defaultScope: 3 },
  // Paper, Textiles, Wood
  '48': { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', industryName: 'Paper & Pulp', defaultScope: 3 },
  '44': { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', industryName: 'Wood & Timber', defaultScope: 3 },
  '52': { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', industryName: 'Cotton Textiles', defaultScope: 3 },
  '54': { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', industryName: 'Synthetic Textiles', defaultScope: 3 },
  // Machinery, Electricals
  '84': { productCategory: 'CAPITAL_GOODS', industryCode: 'MACHINERY', industryName: 'Industrial Machinery', defaultScope: 3 },
  '85': { productCategory: 'ELECTRICAL_EQUIPMENT', industryCode: 'ELECTRICAL', industryName: 'Electrical Equipment', defaultScope: 3 },
  '90': { productCategory: 'INSTRUMENTS', industryCode: 'INSTRUMENTATION', industryName: 'Measuring Instruments', defaultScope: 3 },
  // Transport
  '86': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'RAILWAYS', industryName: 'Railway Equipment', defaultScope: 3 },
  '87': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'AUTOMOTIVE', industryName: 'Vehicles & Transport', defaultScope: 3 },
  '88': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'AVIATION', industryName: 'Aircraft & Parts', defaultScope: 3 },
  '89': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'MARINE', industryName: 'Ships & Boats', defaultScope: 3 },
  // Services
  '99': { productCategory: 'SERVICES', industryCode: 'PROFESSIONAL', industryName: 'Professional & Business Services', defaultScope: 3 },
  // Green HSN codes
  '8541': { productCategory: 'SOLAR_ENERGY', industryCode: 'GREEN_ENERGY', industryName: 'Solar Cells & PV Modules', defaultScope: 2 },
  '8711': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', industryName: 'Electric Motorcycles', defaultScope: 1 },
  '0602': { productCategory: 'FORESTATION', industryCode: 'GREEN_LAND', industryName: 'Live Plants & Saplings', defaultScope: 3 },
  '8501': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', industryName: 'Electric Motors', defaultScope: 1 },
};

// ============= EXPANDED KEYWORD FALLBACK MAP (RULE-BASED - NO AI) =============
// CRITICAL: Scope assignments per BIOCOG_MVR_INDIA_v1.0
// - Scope 1: Direct fuel combustion (diesel, petrol, LPG, coal, CNG, PNG)
// - Scope 2: Purchased electricity (ALWAYS scope 2, never scope 1)
// - Scope 3: Transport, materials, waste, services
const KEYWORD_MAP: Record<string, { productCategory: string; industryCode: string; scope: number; fuelType?: string }> = {
  // Fuels - Scope 1 (including common OCR misreads and regional terms)
  diesel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  deisel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  disel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  'd1esel': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  hsd: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  petrol: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  petro: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  petr0l: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  gasoline: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  ms: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  cng: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'CNG' },
  lpg: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'LPG' },
  'l.p.g': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'LPG' },
  coal: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'COAL' },
  furnace: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'FURNACE_OIL' },
  'furnace oil': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'FURNACE_OIL' },
  fo: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'FURNACE_OIL' },
  naphtha: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'NAPHTHA' },
  png: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PNG' },
  'piped gas': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PNG' },
  'natural gas': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PNG' },
  kerosene: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  tel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  fuel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  // Electricity - Scope 2 (ALWAYS SCOPE 2 per BIOCOG MRV spec)
  electricity: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  electy: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  elec: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'elec bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  power: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  kwh: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  kw: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'electric bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'power bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  bijli: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  vidyut: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  discom: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  msedcl: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  tpddl: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  bses: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  cesc: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  bescom: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  tneb: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  pspcl: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'punjab state power': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  unit: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  units: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  // Transport - Scope 3
  freight: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  transport: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  logistics: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  courier: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  shipping: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  delivery: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  trucking: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  lorry: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  carrier: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  dhl: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  fedex: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  bluedart: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  delhivery: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  // Raw Materials - Scope 3
  steel: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  iron: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  tmt: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  rebar: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  plastic: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  polymer: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  hdpe: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  ldpe: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  pvc: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  paper: { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', scope: 3 },
  cardboard: { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', scope: 3 },
  carton: { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', scope: 3 },
  cement: { productCategory: 'RAW_MATERIAL', industryCode: 'CEMENT', scope: 3 },
  concrete: { productCategory: 'RAW_MATERIAL', industryCode: 'CEMENT', scope: 3 },
  aluminium: { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', scope: 3 },
  aluminum: { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', scope: 3 },
  copper: { productCategory: 'RAW_MATERIAL', industryCode: 'COPPER', scope: 3 },
  textile: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  fabric: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  cotton: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  yarn: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  wood: { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', scope: 3 },
  timber: { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', scope: 3 },
  plywood: { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', scope: 3 },
  rubber: { productCategory: 'RAW_MATERIAL', industryCode: 'RUBBER', scope: 3 },
  glass: { productCategory: 'RAW_MATERIAL', industryCode: 'GLASS', scope: 3 },
  // Waste - Scope 3
  waste: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  disposal: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  recycling: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  scrap: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  garbage: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  kachra: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  // Green Categories - Solar
  solar: { productCategory: 'SOLAR_ENERGY', industryCode: 'GREEN_ENERGY', scope: 2 },
  'solar panel': { productCategory: 'SOLAR_ENERGY', industryCode: 'GREEN_ENERGY', scope: 2 },
  'pv module': { productCategory: 'SOLAR_ENERGY', industryCode: 'GREEN_ENERGY', scope: 2 },
  'photovoltaic': { productCategory: 'SOLAR_ENERGY', industryCode: 'GREEN_ENERGY', scope: 2 },
  'solar inverter': { productCategory: 'SOLAR_ENERGY', industryCode: 'GREEN_ENERGY', scope: 2 },
  // Green Categories - EV
  'electric vehicle': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', scope: 1 },
  'ev charging': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', scope: 1 },
  'ev battery': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', scope: 1 },
  'e-rickshaw': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', scope: 1 },
  'e-scooter': { productCategory: 'EV_TRANSPORT', industryCode: 'GREEN_TRANSPORT', scope: 1 },
  // Green Categories - Forestation
  forestation: { productCategory: 'FORESTATION', industryCode: 'GREEN_LAND', scope: 3 },
  sapling: { productCategory: 'FORESTATION', industryCode: 'GREEN_LAND', scope: 3 },
  plantation: { productCategory: 'FORESTATION', industryCode: 'GREEN_LAND', scope: 3 },
  'tree planting': { productCategory: 'FORESTATION', industryCode: 'GREEN_LAND', scope: 3 },
  afforestation: { productCategory: 'FORESTATION', industryCode: 'GREEN_LAND', scope: 3 },
  // Green Categories - Wind
  'wind turbine': { productCategory: 'WIND_ENERGY', industryCode: 'GREEN_ENERGY', scope: 2 },
  windmill: { productCategory: 'WIND_ENERGY', industryCode: 'GREEN_ENERGY', scope: 2 },
  'wind energy': { productCategory: 'WIND_ENERGY', industryCode: 'GREEN_ENERGY', scope: 2 },
  // Green Categories - Biogas
  biogas: { productCategory: 'BIOGAS', industryCode: 'GREEN_ENERGY', scope: 1 },
  biomethane: { productCategory: 'BIOGAS', industryCode: 'GREEN_ENERGY', scope: 1 },
  'bio-gas': { productCategory: 'BIOGAS', industryCode: 'GREEN_ENERGY', scope: 1 },
  // Green Categories - Organic
  organic: { productCategory: 'ORGANIC_INPUT', industryCode: 'GREEN_AGRI', scope: 3 },
  compost: { productCategory: 'ORGANIC_INPUT', industryCode: 'GREEN_AGRI', scope: 3 },
  'bio-fertilizer': { productCategory: 'ORGANIC_INPUT', industryCode: 'GREEN_AGRI', scope: 3 },
  vermicompost: { productCategory: 'ORGANIC_INPUT', industryCode: 'GREEN_AGRI', scope: 3 },
  // Green Categories - Energy Efficiency
  led: { productCategory: 'ENERGY_EFFICIENCY', industryCode: 'GREEN_TECH', scope: 2 },
  'energy efficient': { productCategory: 'ENERGY_EFFICIENCY', industryCode: 'GREEN_TECH', scope: 2 },
  bldc: { productCategory: 'ENERGY_EFFICIENCY', industryCode: 'GREEN_TECH', scope: 2 },
  'star rated': { productCategory: 'ENERGY_EFFICIENCY', industryCode: 'GREEN_TECH', scope: 2 },
  // Green Categories - Water Conservation
  rainwater: { productCategory: 'WATER_CONSERVATION', industryCode: 'GREEN_WATER', scope: 3 },
  'water recycling': { productCategory: 'WATER_CONSERVATION', industryCode: 'GREEN_WATER', scope: 3 },
  'rain harvesting': { productCategory: 'WATER_CONSERVATION', industryCode: 'GREEN_WATER', scope: 3 },
  // Green Categories - Recycled Material
  'recycled material': { productCategory: 'RECYCLED_MATERIAL', industryCode: 'GREEN_MATERIAL', scope: 3 },
  'r-pet': { productCategory: 'RECYCLED_MATERIAL', industryCode: 'GREEN_MATERIAL', scope: 3 },
  'recycled plastic': { productCategory: 'RECYCLED_MATERIAL', industryCode: 'GREEN_MATERIAL', scope: 3 },
  'recycled paper': { productCategory: 'RECYCLED_MATERIAL', industryCode: 'GREEN_MATERIAL', scope: 3 },
  // Cloud & Data Centers - Scope 3 (Purchased Services)
  aws: { productCategory: 'CLOUD_SERVICES', industryCode: 'CLOUD', scope: 3 },
  'amazon web services': { productCategory: 'CLOUD_SERVICES', industryCode: 'CLOUD', scope: 3 },
  azure: { productCategory: 'CLOUD_SERVICES', industryCode: 'CLOUD', scope: 3 },
  gcp: { productCategory: 'CLOUD_SERVICES', industryCode: 'CLOUD', scope: 3 },
  'google cloud': { productCategory: 'CLOUD_SERVICES', industryCode: 'CLOUD', scope: 3 },
  cloud: { productCategory: 'CLOUD_SERVICES', industryCode: 'CLOUD', scope: 3 },
  'data center': { productCategory: 'CLOUD_SERVICES', industryCode: 'CLOUD', scope: 3 },
  compute: { productCategory: 'CLOUD_SERVICES', industryCode: 'CLOUD', scope: 3 },
  // Software & SaaS - Scope 3
  'software license': { productCategory: 'SOFTWARE', industryCode: 'SOFTWARE', scope: 3 },
  saas: { productCategory: 'SOFTWARE', industryCode: 'SOFTWARE', scope: 3 },
  subscription: { productCategory: 'SOFTWARE', industryCode: 'SOFTWARE', scope: 3 },
  'platform fee': { productCategory: 'SOFTWARE', industryCode: 'SOFTWARE', scope: 3 },
  // IT Hardware (Capital Goods) - Scope 3
  laptop: { productCategory: 'IT_HARDWARE', industryCode: 'IT_EQUIPMENT', scope: 3 },
  server: { productCategory: 'IT_HARDWARE', industryCode: 'IT_EQUIPMENT', scope: 3 },
  networking: { productCategory: 'IT_HARDWARE', industryCode: 'IT_EQUIPMENT', scope: 3 },
  router: { productCategory: 'IT_HARDWARE', industryCode: 'IT_EQUIPMENT', scope: 3 },
  switch: { productCategory: 'IT_HARDWARE', industryCode: 'IT_EQUIPMENT', scope: 3 },
  // Professional Services - Scope 3
  consulting: { productCategory: 'PROFESSIONAL_SERVICES', industryCode: 'PROFESSIONAL', scope: 3 },
  legal: { productCategory: 'PROFESSIONAL_SERVICES', industryCode: 'PROFESSIONAL', scope: 3 },
  audit: { productCategory: 'PROFESSIONAL_SERVICES', industryCode: 'PROFESSIONAL', scope: 3 },
  advisory: { productCategory: 'PROFESSIONAL_SERVICES', industryCode: 'PROFESSIONAL', scope: 3 },
  // Business Travel - Scope 3
  airfare: { productCategory: 'BUSINESS_TRAVEL', industryCode: 'TRAVEL', scope: 3 },
  flight: { productCategory: 'BUSINESS_TRAVEL', industryCode: 'TRAVEL', scope: 3 },
  hotel: { productCategory: 'BUSINESS_TRAVEL', industryCode: 'TRAVEL', scope: 3 },
  cab: { productCategory: 'BUSINESS_TRAVEL', industryCode: 'TRAVEL', scope: 3 },
  taxi: { productCategory: 'BUSINESS_TRAVEL', industryCode: 'TRAVEL', scope: 3 },
  commute: { productCategory: 'BUSINESS_TRAVEL', industryCode: 'TRAVEL', scope: 3 },
  uber: { productCategory: 'BUSINESS_TRAVEL', industryCode: 'TRAVEL', scope: 3 },
  ola: { productCategory: 'BUSINESS_TRAVEL', industryCode: 'TRAVEL', scope: 3 },
};

// ============= EMISSION FACTORS (BIOCOG_MVR_INDIA_v1.0 - from PDF) =============
// Source: BIOCOG_CARBON_MVR_LOGIC_Updated_Jan_31.pdf
const EMISSION_FACTORS = {
  scope1_fuels: {
    DIESEL: { value: 2.68, unit: 'litre' },      // kgCO2e per litre
    PETROL: { value: 2.31, unit: 'litre' },      // kgCO2e per litre
    CNG: { value: 2.75, unit: 'kg' },            // kgCO2e per kg
    PNG: { value: 2.30, unit: 'scm' },           // kgCO2e per scm
    LPG: { value: 1.51, unit: 'kg' },            // kgCO2e per kg
    COAL: { value: 2.42, unit: 'kg' },           // kgCO2e per kg
    FURNACE_OIL: { value: 3.15, unit: 'litre' }, // kgCO2e per litre
    NAPHTHA: { value: 3.00, unit: 'litre' },     // kgCO2e per litre
    BIOMASS: { value: 0.00, unit: 'kg', creditable: false }, // Reported but not credited
  },
  scope2_electricity: {
    INDIA_GRID_AVG: 0.708,  // kgCO2e per kWh (CEA India)
    SOLAR_CAPTIVE: 0.000,
    WIND_CAPTIVE: 0.000,
    RENEWABLE_PPA: 0.000,
  },
  scope3_transport: {
    ROAD_LIGHT: 0.12,    // kgCO2e per ton-km
    ROAD_HEAVY: 0.18,    // kgCO2e per ton-km
    RAIL: 0.04,          // kgCO2e per ton-km
    INLAND_WATER: 0.03,  // kgCO2e per ton-km
    SEA: 0.015,          // kgCO2e per ton-km
    AIR: 0.60,           // kgCO2e per ton-km
  },
  scope3_waste: {
    LANDFILL_ORGANIC: 1.90,   // kgCO2e per kg
    LANDFILL_INORGANIC: 0.45, // kgCO2e per kg
    RECYCLING_PAPER: -0.90,   // Negative = credit (only with certificate)
    RECYCLING_PLASTIC: -1.50,
    RECYCLING_METAL: -4.00,
    INCINERATION: 2.50,
  },
  // IT/Service monetary-based factors (kgCO2e per monetary unit)
  scope3_cloud: {
    AWS_INDIA: { value: 0.52, unit: 'USD', currency: 'USD' },      // kgCO2e per USD
    AZURE_INDIA: { value: 0.55, unit: 'USD', currency: 'USD' },
    GCP_INDIA: { value: 0.50, unit: 'USD', currency: 'USD' },
    CLOUD_DEFAULT: { value: 0.52, unit: 'USD', currency: 'USD' },
  },
  scope3_it_hardware: {
    LAPTOP: { value: 0.35, unit: 'INR1000' },      // kgCO2e per ₹1000
    SERVER: { value: 0.62, unit: 'INR1000' },
    NETWORKING: { value: 0.48, unit: 'INR1000' },
    IT_DEFAULT: { value: 0.45, unit: 'INR1000' },
  },
  scope3_services: {
    PROFESSIONAL_DEFAULT: { value: 0.30, unit: 'INR1000' },
    SOFTWARE_DEFAULT: { value: 0.25, unit: 'INR1000' },
  },
  scope3_business_travel: {
    AIR_SHORT: { value: 0.255, unit: 'km' },
    AIR_MEDIUM: { value: 0.156, unit: 'km' },
    AIR_LONG: { value: 0.150, unit: 'km' },
    HOTEL_NIGHT: { value: 21.6, unit: 'night' },
    CAB_DEFAULT: { value: 0.14, unit: 'km' },
  },
  // Green benefit factors (negative = carbon avoided/reduced)
  green_benefits: {
    SOLAR_ENERGY: { value: -0.708, unit: 'kWh', factorSource: 'BIOCOG_MVR_INDIA_v1.0:SOLAR_AVOIDED_GRID' },
    EV_TRANSPORT: { value: -1.80, unit: 'litre-equivalent', factorSource: 'BIOCOG_MVR_INDIA_v1.0:EV_DIESEL_AVOIDED' },
    FORESTATION: { value: -22.0, unit: 'tree', factorSource: 'BIOCOG_MVR_INDIA_v1.0:FORESTATION_IPCC' },
    WIND_ENERGY: { value: -0.708, unit: 'kWh', factorSource: 'BIOCOG_MVR_INDIA_v1.0:WIND_AVOIDED_GRID' },
    BIOGAS: { value: -2.30, unit: 'scm', factorSource: 'BIOCOG_MVR_INDIA_v1.0:BIOGAS_NG_AVOIDED' },
    ORGANIC_INPUT: { value: -0.50, unit: 'kg', factorSource: 'BIOCOG_MVR_INDIA_v1.0:ORGANIC_CHEM_AVOIDED' },
    ENERGY_EFFICIENCY: { value: -0.30, unit: 'kWh', factorSource: 'BIOCOG_MVR_INDIA_v1.0:EFFICIENCY_REDUCTION' },
    WATER_CONSERVATION: { value: -0.20, unit: 'kL', factorSource: 'BIOCOG_MVR_INDIA_v1.0:WATER_ENERGY_SAVED' },
    RECYCLED_MATERIAL: { value: -1.50, unit: 'kg', factorSource: 'BIOCOG_MVR_INDIA_v1.0:RECYCLED_VIRGIN_AVOIDED' },
  },
};

// ============= DETERMINISTIC CONFIDENCE SCORING (NO AI INFLUENCE) =============
// Per BIOCOG MRV spec: Base 100, fixed penalties, same input = same output
const CONFIDENCE_PENALTIES = {
  MISSING_QUANTITY: 20,
  MISSING_UNIT: 15,
  MISSING_INVOICE_NUMBER: 10,
  MISSING_SUPPLIER_GSTIN: 10,
  MISSING_DATE: 5,
  MISSING_AMOUNT: 5,
  UNVERIFIABLE_ITEM: 15,
  MISSING_EMISSION_FACTOR: 10,
  NO_LINE_ITEMS: 30,
  LOW_EXTRACTION_RATE: 15,
  HSN_CLASSIFICATION_BONUS: 5,
} as const;

function calculateDeterministicConfidence(params: {
  hasQuantity: boolean;
  hasUnit: boolean;
  hasInvoiceNumber: boolean;
  hasSupplierGstin: boolean;
  hasDate: boolean;
  hasAmount: boolean;
  lineItemCount: number;
  unverifiableCount: number;
  missingEmissionFactorCount: number;
  hsnClassifiedCount: number;
  extractedFieldRatio: number;
}): number {
  let confidence = 100;

  if (!params.hasQuantity) confidence -= CONFIDENCE_PENALTIES.MISSING_QUANTITY;
  if (!params.hasUnit) confidence -= CONFIDENCE_PENALTIES.MISSING_UNIT;
  if (!params.hasInvoiceNumber) confidence -= CONFIDENCE_PENALTIES.MISSING_INVOICE_NUMBER;
  if (!params.hasSupplierGstin) confidence -= CONFIDENCE_PENALTIES.MISSING_SUPPLIER_GSTIN;
  if (!params.hasDate) confidence -= CONFIDENCE_PENALTIES.MISSING_DATE;
  if (!params.hasAmount) confidence -= CONFIDENCE_PENALTIES.MISSING_AMOUNT;

  confidence -= params.unverifiableCount * CONFIDENCE_PENALTIES.UNVERIFIABLE_ITEM;
  confidence -= params.missingEmissionFactorCount * CONFIDENCE_PENALTIES.MISSING_EMISSION_FACTOR;

  if (params.lineItemCount === 0) confidence -= CONFIDENCE_PENALTIES.NO_LINE_ITEMS;
  if (params.extractedFieldRatio < 0.5) confidence -= CONFIDENCE_PENALTIES.LOW_EXTRACTION_RATE;

  const hsnBonus = Math.min(params.hsnClassifiedCount * CONFIDENCE_PENALTIES.HSN_CLASSIFICATION_BONUS, 10);
  confidence += hsnBonus;

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

// ============= DOCUMENT RELEVANCE CHECK =============
const VALID_DOCUMENT_TYPES = ['invoice', 'bill', 'certificate', 'receipt'];
const IRRELEVANT_DOCUMENT_KEYWORDS = [
  'passport', 'aadhaar', 'aadhar', 'pan card', 'voter id', 'driving license',
  'birth certificate', 'marriage certificate', 'degree', 'marksheet',
  'resume', 'cv', 'curriculum vitae', 'photograph', 'selfie', 'photo'
];

const HUMOROUS_REJECTIONS: Record<string, string[]> = {
  ceiling: [
    "That's a lovely ceiling, but we can't find any carbon emissions there! 😄 Try uploading a fuel bill or invoice instead.",
  ],
  selfie: [
    "Looking good! 📸 But we're more interested in your invoices than your selfies. Upload a business document to get started.",
  ],
  nature: [
    "Beautiful scenery! 🌿 Trees do absorb carbon, but we need your business invoices to calculate emissions.",
  ],
  food: [
    "That looks delicious! 🍽️ But to calculate carbon, we need your business invoices, not your lunch.",
  ],
  personal: [
    "This looks like a personal document. For carbon MRV, we need business invoices, fuel bills, or electricity receipts.",
  ],
  default: [
    "Hmm, this doesn't look like a business document. 📄 Try uploading an invoice, fuel bill, or electricity bill.",
  ]
};

const IMAGE_CONTEXT_PATTERNS: Record<string, RegExp> = {
  ceiling: /ceiling|roof|light|fixture|fan|lamp|chandelier|overhead/i,
  selfie: /face|person|portrait|selfie|profile|headshot|smile/i,
  nature: /tree|plant|flower|garden|nature|landscape|sky|cloud|mountain|forest|farm|field/i,
  food: /food|meal|dish|restaurant|menu|plate|eating|breakfast|lunch|dinner/i
};

function getHumorousRejection(ocrText: string, category?: string): string {
  const text = (ocrText || '').toLowerCase();
  
  if (category && HUMOROUS_REJECTIONS[category]) {
    return HUMOROUS_REJECTIONS[category][0];
  }
  
  for (const [cat, pattern] of Object.entries(IMAGE_CONTEXT_PATTERNS)) {
    if (pattern.test(text)) {
      return HUMOROUS_REJECTIONS[cat]?.[0] || HUMOROUS_REJECTIONS.default[0];
    }
  }
  
  for (const keyword of IRRELEVANT_DOCUMENT_KEYWORDS) {
    if (text.includes(keyword)) {
      return HUMOROUS_REJECTIONS.personal[0];
    }
  }
  
  return HUMOROUS_REJECTIONS.default[0];
}

function isDocumentRelevant(ocrData: any): { relevant: boolean; message?: string } {
  const docType = (ocrData.documentType || '').toLowerCase();
  const allText = JSON.stringify(ocrData).toLowerCase();
  
  if (docType === 'unknown') {
    for (const keyword of IRRELEVANT_DOCUMENT_KEYWORDS) {
      if (allText.includes(keyword)) {
        return { relevant: false, message: getHumorousRejection(allText, 'personal') };
      }
    }
    
    for (const [category, pattern] of Object.entries(IMAGE_CONTEXT_PATTERNS)) {
      if (pattern.test(allText)) {
        return { relevant: false, message: getHumorousRejection(allText, category) };
      }
    }
    
    if ((!ocrData.lineItems || ocrData.lineItems.length === 0) && !ocrData.amount) {
      return { relevant: false, message: getHumorousRejection(allText) };
    }
  }
  
  if (docType && !VALID_DOCUMENT_TYPES.includes(docType) && docType !== 'unknown') {
    return {
      relevant: false,
      message: `This document type (${docType}) is not supported for carbon accounting. Please upload an invoice, bill, or receipt.`
    };
  }
  
  return { relevant: true };
}

// ============= ENHANCED UNIT DETECTION =============
function detectUnit(text: string): string | null {
  const unitPatterns: Record<string, RegExp> = {
    'litre': /\b(litre|liter|ltr|lt|l|l1tre|1itre)\b/i,
    'kg': /\b(kg|kilogram|kgs|k\.g|k9)\b/i,
    'kWh': /\b(kwh|kilowatt|unit|units|un1ts|kw\.h)\b/i,
    'ton': /\b(ton|tonne|mt|tons|tonnes|metric\s*ton)\b/i,
    'km': /\b(km|kilometer|kilometres|k\.m)\b/i,
    'scm': /\b(scm|cubic\s*m|cu\.m|cbm)\b/i,
  };
  
  for (const [unit, pattern] of Object.entries(unitPatterns)) {
    if (pattern.test(text)) return unit;
  }
  return null;
}

// ============= QUANTITY INFERENCE FROM CONTEXT =============
function inferQuantityFromContext(text: string, amount?: number): number | null {
  const quantityPatterns = [
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:litre|liter|ltr|lt|l)\b/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:kg|kilogram|kgs)\b/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:kwh|unit|units)\b/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:ton|tonne|mt)\b/i,
    /qty[:\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /quantity[:\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
  ];
  
  for (const pattern of quantityPatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }
  
  // DON'T infer from amount - this causes hallucination
  // Amount-based inference removed to ensure determinism
  return null;
}

// ============= HSN CLASSIFICATION (RULE-BASED) =============
function classifyByHSN(hsnCode: string): { productCategory: string; industryCode: string; industryName: string; scope: number } | null {
  if (!hsnCode) return null;
  
  // Check 4-digit HSN first (more specific green codes)
  const prefix4 = hsnCode.substring(0, 4);
  if (HSN_MASTER[prefix4]) {
    return {
      productCategory: HSN_MASTER[prefix4].productCategory,
      industryCode: HSN_MASTER[prefix4].industryCode,
      industryName: HSN_MASTER[prefix4].industryName,
      scope: HSN_MASTER[prefix4].defaultScope,
    };
  }
  
  // Fall back to 2-digit HSN
  const prefix2 = hsnCode.substring(0, 2);
  if (HSN_MASTER[prefix2]) {
    return {
      productCategory: HSN_MASTER[prefix2].productCategory,
      industryCode: HSN_MASTER[prefix2].industryCode,
      industryName: HSN_MASTER[prefix2].industryName,
      scope: HSN_MASTER[prefix2].defaultScope,
    };
  }
  return null;
}

// ============= KEYWORD CLASSIFICATION (RULE-BASED FALLBACK) =============
function classifyByKeyword(text: string): { productCategory: string; industryCode: string; scope: number; fuelType?: string } | null {
  const lowerText = text.toLowerCase();
  
  // Check longer phrases first to avoid false matches
  const sortedKeywords = Object.entries(KEYWORD_MAP).sort((a, b) => b[0].length - a[0].length);
  
  for (const [keyword, classification] of sortedKeywords) {
    if (lowerText.includes(keyword)) {
      return classification;
    }
  }
  return null;
}

// ============= CALCULATE EMISSIONS (DETERMINISTIC - NO AI) =============
// Formula: Quantity × Emission_Factor = CO2_kg
// Per BIOCOG_MVR_INDIA_v1.0 specification
function calculateEmissions(
  quantity: number,
  unit: string,
  scope: number,
  productCategory: string,
  fuelType?: string
): { co2Kg: number; emissionFactor: number; factorSource: string } | null {
  
  if (!quantity || quantity <= 0) return null;
  
  // Scope 1: Fuels - Quantity × Fuel_Factor
  if (scope === 1 && productCategory === 'FUEL' && fuelType) {
    const factor = EMISSION_FACTORS.scope1_fuels[fuelType as keyof typeof EMISSION_FACTORS.scope1_fuels];
    if (factor) {
      const co2Kg = quantity * factor.value;
      return {
        co2Kg: Math.round(co2Kg * 100) / 100, // Round to 2 decimals
        emissionFactor: factor.value,
        factorSource: `BIOCOG_MVR_INDIA_v1.0:${fuelType}`,
      };
    }
  }
  
  // Scope 2: Electricity - kWh × 0.708 (India Grid Average)
  if (scope === 2 && productCategory === 'ELECTRICITY') {
    const factor = EMISSION_FACTORS.scope2_electricity.INDIA_GRID_AVG;
    const co2Kg = quantity * factor;
    return {
      co2Kg: Math.round(co2Kg * 100) / 100,
      emissionFactor: factor,
      factorSource: 'BIOCOG_MVR_INDIA_v1.0:INDIA_GRID_AVG',
    };
  }
  
  // Scope 3: Transport - Weight(tons) × Distance(km) × Factor
  if (scope === 3 && productCategory === 'TRANSPORT') {
    const factor = EMISSION_FACTORS.scope3_transport.ROAD_HEAVY;
    const co2Kg = quantity * factor;
    return {
      co2Kg: Math.round(co2Kg * 100) / 100,
      emissionFactor: factor,
      factorSource: 'BIOCOG_MVR_INDIA_v1.0:ROAD_HEAVY',
    };
  }
  
  // Scope 3: Waste - kg × Waste_Factor
  if (scope === 3 && productCategory === 'WASTE') {
    const factor = EMISSION_FACTORS.scope3_waste.LANDFILL_ORGANIC;
    const co2Kg = quantity * factor;
    return {
      co2Kg: Math.round(co2Kg * 100) / 100,
      emissionFactor: factor,
      factorSource: 'BIOCOG_MVR_INDIA_v1.0:LANDFILL_ORGANIC',
    };
  }
  
  // Scope 3: Raw materials - Estimated factor (requires more specific data)
  if (scope === 3 && productCategory === 'RAW_MATERIAL') {
    const estimatedFactor = 0.5; // Conservative estimate
    const co2Kg = quantity * estimatedFactor;
    return {
      co2Kg: Math.round(co2Kg * 100) / 100,
      emissionFactor: estimatedFactor,
      factorSource: 'BIOCOG_MVR_INDIA_v1.0:MATERIAL_AVG',
    };
  }
  
  // Green benefit categories (negative CO2 = carbon avoided)
  const greenFactor = EMISSION_FACTORS.green_benefits[productCategory as keyof typeof EMISSION_FACTORS.green_benefits];
  if (greenFactor) {
    const co2Kg = quantity * greenFactor.value;
    return {
      co2Kg: Math.round(co2Kg * 100) / 100,
      emissionFactor: greenFactor.value,
      factorSource: greenFactor.factorSource,
    };
  }
  
  return null;
}

interface LineItem {
  description: string;
  hsn_code?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
  productCategory?: string;
  industryCode?: string;
  industryName?: string;
  scope?: number;
  fuelType?: string;
  co2Kg?: number;
  emissionFactor?: number;
  factorSource?: string;
  classificationMethod?: 'HSN' | 'KEYWORD' | 'UNVERIFIABLE';
}

interface ExtractedData {
  documentType: 'invoice' | 'bill' | 'certificate' | 'receipt' | 'unknown';
  vendor?: string;
  date?: string;
  invoiceNumber?: string;
  supplierGstin?: string;
  buyerGstin?: string;
  amount?: number;
  currency?: string;
  lineItems: LineItem[];
  taxAmount?: number;
  subtotal?: number;
  primaryScope?: number;
  primaryCategory?: string;
  totalCO2Kg?: number;
  confidence: number;
  validationFlags: string[];
  classificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIABLE';
  methodology: {
    name: string;
    version: string;
    country: string;
    factorVersion: string;
    confidenceVersion: string;
  };
}

// ============= AI OCR EXTRACTION (DATA ONLY - NO CALCULATIONS) =============
// AI extracts ONLY: invoice_id, date, vendor, gstin, line_items (description, hsn, quantity, unit, amount)
// AI does NOT calculate CO2 values - that's done by deterministic math above
async function extractWithAI(imageBase64: string, mimeType: string, apiKey: string, model: string): Promise<any> {
  const systemPrompt = `You are an expert OCR document analyzer for Indian MSMEs. Your ONLY job is to extract data fields from invoices. You do NOT calculate emissions or carbon values.

CRITICAL EXTRACTION RULES:
1. Extract ONLY these fields - do NOT calculate or estimate anything else:
   - documentType: invoice/bill/receipt/certificate/unknown
   - vendor: Company name on the document
   - date: Invoice/bill date (normalize to YYYY-MM-DD)
   - invoiceNumber: Invoice/bill number
   - supplierGstin: 15-character GSTIN if present
   - buyerGstin: Buyer GSTIN if present
   - amount: Total amount in INR (numbers only)
   - taxAmount: GST/tax amount if shown
   - subtotal: Subtotal before tax if shown
   - lineItems: Array of items with:
     - description: Product/service name exactly as shown
     - hsn_code: 4-8 digit HSN/SAC code if visible
     - quantity: Numeric quantity ONLY if explicitly stated (DO NOT INFER)
     - unit: Unit type ONLY if explicitly stated (litre/kWh/kg/ton/km/scm/nos/pcs)
     - unitPrice: Per unit price if shown
     - total: Line total if shown

2. For electricity bills specifically:
   - Look for "Units Consumed" or "kWh" values - this is the quantity
   - The unit is "kWh" 
   - Vendor should include the power company name

3. CRITICAL - DO NOT:
   - Calculate or estimate CO2 emissions
   - Infer quantities from amounts
   - Guess units if not explicitly stated
   - Make up HSN codes

4. If a field is not clearly visible, set it to null - DO NOT GUESS.

5. If this is NOT a business document (selfie, ID card, etc.), set documentType to "unknown".

Respond with ONLY valid JSON, no markdown code blocks.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract invoice data from this image. Return ONLY the JSON with extracted fields, no calculations.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0, // Minimize variability
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI API error (${response.status}):`, errorText);
    const error = new Error(`AI extraction failed: ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, sessionId } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= GENERATE DOCUMENT HASH FIRST =============
    const documentHash = await generateDocumentHash(imageBase64, mimeType || 'image/jpeg');
    console.log(`Document hash generated: ${documentHash.substring(0, 16)}...`);

    // Check for authenticated user
    let userId: string | null = null;
    let isAuthenticated = false;
    let userTier = 'guest';
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          
          if (user) {
            userId = user.id;
            isAuthenticated = true;
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_tier')
              .eq('id', userId)
              .single();
            
            userTier = profile?.subscription_tier || 'snapshot';
            
            // ============= DUPLICATE DETECTION FOR AUTHENTICATED USERS =============
            const { data: existingDoc } = await supabase
              .from('documents')
              .select('id, vendor, invoice_number, created_at, cached_result')
              .eq('document_hash', documentHash)
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (existingDoc) {
              console.log(`DUPLICATE DETECTED: Hash ${documentHash.substring(0, 16)}... for user ${userId}`);
              
              const isPaidTier = ['essential', 'pro', 'scale'].includes(userTier);
              
              if (isPaidTier && existingDoc.cached_result) {
                return new Response(
                  JSON.stringify({ 
                    success: true, 
                    data: existingDoc.cached_result,
                    cached: true,
                    isDuplicate: true,
                    originalDocumentId: existingDoc.id,
                    documentHash,
                    message: `This invoice was already processed on ${new Date(existingDoc.created_at).toLocaleDateString('en-IN')}. Using verified results.`
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  isDuplicate: true,
                  originalDocumentId: existingDoc.id,
                  documentHash,
                  error: `This invoice was already processed on ${new Date(existingDoc.created_at).toLocaleDateString('en-IN')}. Each invoice can only be counted once.`,
                }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        } catch (authError) {
          console.log('Auth check failed, proceeding as guest:', authError);
        }
      }
    }
    
    // ============= GUEST USER: CHECK FOR CACHED RESULT =============
    // This ensures same invoice = same result for guests
    if (!isAuthenticated) {
      console.log(`Guest user processing. Hash: ${documentHash.substring(0, 16)}... SessionId: ${sessionId ? sessionId.substring(0, 8) + '...' : 'MISSING'}`);
      if (!sessionId) {
        console.warn('[WARN] No sessionId provided for guest user - data may be orphaned!');
      }
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Check for ANY cached result with this hash (regardless of user)
        const { data: cachedDoc } = await supabase
          .from('documents')
          .select('cached_result, document_hash, created_at')
          .eq('document_hash', documentHash)
          .not('cached_result', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (cachedDoc?.cached_result) {
          console.log(`CACHE HIT: Returning cached result for guest user`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: cachedDoc.cached_result,
              documentHash,
              userTier: 'guest',
              cached: true,
              message: 'Returning verified results for this invoice (cached for accuracy).'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    console.log(`Processing document for ${userTier} user...`);

    // ============= AI EXTRACTION (DATA ONLY) =============
    let content: string | null = null;
    let usedModel = 'google/gemini-2.5-flash';

    try {
      content = await extractWithAI(imageBase64, mimeType || 'image/jpeg', LOVABLE_API_KEY, 'google/gemini-2.5-flash');
      console.log('Flash model extraction complete');
    } catch (error: any) {
      if (error.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (error.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('Flash model failed:', error);
    }

    // Parse response
    let ocrData: any = null;
    if (content) {
      try {
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        ocrData = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse flash response:', e);
      }
    }

    // Retry with pro model if needed
    if (!ocrData || (ocrData.lineItems?.length === 0 && ocrData.documentType !== 'unknown')) {
      console.log('Retrying with pro model...');
      try {
        content = await extractWithAI(imageBase64, mimeType || 'image/jpeg', LOVABLE_API_KEY, 'google/gemini-2.5-pro');
        usedModel = 'google/gemini-2.5-pro';
        
        let jsonStr = content || '';
        const jsonMatch = content?.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        ocrData = JSON.parse(jsonStr);
      } catch (error: any) {
        if (error.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.error('Pro model failed:', error);
        if (!ocrData) {
          return new Response(
            JSON.stringify({ error: 'Failed to extract data. Please try a clearer image.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!ocrData) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse extracted data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check document relevance
    const relevanceCheck = isDocumentRelevant(ocrData);
    if (!relevanceCheck.relevant) {
      return new Response(
        JSON.stringify({ success: false, error: relevanceCheck.message, isIrrelevant: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`AI OCR complete (${usedModel}), applying DETERMINISTIC classification...`);

    // ============= RULE-BASED CLASSIFICATION & CALCULATION =============
    // This is where all math happens - deterministic, no AI
    const validationFlags: string[] = [];
    let totalCO2Kg = 0;
    let verifiedItems = 0;
    let unverifiableItems = 0;
    let missingEmissionFactorCount = 0;
    let hsnClassifiedCount = 0;
    let hasAnyQuantity = false;
    let hasAnyUnit = false;
    
    const classifiedItems: LineItem[] = (ocrData.lineItems || []).map((item: any) => {
      const classifiedItem: LineItem = {
        description: item.description || '',
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: item.unit || detectUnit(item.description || ''),
        unitPrice: item.unitPrice,
        total: item.total,
      };

      if (classifiedItem.quantity && classifiedItem.quantity > 0) hasAnyQuantity = true;
      if (classifiedItem.unit) hasAnyUnit = true;

      // DO NOT infer quantity from amount - this causes hallucination
      // Quantity must be explicitly extracted by OCR

      // Step 1: HSN classification
      if (item.hsn_code) {
        const hsnClass = classifyByHSN(item.hsn_code);
        if (hsnClass) {
          classifiedItem.productCategory = hsnClass.productCategory;
          classifiedItem.industryCode = hsnClass.industryCode;
          classifiedItem.industryName = hsnClass.industryName;
          classifiedItem.scope = hsnClass.scope;
          classifiedItem.classificationMethod = 'HSN';
          hsnClassifiedCount++;
        }
      }

      // Step 2: Keyword classification fallback
      if (!classifiedItem.productCategory) {
        const keywordClass = classifyByKeyword(item.description || '');
        if (keywordClass) {
          classifiedItem.productCategory = keywordClass.productCategory;
          classifiedItem.industryCode = keywordClass.industryCode;
          classifiedItem.scope = keywordClass.scope;
          classifiedItem.fuelType = keywordClass.fuelType;
          classifiedItem.classificationMethod = 'KEYWORD';
        }
      }

      // Step 3: Mark unverifiable if no classification
      if (!classifiedItem.productCategory) {
        classifiedItem.classificationMethod = 'UNVERIFIABLE';
        unverifiableItems++;
        validationFlags.push(`Unclassified: ${item.description?.substring(0, 30) || 'Unknown'}`);
      } else {
        verifiedItems++;
      }

      // Step 4: DETERMINISTIC emission calculation
      if (classifiedItem.productCategory && classifiedItem.quantity && classifiedItem.unit && classifiedItem.scope) {
        const emissions = calculateEmissions(
          classifiedItem.quantity,
          classifiedItem.unit,
          classifiedItem.scope,
          classifiedItem.productCategory,
          classifiedItem.fuelType
        );
        
        if (emissions) {
          classifiedItem.co2Kg = emissions.co2Kg;
          classifiedItem.emissionFactor = emissions.emissionFactor;
          classifiedItem.factorSource = emissions.factorSource;
          totalCO2Kg += emissions.co2Kg;
        } else {
          missingEmissionFactorCount++;
        }
      } else if (classifiedItem.productCategory) {
        missingEmissionFactorCount++;
      }

      return classifiedItem;
    });

    // Determine primary scope and category
    const scopeCounts: Record<number, number> = {};
    const categoryCounts: Record<string, number> = {};
    
    classifiedItems.forEach(item => {
      if (item.scope) scopeCounts[item.scope] = (scopeCounts[item.scope] || 0) + 1;
      if (item.productCategory) categoryCounts[item.productCategory] = (categoryCounts[item.productCategory] || 0) + 1;
    });

    const primaryScope = Object.entries(scopeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const primaryCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Classification status
    let classificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIABLE';
    if (unverifiableItems === 0 && classifiedItems.length > 0 && totalCO2Kg > 0) {
      classificationStatus = 'VERIFIED';
    } else if (verifiedItems > 0 || totalCO2Kg > 0) {
      classificationStatus = 'PARTIALLY_VERIFIED';
    } else if (classifiedItems.length > 0 || ocrData.amount) {
      classificationStatus = 'PARTIALLY_VERIFIED';
    } else {
      classificationStatus = 'UNVERIFIABLE';
    }

    // Validation flags
    if (!ocrData.invoiceNumber) validationFlags.push('Missing invoice number');
    if (!ocrData.supplierGstin) validationFlags.push('Missing supplier GSTIN');
    if (!ocrData.date) validationFlags.push('Missing invoice date');

    // Deterministic confidence calculation
    const totalPossibleFields = 7;
    let extractedFields = 0;
    if (ocrData.vendor) extractedFields++;
    if (ocrData.date) extractedFields++;
    if (ocrData.invoiceNumber) extractedFields++;
    if (ocrData.supplierGstin) extractedFields++;
    if (ocrData.buyerGstin) extractedFields++;
    if (ocrData.amount) extractedFields++;
    if (ocrData.lineItems?.length > 0) extractedFields++;

    const finalConfidence = calculateDeterministicConfidence({
      hasQuantity: hasAnyQuantity,
      hasUnit: hasAnyUnit,
      hasInvoiceNumber: !!ocrData.invoiceNumber,
      hasSupplierGstin: !!ocrData.supplierGstin,
      hasDate: !!ocrData.date,
      hasAmount: !!ocrData.amount,
      lineItemCount: classifiedItems.length,
      unverifiableCount: unverifiableItems,
      missingEmissionFactorCount,
      hsnClassifiedCount,
      extractedFieldRatio: extractedFields / totalPossibleFields,
    });

    const extractedData: ExtractedData = {
      documentType: ocrData.documentType || 'unknown',
      vendor: ocrData.vendor,
      date: ocrData.date,
      invoiceNumber: ocrData.invoiceNumber,
      supplierGstin: ocrData.supplierGstin,
      buyerGstin: ocrData.buyerGstin,
      amount: ocrData.amount,
      currency: ocrData.currency || 'INR',
      lineItems: classifiedItems,
      taxAmount: ocrData.taxAmount,
      subtotal: ocrData.subtotal,
      primaryScope: primaryScope ? parseInt(primaryScope) : undefined,
      primaryCategory,
      totalCO2Kg: totalCO2Kg > 0 ? Math.round(totalCO2Kg * 100) / 100 : undefined,
      confidence: finalConfidence,
      validationFlags,
      classificationStatus,
      methodology: METHODOLOGY_VERSION,
    };

    console.log(`DETERMINISTIC RESULT: ${classificationStatus}, ${verifiedItems} items, ${totalCO2Kg.toFixed(2)} kgCO₂e, confidence: ${finalConfidence}%`);

    // ============= CACHE THE RESULT =============
    // Store in database so future requests for same document get same result
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Insert cache record with session_id for guest users
        const { error: cacheError } = await supabase
          .from('documents')
          .insert({
            document_hash: documentHash,
            document_type: extractedData.documentType,
            vendor: extractedData.vendor,
            invoice_number: extractedData.invoiceNumber,
            amount: extractedData.amount,
            confidence: Math.min(extractedData.confidence, 999.99),
            cached_result: extractedData,
            cache_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            user_id: userId,
            session_id: isAuthenticated ? null : (sessionId || null), // Link to session for guest users
          });
        
        if (cacheError) {
          console.error('Failed to cache result:', cacheError);
        } else {
          console.log('Result cached for deterministic retrieval');
        }
      } catch (e) {
        console.error('Cache error:', e);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        documentHash,
        userTier
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
