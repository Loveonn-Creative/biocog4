// GSTIN structure, state codes and check character. Pure, so the website
// (signup checks, spreadsheet import) and the edge functions use one copy.

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** 2-digit state code, PAN, entity number, Z, check character. */
export const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// GST state codes (CBIC). 25 (Daman and Diu) merged into 26 in 2020; both are still seen on older GSTINs.
export const GST_STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya',
  '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
  '97': 'Other Territory', '99': 'Centre Jurisdiction',
};

/** Spaces and dashes removed, upper case. */
export const normalizeGstinInput = (raw: string) => raw.replace(/[\s-]+/g, '').toUpperCase();

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

/** Which GSTIN rule a value breaks first, or null when it passes all three. */
export function gstinFault(raw: string): 'shape' | 'state' | 'check' | null {
  const v = normalizeGstinInput(raw);
  if (!GSTIN_SHAPE.test(v)) return 'shape';
  if (!GST_STATES[v.slice(0, 2)]) return 'state';
  if (gstinCheckChar(v.slice(0, 14)) !== v[14]) return 'check';
  return null;
}
