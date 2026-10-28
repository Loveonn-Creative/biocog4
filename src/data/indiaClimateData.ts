// India climate data hub (/india-climate-data). Every figure below was read
// from the official file named in its dataset's `source` (re-opened 24 October
// 2026). Keep sources here, not as citation lines on the page; the page shows
// them in a collapsed "Source" detail next to each dataset.
import { defaultFor as officialDefaultFor, DEFAULT_MARKUP, FERTILISER_MARKUP } from '@/lib/cbam/official';

export const DATA_PATH = '/india-climate-data';
export const DATA_UPDATED = '2026-10-24';

export interface DataSource { label: string; url: string; where: string }

const CEA_V22: DataSource = {
  label: 'Central Electricity Authority, CO2 Baseline Database for the Indian Power Sector, User Guide Version 22.0 (August 2026)',
  url: 'https://cea.nic.in/cdm-co2-baseline-view?mappingId=234&lang=en',
  where: 'Annexure I, page 22',
};

// ---------------------------------------------------------------------------
// 1. Grid emission factor, total CO2 and generation, FY 2013-14 to FY 2025-26
// CEA User Guide v22.0, Annexure I, columns (2) to (6).

export interface GridYear {
  fy: string;
  /** Total CO2 emissions, million tonnes */
  co2Mt: number;
  /** Net generation, conventional, BU */
  conventionalBU: number;
  /** Renewable generation, BU */
  reBU: number;
  /** Total net electricity generation, BU */
  totalBU: number;
  /** Weighted average emission factor including renewables, t CO2 per MWh */
  factor: number;
  /** From FY 2022-23: adjusted for cross-border transfers, includes captive injection */
  adjusted: boolean;
}

export const GRID_SERIES: GridYear[] = [
  { fy: '2013-14', co2Mt: 727.4, conventionalBU: 886.77, reBU: 53.06, totalBU: 939.83, factor: 0.774, adjusted: false },
  { fy: '2014-15', co2Mt: 805.4, conventionalBU: 972.04, reBU: 61.72, totalBU: 1033.76, factor: 0.779, adjusted: false },
  { fy: '2015-16', co2Mt: 846.3, conventionalBU: 1027.03, reBU: 65.78, totalBU: 1092.81, factor: 0.774, adjusted: false },
  { fy: '2016-17', co2Mt: 888.34, conventionalBU: 1072.84, reBU: 81.55, totalBU: 1154.39, factor: 0.770, adjusted: false },
  { fy: '2017-18', co2Mt: 922.18, conventionalBU: 1121.57, reBU: 101.84, totalBU: 1223.41, factor: 0.754, adjusted: false },
  { fy: '2018-19', co2Mt: 960.9, conventionalBU: 1165.16, reBU: 126.76, totalBU: 1291.92, factor: 0.744, adjusted: false },
  { fy: '2019-20', co2Mt: 928.14, conventionalBU: 1162.97, reBU: 138.34, totalBU: 1301.31, factor: 0.713, adjusted: false },
  { fy: '2020-21', co2Mt: 910.02, conventionalBU: 1147.52, reBU: 147.25, totalBU: 1294.77, factor: 0.703, adjusted: false },
  { fy: '2021-22', co2Mt: 1002.01, conventionalBU: 1230.09, reBU: 170.91, totalBU: 1401.01, factor: 0.715, adjusted: false },
  { fy: '2022-23', co2Mt: 1108.11, conventionalBU: 1320.18, reBU: 203.55, totalBU: 1547.80, factor: 0.716, adjusted: true },
  { fy: '2023-24', co2Mt: 1203.36, conventionalBU: 1408.45, reBU: 225.83, totalBU: 1654.54, factor: 0.727, adjusted: true },
  { fy: '2024-25', co2Mt: 1235.96, conventionalBU: 1461.85, reBU: 255.01, totalBU: 1740.54, factor: 0.710, adjusted: true },
  { fy: '2025-26', co2Mt: 1189.29, conventionalBU: 1424.19, reBU: 310.58, totalBU: 1761.28, factor: 0.675, adjusted: true },
];

