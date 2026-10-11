// Offline checks for Indian business identifiers used at signup.
//
// These read only what the number itself encodes (format, GSTIN checksum,
// state code, embedded PAN, CIN fields). They never claim a business exists:
// "verified" is reserved for a successful response from a licensed registry
// API (see verifyBusinessIdRemote), which is not connected yet.

export type BusinessIdType = 'gstin' | 'cin' | 'pan';

/** Explicit states shown in the UI. */
export type VerificationStatus =
  | 'idle'          // nothing entered
  | 'pending'       // checking
  | 'invalid'       // fails format or checksum
  | 'format_ok'     // structure valid; registry not consulted
  | 'verified'      // registry confirmed (licensed API only)
  | 'not_found'     // registry says no such record (licensed API only)
  | 'unavailable';  // registry API not connected or not reachable

export interface DerivedFacts {
  state?: string;
  pan?: string;
  holderType?: string;
  listed?: boolean;
  yearIncorporated?: number;
  companyType?: string;
}

export interface LocalCheck {
  type: BusinessIdType | null;
  value: string;
  status: Exclude<VerificationStatus, 'verified' | 'not_found' | 'unavailable' | 'pending'>;
  reason?: string;
  facts: DerivedFacts;
}

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const normalizeId = (raw: string) => raw.replace(/[\s-]+/g, '').toUpperCase();

// GST state codes (CBIC). 25 (Daman and Diu) merged into 26 in 2020; both are still seen on older GSTINs.
const GST_STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya',
  '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
  '97': 'Other Territory', '99': 'Centre Jurisdiction',
};

// Registrar of Companies state codes used in CINs.
const CIN_STATES: Record<string, string> = {
  AN: 'Andaman and Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar',
  CH: 'Chandigarh', CT: 'Chhattisgarh', DD: 'Daman and Diu', DL: 'Delhi', DN: 'Dadra and Nagar Haveli', GA: 'Goa',
  GJ: 'Gujarat', HP: 'Himachal Pradesh', HR: 'Haryana', JH: 'Jharkhand', JK: 'Jammu and Kashmir', KA: 'Karnataka',
  KL: 'Kerala', LD: 'Lakshadweep', MH: 'Maharashtra', ML: 'Meghalaya', MN: 'Manipur', MP: 'Madhya Pradesh',
  MZ: 'Mizoram', NL: 'Nagaland', OR: 'Odisha', PB: 'Punjab', PY: 'Puducherry', RJ: 'Rajasthan', SK: 'Sikkim',
  TG: 'Telangana', TN: 'Tamil Nadu', TR: 'Tripura', UP: 'Uttar Pradesh', UR: 'Uttarakhand', WB: 'West Bengal',
};

const CIN_TYPES: Record<string, string> = {
  PLC: 'Public limited company', PTC: 'Private limited company', OPC: 'One person company',
  GOI: 'Government of India company', SGC: 'State government company',
  FLC: 'Public company, subsidiary of a foreign company', FTC: 'Private company, subsidiary of a foreign company',
  GAP: 'Public company limited by guarantee', GAT: 'Private company limited by guarantee',
  NPL: 'Not-for-profit company', ULL: 'Unlimited public company', ULT: 'Unlimited private company',
};

// 4th character of a PAN: holder type (Income Tax Department).
const PAN_HOLDER: Record<string, string> = {
  C: 'Company', F: 'Firm or LLP', H: 'Hindu undivided family', A: 'Association of persons',
  T: 'Trust', B: 'Body of individuals', L: 'Local authority', J: 'Artificial juridical person',
  G: 'Government', P: 'Individual',
};

/** GSTIN check character (mod-36 algorithm published for GSTIN validation). */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i]);
    const p = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export function detectIdType(raw: string): BusinessIdType | null {
  const v = normalizeId(raw);
  if (v.length === 15) return 'gstin';
  if (v.length === 21) return 'cin';
  if (v.length === 10) return 'pan';
  return null;
}

export function checkPan(raw: string): LocalCheck {
  const value = normalizeId(raw);
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) {
    return { type: 'pan', value, status: 'invalid', reason: 'A PAN is 5 letters, 4 digits, then a letter.', facts: {} };
  }
  const holder = PAN_HOLDER[value[3]];
  if (!holder) return { type: 'pan', value, status: 'invalid', reason: 'The fourth character is not a valid PAN holder type.', facts: {} };
  if (value[3] === 'P') {
    return { type: 'pan', value, status: 'invalid', reason: 'Personal PANs are not collected. Use your GSTIN or company PAN.', facts: { holderType: holder } };
  }
  return { type: 'pan', value, status: 'format_ok', facts: { pan: value, holderType: holder } };
}

export function checkGstin(raw: string): LocalCheck {
  const value = normalizeId(raw);
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value)) {
    return { type: 'gstin', value, status: 'invalid', reason: 'A GSTIN is 15 characters: state code, PAN, entity number, Z, check character.', facts: {} };
  }
  const state = GST_STATES[value.slice(0, 2)];
  if (!state) return { type: 'gstin', value, status: 'invalid', reason: 'The first two digits are not a GST state code.', facts: {} };
  if (gstinCheckChar(value.slice(0, 14)) !== value[14]) {
    return { type: 'gstin', value, status: 'invalid', reason: 'The check character does not match. Please re-check the number.', facts: {} };
  }
  const pan = value.slice(2, 12);
  return { type: 'gstin', value, status: 'format_ok', facts: { state, pan, holderType: PAN_HOLDER[pan[3]] } };
}

export function checkCin(raw: string): LocalCheck {
  const value = normalizeId(raw);
  const m = value.match(/^([LU])([0-9]{5})([A-Z]{2})([0-9]{4})([A-Z]{3})([0-9]{6})$/);
  if (!m) {
    return { type: 'cin', value, status: 'invalid', reason: 'A CIN is 21 characters, e.g. U12345MH2015PTC123456.', facts: {} };
  }
  const [, listing, , stateCode, yearStr, typeCode] = m;
  const year = Number(yearStr);
  const state = CIN_STATES[stateCode];
  if (!state) return { type: 'cin', value, status: 'invalid', reason: 'The state code in this CIN is not recognised.', facts: {} };
  if (year < 1850 || year > new Date().getFullYear()) {
    return { type: 'cin', value, status: 'invalid', reason: 'The year of incorporation in this CIN is not possible.', facts: {} };
  }
  return {
    type: 'cin', value, status: 'format_ok',
    facts: { state, listed: listing === 'L', yearIncorporated: year, companyType: CIN_TYPES[typeCode] ?? 'Other company type' },
  };
}

export function checkBusinessId(raw: string): LocalCheck {
  const value = normalizeId(raw);
  if (!value) return { type: null, value, status: 'idle', facts: {} };
  const type = detectIdType(value);
  if (type === 'gstin') return checkGstin(value);
  if (type === 'cin') return checkCin(value);
  if (type === 'pan') return checkPan(value);
  return { type: null, value, status: 'invalid', reason: 'Enter a 15-character GSTIN, a 21-character CIN or a 10-character company PAN.', facts: {} };
}

/**
 * Registry verification. No licensed GSTN, MCA or PAN provider is connected
 * yet, so this reports "unavailable" and never fabricates a result. When a
 * provider is approved, call it from a server-side function here and map its
 * response to verified / not_found / unavailable.
 */
export async function verifyBusinessIdRemote(_type: BusinessIdType, _value: string): Promise<{ status: 'verified' | 'not_found' | 'unavailable'; facts?: DerivedFacts }> {
  return { status: 'unavailable' };
}
