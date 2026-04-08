// Country Intelligence Layer — Config-driven, not hardcoded
// Grid emission factors sourced from IEA 2023 published data

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  taxIdLabel: string;
  taxIdPlaceholder: string;
  taxIdPattern: RegExp;
  gridFactor: number; // kgCO₂e per kWh (IEA 2023)
  frameworks: string[];
  govBody: string;
  languages: string[];
  cbamExposed: boolean;
  financialTerms: Record<string, string>;
  sectorBenchmarks: Record<string, number>; // kgCO₂e per $1000 revenue equivalent
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    taxIdLabel: 'GSTIN',
    taxIdPlaceholder: '22AAAAA0000A1Z5',
    taxIdPattern: /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z]$/,
    gridFactor: 0.708,
    frameworks: ['GCP', 'BRSR', 'CCTS', 'PAT'],
    govBody: 'MoEFCC',
    languages: ['en', 'hi', 'bn', 'mr', 'te', 'ta'],
    cbamExposed: true,
    financialTerms: {
      carbonCredit: 'Carbon Credit',
      greenLoan: 'Green Loan',
      auditTrail: 'Audit Trail',
    },
    sectorBenchmarks: {
      manufacturing: 2.8,
      textile: 3.2,
      food_processing: 2.1,
      chemicals: 4.5,
      logistics: 3.8,
      services: 0.8,
      construction: 4.0,
    },
  },
  PH: {
    code: 'PH',
    name: 'Philippines',
    currency: 'PHP',
    currencySymbol: '₱',
    locale: 'en-PH',
    taxIdLabel: 'TIN',
    taxIdPlaceholder: '123-456-789-000',
    taxIdPattern: /^\d{3}-\d{3}-\d{3}-\d{3}$/,
    gridFactor: 0.505,
    frameworks: ['DTI-EO', 'SEC-ESG'],
    govBody: 'DTI',
    languages: ['en', 'tl'],
    cbamExposed: false,
    financialTerms: {
      carbonCredit: 'Carbon Credit',
      greenLoan: 'Green Loan',
      auditTrail: 'Audit Trail',
    },
    sectorBenchmarks: {
      manufacturing: 2.4,
      textile: 2.8,
      food_processing: 1.9,
      chemicals: 3.8,
      logistics: 3.2,
      services: 0.7,
      construction: 3.5,
    },
  },
  ID: {
    code: 'ID',
    name: 'Indonesia',
    currency: 'IDR',
    currencySymbol: 'Rp',
    locale: 'id-ID',
    taxIdLabel: 'NPWP',
    taxIdPlaceholder: '01.234.567.8-901.000',
    taxIdPattern: /^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/,
    gridFactor: 0.761,
    frameworks: ['OJK-ESG', 'PROPER'],
    govBody: 'OJK',
    languages: ['en', 'id'],
    cbamExposed: true,
    financialTerms: {
      carbonCredit: 'Kredit Karbon',
      greenLoan: 'Pinjaman Hijau',
      auditTrail: 'Jejak Audit',
    },
    sectorBenchmarks: {
      manufacturing: 3.0,
      textile: 3.4,
      food_processing: 2.3,
      chemicals: 4.8,
      logistics: 3.5,
      services: 0.9,
      construction: 4.2,
    },
  },
  BD: {
    code: 'BD',
    name: 'Bangladesh',
    currency: 'BDT',
    currencySymbol: '৳',
    locale: 'bn-BD',
    taxIdLabel: 'TIN',
    taxIdPlaceholder: '123456789012',
    taxIdPattern: /^\d{12}$/,
    gridFactor: 0.623,
    frameworks: ['DoE-ECA'],
    govBody: 'DoE',
    languages: ['en', 'bn'],
    cbamExposed: true,
    financialTerms: {
      carbonCredit: 'কার্বন ক্রেডিট',
      greenLoan: 'সবুজ ঋণ',
      auditTrail: 'Audit Trail',
    },
    sectorBenchmarks: {
      manufacturing: 2.6,
      textile: 3.6,
      food_processing: 2.0,
      chemicals: 4.0,
      logistics: 3.0,
      services: 0.6,
      construction: 3.8,
    },
  },
  PK: {
    code: 'PK',
    name: 'Pakistan',
    currency: 'PKR',
    currencySymbol: 'Rs',
    locale: 'ur-PK',
    taxIdLabel: 'NTN',
    taxIdPlaceholder: '1234567-8',
    taxIdPattern: /^\d{7}-\d$/,
    gridFactor: 0.495,
    frameworks: ['SECP-ESG'],
    govBody: 'Pak-EPA',
    languages: ['en', 'ur'],
    cbamExposed: false,
    financialTerms: {
      carbonCredit: 'کاربن کریڈٹ',
      greenLoan: 'سبز قرض',
      auditTrail: 'Audit Trail',
    },
    sectorBenchmarks: {
      manufacturing: 2.5,
      textile: 3.3,
      food_processing: 1.8,
      chemicals: 4.2,
      logistics: 3.4,
      services: 0.7,
      construction: 3.9,
    },
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    currencySymbol: 'S$',
    locale: 'en-SG',
    taxIdLabel: 'UEN',
    taxIdPlaceholder: '200012345A',
    taxIdPattern: /^[0-9]{8,9}[A-Z]$/,
    gridFactor: 0.408,
    frameworks: ['SGX-ESG', 'Carbon Tax Act'],
    govBody: 'NEA',
    languages: ['en'],
    cbamExposed: false,
    financialTerms: {
      carbonCredit: 'Carbon Credit',
      greenLoan: 'Green Loan',
      auditTrail: 'Audit Trail',
    },
    sectorBenchmarks: {
      manufacturing: 1.8,
      textile: 2.0,
      food_processing: 1.5,
      chemicals: 3.2,
      logistics: 2.8,
      services: 0.5,
      construction: 2.8,
    },
  },
  VN: {
    code: 'VN',
    name: 'Vietnam',
    currency: 'VND',
    currencySymbol: '₫',
    locale: 'vi-VN',
    taxIdLabel: 'MST',
    taxIdPlaceholder: '0123456789',
    taxIdPattern: /^\d{10}(-\d{3})?$/,
    gridFactor: 0.625,
    frameworks: ['MONRE-EIA'],
    govBody: 'MONRE',
    languages: ['en', 'vi'],
    cbamExposed: true,
    financialTerms: {
      carbonCredit: 'Tín chỉ carbon',
      greenLoan: 'Vay xanh',
      auditTrail: 'Audit Trail',
    },
    sectorBenchmarks: {
      manufacturing: 2.7,
      textile: 3.1,
      food_processing: 2.0,
      chemicals: 4.3,
      logistics: 3.3,
      services: 0.7,
      construction: 3.7,
    },
  },
  TH: {
    code: 'TH',
    name: 'Thailand',
    currency: 'THB',
    currencySymbol: '฿',
    locale: 'th-TH',
    taxIdLabel: 'Tax ID',
    taxIdPlaceholder: '1234567890123',
    taxIdPattern: /^\d{13}$/,
    gridFactor: 0.493,
    frameworks: ['TGO-CFO', 'SEC-ESG'],
    govBody: 'TGO',
    languages: ['en', 'th'],
    cbamExposed: false,
    financialTerms: {
      carbonCredit: 'Carbon Credit',
      greenLoan: 'Green Loan',
      auditTrail: 'Audit Trail',
    },
    sectorBenchmarks: {
      manufacturing: 2.3,
      textile: 2.7,
      food_processing: 1.8,
      chemicals: 3.9,
      logistics: 3.1,
      services: 0.6,
      construction: 3.4,
    },
  },
  MY: {
    code: 'MY',
    name: 'Malaysia',
    currency: 'MYR',
    currencySymbol: 'RM',
    locale: 'ms-MY',
    taxIdLabel: 'SST ID',
    taxIdPlaceholder: 'W10-1234-56789012',
    taxIdPattern: /^[A-Z]\d{2}-\d{4}-\d{8}$/,
    gridFactor: 0.585,
    frameworks: ['Bursa-ESG', 'MyCarbon'],
    govBody: 'NRE',
    languages: ['en', 'ms'],
    cbamExposed: false,
    financialTerms: {
      carbonCredit: 'Kredit Karbon',
      greenLoan: 'Pinjaman Hijau',
      auditTrail: 'Audit Trail',
    },
    sectorBenchmarks: {
      manufacturing: 2.5,
      textile: 2.9,
      food_processing: 1.9,
      chemicals: 4.1,
      logistics: 3.3,
      services: 0.7,
      construction: 3.6,
    },
  },
  LK: {
    code: 'LK',
    name: 'Sri Lanka',
    currency: 'LKR',
    currencySymbol: 'Rs',
    locale: 'si-LK',
    taxIdLabel: 'TIN',
    taxIdPlaceholder: '123456789',
    taxIdPattern: /^\d{9}$/,
    gridFactor: 0.462,
    frameworks: ['CEA-EIA'],
    govBody: 'CEA',
    languages: ['en', 'si', 'ta'],
    cbamExposed: false,
    financialTerms: {
      carbonCredit: 'Carbon Credit',
      greenLoan: 'Green Loan',
      auditTrail: 'Audit Trail',
    },
    sectorBenchmarks: {
      manufacturing: 2.2,
      textile: 2.8,
      food_processing: 1.7,
      chemicals: 3.6,
      logistics: 2.9,
      services: 0.5,
      construction: 3.2,
    },
  },
};

// Map location names to country codes
export const LOCATION_TO_CODE: Record<string, string> = {
  'India': 'IN',
  'Philippines': 'PH',
  'Indonesia': 'ID',
  'Bangladesh': 'BD',
  'Pakistan': 'PK',
  'Singapore': 'SG',
  'Vietnam': 'VN',
  'Thailand': 'TH',
  'Malaysia': 'MY',
  'Sri Lanka': 'LK',
};

export function getCountryConfig(locationOrCode: string): CountryConfig {
  const code = LOCATION_TO_CODE[locationOrCode] || locationOrCode;
  return COUNTRY_CONFIGS[code] || COUNTRY_CONFIGS['IN'];
}

export function getCountryList(): { value: string; label: string; code: string }[] {
  return Object.entries(COUNTRY_CONFIGS).map(([code, config]) => ({
    value: config.name,
    label: config.name,
    code,
  }));
}

export function formatCurrencyByCountry(value: number, locationOrCode: string): string {
  const config = getCountryConfig(locationOrCode);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    maximumFractionDigits: 0,
  }).format(value);
}