/** FY 2025-26 margins, CEA User Guide v22.0, Table S (page 1). */
export const GRID_MARGINS_2025_26 = { average: 0.675, om: 0.963, bm: 0.446, cm: 0.705 };

/** The factor Senseible's calculator applies today (supabase/functions/_shared/emissionFactors.ts). */
export const SENSEIBLE_GRID_FACTOR = { value: 0.675, fy: '2025-26' };

export const GRID_SOURCE: DataSource = CEA_V22;
export const GRID_MARGIN_SOURCE: DataSource = { ...CEA_V22, where: 'Table S, page 1' };

// ---------------------------------------------------------------------------
// 2. Installed capacity on 31 March 2026, MW
// CEA User Guide v22.0, Table 1 (page 4), citing CEA's installed capacity report.

export interface CapacitySlice { key: string; label: string; mw: number }

export const CAPACITY_2026: CapacitySlice[] = [
  { key: 'coal', label: 'Coal', mw: 221940.01 },
  { key: 're', label: 'Renewables', mw: 223273.43 },
  { key: 'hydro', label: 'Large hydro', mw: 51414.66 },
  { key: 'gas', label: 'Gas', mw: 20122.41 },
  { key: 'nuclear', label: 'Nuclear', mw: 8780 },
  { key: 'other', label: 'Lignite and diesel', mw: 6620 + 589.20 },
];
export const CAPACITY_TOTAL_MW = 532739.72;
export const CAPACITY_DETAIL = { lignite: 6620, diesel: 589.20, privateMw: 278631.81, privateReMw: 191655.91, stateMw: 129999.99, centralMw: 124107.92 };
export const CAPACITY_SOURCE: DataSource = { ...CEA_V22, where: 'Table 1, page 4 (installed capacity as on 31.03.2026)' };

// ---------------------------------------------------------------------------
// 3. Carbon Credit Trading Scheme: plants with GHG emission intensity targets
// Counts of unique registration numbers in each gazette schedule (Senseible's
// count; the government has not published a total). Baseline year 2023-24.

export interface CctsSector { sector: string; plants: number; notification: 'G.S.R. 739(E)' | 'G.S.R. 25(E)' | 'G.S.R. 517(E), draft'; draft: boolean }

export const CCTS_SECTORS: CctsSector[] = [
  { sector: 'Iron and steel', plants: 255, notification: 'G.S.R. 517(E), draft', draft: true },
  { sector: 'Cement', plants: 186, notification: 'G.S.R. 739(E)', draft: false },
  { sector: 'Textiles', plants: 173, notification: 'G.S.R. 25(E)', draft: false },
  { sector: 'Pulp and paper', plants: 51, notification: 'G.S.R. 739(E)', draft: false },
  { sector: 'Chlor-alkali', plants: 30, notification: 'G.S.R. 739(E)', draft: false },
  { sector: 'Petroleum refineries', plants: 21, notification: 'G.S.R. 25(E)', draft: false },
  { sector: 'Aluminium', plants: 13, notification: 'G.S.R. 739(E)', draft: false },
  { sector: 'Petrochemical crackers', plants: 11, notification: 'G.S.R. 25(E)', draft: false },
  { sector: 'Secondary aluminium', plants: 3, notification: 'G.S.R. 25(E)', draft: false },
];

export const CCTS_SOURCES: DataSource[] = [
  { label: 'Greenhouse Gases Emission Intensity Target Rules, 2025, G.S.R. 739(E), Gazette of India, 8 October 2025', url: 'https://beeindia.gov.in/WriteReadData/RTF1984/RTF-PDF-f0db112734284168_1776057153.pdf', where: 'Schedule' },
  { label: 'Greenhouse Gases Emission Intensity Target (Amendment) Rules, 2025, G.S.R. 25(E), Gazette of India, 13 January 2026', url: 'https://beeindia.gov.in/WriteReadData/RTF1984/RTF-PDF-de57eb4cfcc5ab0c_1776057184.pdf', where: 'Schedule' },
  { label: 'Draft amendment rules for iron and steel, G.S.R. 517(E), Gazette of India, 26 June 2026', url: 'https://beeindia.gov.in/WriteReadData/RTF1984/RTF-PDF-bbce4f833a613eae_1783081829.pdf', where: 'Third Schedule (draft)' },
];

