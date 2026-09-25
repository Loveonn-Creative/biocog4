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
}

export interface PersistableExtraction {
  confidence: number;
  lineItems?: PersistableLineItem[];
  validationFlags?: string[];
}

export interface EmissionInsertRow {
  document_id: string;
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
}

export function encodeEmissionProvenance(item: PersistableLineItem): string {
  return JSON.stringify({
    factorSource: item.factorSource,
    classificationMethod: item.classificationMethod,
    hsnCode: item.hsn_code || null,
    sourceDescription: item.description,
  } satisfies StoredProvenance);
}

export function buildEmissionRows(
  extractedData: PersistableExtraction,
  ownership: { documentId: string; sessionId: string | null; userId: string | null },
): EmissionInsertRow[] {
  const dataQuality = extractedData.confidence >= 80
    ? 'high'
    : extractedData.confidence >= 50
      ? 'medium'
      : 'low';

  return (extractedData.lineItems || []).flatMap((item) => {
    if (
      !item.productCategory ||
      !item.scope ||
      !item.quantity || item.quantity <= 0 ||
      !item.unit ||
      item.co2Kg === undefined || !Number.isFinite(item.co2Kg) ||
      item.emissionFactor === undefined || !Number.isFinite(item.emissionFactor) ||
      !item.factorSource ||
      item.classificationMethod === 'UNVERIFIABLE' ||
      !item.classificationMethod
    ) {
      return [];
    }

    return [{
      document_id: ownership.documentId,
      session_id: ownership.userId ? null : ownership.sessionId,
      user_id: ownership.userId,
      scope: item.scope,
      category: CATEGORY_MAP[item.productCategory] || 'other',
      co2_kg: item.co2Kg,
      activity_data: item.quantity,
      activity_unit: item.unit,
      emission_factor: item.emissionFactor,
      data_quality: dataQuality,
      verification_notes: encodeEmissionProvenance(item),
      verified: false,
    }];
  });
}