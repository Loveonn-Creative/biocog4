// Emission rows from a server extraction. Shared by extract-document (which
// creates the rows for signed-in users) and the browser (guest results, and a
// fallback when an older function version did not create them). Pure.

// How a counted quantity was obtained (see electricityBill.ts). Estimated,
// handwritten and meter-reading quantities are stored one data-quality level
// below a printed reading, and the basis travels in the provenance notes.
import { LOWER_QUALITY_BASES } from './electricityBill.ts';
import { isEvidenceOnlyKind } from './documentKind.ts';
export interface PersistableLineItem {
  description: string;
  hsn_code?: string;
  quantity?: number;
  unit?: string;
  productCategory?: string;
  scope?: number;
  co2Kg?: number;
  emissionFactor?: number;
  factorSource?: string;
  classificationMethod?: 'HSN' | 'KEYWORD' | 'UNVERIFIABLE';
  /** read_from_bill | estimated_kvah_pf | handwritten | meter_readings | entered_by_you */
  basis?: string;
  basisLabel?: string;
  /** Page of the source document the line was read from. */
  sourcePage?: number;
  /** Plain statements behind the figure (conversions, grid country, basis). */
  assumptions?: string[];
}

export interface PersistableExtraction {
  documentType?: string;
  /** documentKind.ts; credit notes and purchase orders never make rows. */
  documentKind?: string;
  methodology?: { factorVersion?: string };
  vendor?: string;
  date?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  confidence: number;
  lineItems?: PersistableLineItem[];
  validationFlags?: string[];
}

export interface EmissionInsertRow {
  document_id: string;
  /** Set on the server for organisation uploads; the browser leaves it out. */
  organization_id?: string | null;
  session_id: string | null;
  user_id: string | null;
  scope: number;
  category: string;
  co2_kg: number;
  activity_data: number;
  activity_unit: string;
  emission_factor: number;
  data_quality: 'high' | 'medium' | 'low';
  verification_notes: string;
  verified: false;
}

const CATEGORY_MAP: Record<string, string> = {
  FUEL: 'fuel',
  ELECTRICITY: 'electricity',
  TRANSPORT: 'transport',
  RAW_MATERIAL: 'materials',
  WASTE: 'waste',
  CHEMICALS: 'materials',
  CAPITAL_GOODS: 'materials',
  ELECTRICAL_EQUIPMENT: 'materials',
  TRANSPORT_EQUIPMENT: 'transport',
  SERVICES: 'other',
  CLOUD_SERVICES: 'cloud',
  SOFTWARE: 'software',
  IT_HARDWARE: 'it_hardware',
  PROFESSIONAL_SERVICES: 'services',
  BUSINESS_TRAVEL: 'travel',
  SOLAR_ENERGY: 'solar',
  EV_TRANSPORT: 'ev',
  FORESTATION: 'forestation',
  WIND_ENERGY: 'wind',
  BIOGAS: 'biogas',
  ORGANIC_INPUT: 'organic',
  ENERGY_EFFICIENCY: 'efficiency',
  WATER_CONSERVATION: 'water',
  RECYCLED_MATERIAL: 'recycled',
};

export interface StoredProvenance {
  factorSource: string;
  classificationMethod: 'HSN' | 'KEYWORD';
  hsnCode: string | null;
  sourceDescription: string;
  /** How the quantity was obtained, and its plain label (absent on rows written before this field). */
  basis?: string;
  basisLabel?: string;
  /** Written from October 2026; older rows show "not recorded". */
  factorSetVersion?: string;
  sourcePage?: number;
  assumptions?: string[];
}

export function encodeEmissionProvenance(
  item: PersistableLineItem & { factorSource: string; classificationMethod: 'HSN' | 'KEYWORD' },
  factorSetVersion?: string,
): string {
  return JSON.stringify({
    factorSource: item.factorSource,
    classificationMethod: item.classificationMethod,
    hsnCode: item.hsn_code || null,
    sourceDescription: item.description,
    ...(item.basis ? { basis: item.basis } : {}),
    ...(item.basis && item.basisLabel ? { basisLabel: item.basisLabel } : {}),
    ...(factorSetVersion ? { factorSetVersion } : {}),
    ...(typeof item.sourcePage === 'number' ? { sourcePage: item.sourcePage } : {}),
    ...(Array.isArray(item.assumptions) ? { assumptions: item.assumptions.slice(0, 8).map((a) => String(a).slice(0, 200)) } : {}),
  } satisfies StoredProvenance);
}

export function buildEmissionRows(
  extractedData: PersistableExtraction,
  ownership: { documentId: string; sessionId: string | null; userId: string | null; organizationId?: string | null },
): EmissionInsertRow[] {
  const dataQuality = extractedData.confidence >= 80
    ? 'high'
    : extractedData.confidence >= 50
      ? 'medium'
      : 'low';

  // Credit notes and purchase orders are evidence only (owner rule).
  if (isEvidenceOnlyKind(extractedData.documentKind)) return [];
  const factorSetVersion = extractedData.methodology?.factorVersion;
  return (extractedData.lineItems || []).flatMap((item) => {
    const classificationMethod = item.classificationMethod;
    const factorSource = item.factorSource;
    if (
      !item.productCategory ||
      !item.scope ||
      !item.quantity || item.quantity <= 0 ||
      !item.unit ||
      item.co2Kg === undefined || !Number.isFinite(item.co2Kg) ||
      item.emissionFactor === undefined || !Number.isFinite(item.emissionFactor) ||
      !factorSource ||
      classificationMethod !== 'HSN' && classificationMethod !== 'KEYWORD'
    ) {
      return [];
    }

    const lower = !!item.basis && LOWER_QUALITY_BASES.has(item.basis);
    return [{
      document_id: ownership.documentId,
      ...(ownership.organizationId ? { organization_id: ownership.organizationId } : {}),
      session_id: ownership.userId ? null : ownership.sessionId,
      user_id: ownership.userId,
      scope: item.scope,
      category: CATEGORY_MAP[item.productCategory] || 'other',
      co2_kg: item.co2Kg,
      activity_data: item.quantity,
      activity_unit: item.unit,
      emission_factor: item.emissionFactor,
      data_quality: lower ? (dataQuality === 'high' ? 'medium' : 'low') : dataQuality,
      verification_notes: encodeEmissionProvenance({ ...item, factorSource, classificationMethod }, factorSetVersion),
      verified: false,
    }];
  });
}