// ---------------------------------------------------------------------------
// 4. CBAM default values for goods from India, t CO2e per tonne
// European Commission, default values for the definitive period, Excel
// version 2 (6 August 2026), India sheet. Mark-ups: Guidance No. 3, section 4.10.

export type CbamSector = 'Iron and steel' | 'Aluminium' | 'Cement' | 'Fertilisers' | 'Hydrogen';

export interface CbamGood { cn: string; name: string; sector: CbamSector; direct: number; indirect: number | null; total: number }

// The goods shown and their names are Senseible's selection; every number is
// read from the Commission file through src/lib/cbam/official.ts (generated,
// tested cell by cell), so this list cannot drift from the source.
const CBAM_GOOD_PICKS: { cn: string; name: string; sector: CbamSector }[] = [
  { cn: '7208', name: 'Hot-rolled flat steel', sector: 'Iron and steel' },
  { cn: '7213', name: 'Wire rod', sector: 'Iron and steel' },
  { cn: '7214 20 00', name: 'Rebar', sector: 'Iron and steel' },
  { cn: '7207 11 14', name: 'Billets (rolled or cast)', sector: 'Iron and steel' },
  { cn: '7206 10 00', name: 'Ingots', sector: 'Iron and steel' },
  { cn: '7201', name: 'Pig iron', sector: 'Iron and steel' },
  { cn: '7203', name: 'Sponge iron (DRI)', sector: 'Iron and steel' },
  { cn: '7218 10 00', name: 'Stainless steel ingots', sector: 'Iron and steel' },
  { cn: '7318 15', name: 'Screws and bolts', sector: 'Iron and steel' },
  { cn: '2601 12 00', name: 'Iron ore pellets and sinter', sector: 'Iron and steel' },
  { cn: '7601', name: 'Unwrought aluminium', sector: 'Aluminium' },
  { cn: '7605', name: 'Aluminium wire', sector: 'Aluminium' },
  { cn: '7606', name: 'Aluminium sheet and strip', sector: 'Aluminium' },
  { cn: '2523 10 00 90', name: 'Grey clinker', sector: 'Cement' },
  { cn: '2523 29 00', name: 'Grey Portland cement', sector: 'Cement' },
  { cn: '2814 10 00', name: 'Anhydrous ammonia', sector: 'Fertilisers' },
  { cn: '3102 10 19', name: 'Urea (over 45% nitrogen)', sector: 'Fertilisers' },
  { cn: '3105 30 00', name: 'DAP', sector: 'Fertilisers' },
  { cn: '2804 10 00', name: 'Hydrogen', sector: 'Hydrogen' },
];

export const CBAM_GOODS: CbamGood[] = CBAM_GOOD_PICKS.map(({ cn, name, sector }) => {
  const d = officialDefaultFor(cn);
  if (!d || d.cn !== cn.replace(/\D/g, '') || d.direct === null || d.total === null) throw new Error(`CBAM default for ${cn} missing from the Commission file`);
  return { cn, name, sector, direct: d.direct, indirect: d.indirect, total: d.total };
});

/** Default value mark-up by year of import. Fertilisers take 1% from 2026. */
export const CBAM_MARKUP: Record<2026 | 2027 | 2028, number> = { 2026: DEFAULT_MARKUP[2026], 2027: DEFAULT_MARKUP[2027], 2028: DEFAULT_MARKUP[2028] };
export const CBAM_FERTILISER_MARKUP = FERTILISER_MARKUP;

/** Sectors whose CBAM figure counts indirect emissions in the definitive period. */
export const CBAM_COUNTS_INDIRECT: CbamSector[] = ['Cement', 'Fertilisers'];

