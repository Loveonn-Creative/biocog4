// Sector from the NIC industry code embedded in an Indian CIN (characters
// 2 to 6). Companies registered up to 2008 carry NIC 2004 codes, later ones
// NIC 2008. Only the 2-digit division is used, mapped to a coarse sector the
// service tools understand. The result is always shown as editable.

export type SectorKey =
  | 'agriculture' | 'mining' | 'food' | 'textiles' | 'leather' | 'wood_paper' | 'chemicals' | 'pharma'
  | 'plastics' | 'cement_glass' | 'steel_metals' | 'engineering' | 'electronics' | 'automotive'
  | 'energy' | 'water_waste' | 'construction' | 'trade' | 'logistics' | 'hospitality'
  | 'it_services' | 'finance' | 'services' | 'public';

export const SECTOR_LABEL: Record<SectorKey, string> = {
  agriculture: 'Agriculture, forestry and fishing', mining: 'Mining and quarrying', food: 'Food and beverages',
  textiles: 'Textiles and apparel', leather: 'Leather and footwear', wood_paper: 'Wood, paper and printing',
  chemicals: 'Chemicals and petroleum products', pharma: 'Pharmaceuticals', plastics: 'Rubber and plastics',
  cement_glass: 'Cement, glass and ceramics', steel_metals: 'Steel and metals', engineering: 'Machinery and engineering',
  electronics: 'Electronics and electrical equipment', automotive: 'Automotive and transport equipment',
  energy: 'Electricity and gas', water_waste: 'Water, waste and recycling', construction: 'Construction',
  trade: 'Wholesale and retail trade', logistics: 'Transport and logistics', hospitality: 'Hotels and restaurants',
  it_services: 'IT and software services', finance: 'Finance and insurance', services: 'Professional and other services',
  public: 'Public sector, education and health',
};

/** Sectors in which manufacturing (and so Scope 1 fuel and process emissions) is typical. */
export const MANUFACTURING: SectorKey[] = [
  'food', 'textiles', 'leather', 'wood_paper', 'chemicals', 'pharma', 'plastics', 'cement_glass',
  'steel_metals', 'engineering', 'electronics', 'automotive',
];

const range = (a: number, b: number, k: SectorKey): [number, SectorKey][] =>
  Array.from({ length: b - a + 1 }, (_, i) => [a + i, k]);

const NIC2008 = new Map<number, SectorKey>([
  ...range(1, 3, 'agriculture'), ...range(5, 9, 'mining'), ...range(10, 12, 'food'), ...range(13, 14, 'textiles'),
  [15, 'leather'], ...range(16, 18, 'wood_paper'), [19, 'chemicals'], [20, 'chemicals'], [21, 'pharma'], [22, 'plastics'],
  [23, 'cement_glass'], [24, 'steel_metals'], [25, 'steel_metals'], [26, 'electronics'], [27, 'electronics'],
  [28, 'engineering'], [29, 'automotive'], [30, 'automotive'], ...range(31, 33, 'engineering'), [35, 'energy'],
  ...range(36, 39, 'water_waste'), ...range(41, 43, 'construction'), ...range(45, 47, 'trade'), ...range(49, 53, 'logistics'),
  [55, 'hospitality'], [56, 'hospitality'], ...range(58, 63, 'it_services'), ...range(64, 66, 'finance'),
  ...range(68, 82, 'services'), ...range(84, 88, 'public'), ...range(90, 99, 'services'),
]);

const NIC2004 = new Map<number, SectorKey>([
  [1, 'agriculture'], [2, 'agriculture'], [5, 'agriculture'], ...range(10, 14, 'mining'), [15, 'food'], [16, 'food'],
  [17, 'textiles'], [18, 'textiles'], [19, 'leather'], ...range(20, 22, 'wood_paper'), [23, 'chemicals'], [24, 'chemicals'],
  [25, 'plastics'], [26, 'cement_glass'], [27, 'steel_metals'], [28, 'steel_metals'], [29, 'engineering'],
  ...range(30, 33, 'electronics'), [34, 'automotive'], [35, 'automotive'], [36, 'engineering'], [37, 'water_waste'],
  [40, 'energy'], [41, 'water_waste'], [45, 'construction'], ...range(50, 52, 'trade'), [55, 'hospitality'],
  ...range(60, 63, 'logistics'), [64, 'it_services'], ...range(65, 67, 'finance'), [70, 'services'], [71, 'services'],
  [72, 'it_services'], [73, 'services'], [74, 'services'], [75, 'public'], [80, 'public'], [85, 'public'],
  [90, 'water_waste'], ...range(91, 99, 'services'),
]);

/** Sector from a valid CIN, or null. `cin` must already pass checkCin. */
export function sectorFromCin(cin: string): { sector: SectorKey; nic: string; edition: '2004' | '2008' } | null {
  const v = cin.replace(/[\s-]+/g, '').toUpperCase();
  const m = v.match(/^[LU]([0-9]{5})[A-Z]{2}([0-9]{4})/);
  if (!m) return null;
  const nic = m[1];
  const year = Number(m[2]);
  const edition = year <= 2008 ? '2004' : '2008';
  const sector = (edition === '2004' ? NIC2004 : NIC2008).get(Number(nic.slice(0, 2)));
  return sector ? { sector, nic, edition } : null;
}