export function cbamWithMarkup(g: CbamGood, year: 2026 | 2027 | 2028): number {
  const base = CBAM_COUNTS_INDIRECT.includes(g.sector) ? g.total : g.direct;
  const m = g.sector === 'Fertilisers' ? CBAM_FERTILISER_MARKUP : CBAM_MARKUP[year];
  return Math.round(base * (1 + m) * 1000) / 1000;
}

export const CBAM_SOURCES: DataSource[] = [
  { label: 'European Commission, Default values for the CBAM definitive period, Excel version 2 (6 August 2026); legally binding values in Implementing Regulation (EU) 2026/1740 correcting (EU) 2025/2621', url: 'https://taxation-customs.ec.europa.eu/document/download/1c05d211-80cb-4aaa-8ef0-e08005a95d7e_en?filename=DV%20correcting%20act_final%20update_06.08.xlsx', where: 'India sheet' },
  { label: 'European Commission, Guidance No. 3, CBAM methods for the calculation of emissions embedded in goods (14 August 2026)', url: 'https://taxation-customs.ec.europa.eu/document/download/29b9eec7-1a4b-4eb6-ab85-96a0c9e35fd0_en?filename=Guidance%20No.%203%20-%20CBAM%20methods%20for%20the%20calculation%20of%20emissions%20embedded%20in%20goods.pdf', where: 'Section 4.10, mark-ups' },
];

// ---------------------------------------------------------------------------
// 5. Fuel conversions
// PPAC Ready Reckoner FY 2025-26, Table 9.2 (weight to volume, page 132) and
// Table 9.5 (natural gas conversions).

export interface FuelConversion { key: string; fuel: string; klPerTonne: number; to15C: number }

export const FUEL_CONVERSIONS: FuelConversion[] = [
  { key: 'diesel', fuel: 'Diesel', klPerTonne: 1.2100, to15C: 0.9879 },
  { key: 'petrol', fuel: 'Petrol', klPerTonne: 1.4110, to15C: 0.9830 },
  { key: 'kerosene', fuel: 'Kerosene', klPerTonne: 1.2850, to15C: 0.9864 },
  { key: 'ldo', fuel: 'Light diesel oil', klPerTonne: 1.1720, to15C: 0.9877 },
  { key: 'fo', fuel: 'Furnace oil', klPerTonne: 1.0424, to15C: 0.9899 },
  { key: 'atf', fuel: 'Jet fuel (ATF)', klPerTonne: 1.2880, to15C: 0.9862 },
];

export const GAS_FACTS = [
  { label: '1 tonne of LNG', value: '1,314 SCM of gas' },
  { label: 'Gas calorific value used for conversions', value: '10,000 kcal per SCM (gross)' },
  { label: '1 MMBtu', value: '25.2 SCM at 10,000 kcal per SCM' },
  { label: '1 SCM', value: '1 cubic metre at 1 atmosphere and 15.56 C' },
];

export const FUEL_SOURCE: DataSource = {
  label: 'Petroleum Planning and Analysis Cell, PPAC Ready Reckoner FY 2025-26',
  url: 'https://ppac.gov.in/download.php?file=rep_studies/1784899305_The_PPAC_Ready_Reckoner_FY_2025%E2%80%9326_Final.pdf',
  where: 'Table 9.2, page 132 (weight to volume) and Table 9.5 (natural gas)',
};

// ---------------------------------------------------------------------------
// Dataset descriptors, shared by the page (CSV download) and the build
// (schema.org Dataset markup and the prerendered tables).

export interface DatasetMeta { id: string; name: string; description: string; sources: DataSource[]; temporal?: string; csv: () => string }

const csvCell = (v: string | number | null) => {
  const s = v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: (string | number | null)[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

export const DATASETS: DatasetMeta[] = [
  {
    id: 'grid-emission-factor',
    name: 'India grid emission factor, FY 2013-14 to FY 2025-26',
    description: 'Weighted average CO2 emission factor of grid electricity in India including renewables, with total power-sector CO2 and net generation, by financial year, from CEA CO2 Baseline Database version 22.0.',
    sources: [GRID_SOURCE],
    temporal: '2013-04-01/2026-03-31',
    csv: () => toCsv([
      ['financial_year', 'grid_factor_t_co2_per_mwh', 'total_co2_million_t', 'conventional_net_generation_bu', 're_generation_bu', 'total_net_generation_bu', 're_share_pct', 'adjusted_for_cross_border_and_captive'],
      ...GRID_SERIES.map((y) => [y.fy, y.factor, y.co2Mt, y.conventionalBU, y.reBU, y.totalBU, Math.round((y.reBU / y.totalBU) * 1000) / 10, y.adjusted ? 'yes' : 'no']),
    ]),
  },
  {
    id: 'installed-capacity',
    name: 'India installed power capacity by source, 31 March 2026',
    description: 'Installed generation capacity in India by source in MW as on 31 March 2026, as reported in CEA CO2 Baseline Database version 22.0.',
    sources: [CAPACITY_SOURCE],
    temporal: '2026-03-31',
    csv: () => toCsv([
      ['source', 'installed_mw', 'share_pct'],
      ...[
        ['Coal', 221940.01], ['Lignite', CAPACITY_DETAIL.lignite], ['Gas', 20122.41], ['Diesel', CAPACITY_DETAIL.diesel],
        ['Nuclear', 8780], ['Large hydro', 51414.66], ['Renewables', 223273.43],
      ].map(([s, mw]) => [s as string, mw as number, Math.round(((mw as number) / CAPACITY_TOTAL_MW) * 1000) / 10]),
      ['Total', CAPACITY_TOTAL_MW, 100],
    ]),
  },
  {
    id: 'ccts-plants',
    name: 'India Carbon Credit Trading Scheme: plants with emission intensity targets by sector',
    description: 'Number of plants with greenhouse gas emission intensity targets under India\'s Carbon Credit Trading Scheme, by sector, counted from the schedules of G.S.R. 739(E), G.S.R. 25(E) and the draft G.S.R. 517(E).',
    sources: CCTS_SOURCES,
    temporal: '2025-10-08/2026-06-26',
    csv: () => toCsv([
      ['sector', 'plants', 'notification', 'status'],
      ...CCTS_SECTORS.map((s) => [s.sector, s.plants, s.notification, s.draft ? 'draft' : 'notified']),
    ]),
  },
  {
    id: 'cbam-default-values-india',
    name: 'EU CBAM default values for goods from India',
    description: 'European Commission default embedded emission values for CBAM goods produced in India, in tonnes CO2e per tonne, with the 2026 to 2028 mark-ups.',
    sources: CBAM_SOURCES,
    temporal: '2026-01-01/2028-12-31',
    csv: () => toCsv([
      ['cn_code', 'good', 'sector', 'direct_t_co2e_per_t', 'indirect_t_co2e_per_t', 'total_t_co2e_per_t', 'with_markup_2026', 'with_markup_2027', 'with_markup_2028'],
      ...CBAM_GOODS.map((g) => [g.cn, g.name, g.sector, g.direct, g.indirect, g.total, cbamWithMarkup(g, 2026), cbamWithMarkup(g, 2027), cbamWithMarkup(g, 2028)]),
    ]),
  },
  {
    id: 'fuel-conversions',
    name: 'India fuel weight to volume conversions (PPAC)',
    description: 'Kilolitres per tonne of Indian petroleum fuels at 29.5 C and the factor to correct volume to 15 C, from the PPAC Ready Reckoner FY 2025-26.',
    sources: [FUEL_SOURCE],
    csv: () => toCsv([
      ['fuel', 'kl_per_tonne_at_29_5c', 'multiply_to_get_volume_at_15c', 'litres_per_tonne_at_15c'],
      ...FUEL_CONVERSIONS.map((f) => [f.fuel, f.klPerTonne, f.to15C, Math.round(f.klPerTonne * f.to15C * 1000)]),
    ]),
  },
];
