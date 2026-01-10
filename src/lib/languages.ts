export interface Language {
  code: string;
  name: string;
  nativeName: string;
  region: 'india' | 'asia' | 'middle-east' | 'africa' | 'europe' | 'americas';
  speechCode: string; // For Web Speech API
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  // India
  { code: 'en', name: 'English', nativeName: 'English', region: 'india', speechCode: 'en-IN', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'india', speechCode: 'hi-IN', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'india', speechCode: 'bn-IN', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'india', speechCode: 'mr-IN', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'india', speechCode: 'te-IN', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'india', speechCode: 'ta-IN', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'india', speechCode: 'pa-IN', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'india', speechCode: 'ur-IN', flag: '🇮🇳' },
  
  // Asia
  { code: 'zh', name: 'Mandarin Chinese', nativeName: '普通话', region: 'asia', speechCode: 'zh-CN', flag: '🇨🇳' },
  { code: 'zh-HK', name: 'Cantonese', nativeName: '廣東話', region: 'asia', speechCode: 'zh-HK', flag: '🇭🇰' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', region: 'asia', speechCode: 'ja-JP', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', region: 'asia', speechCode: 'ko-KR', flag: '🇰🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', region: 'asia', speechCode: 'vi-VN', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', region: 'asia', speechCode: 'id-ID', flag: '🇮🇩' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', region: 'asia', speechCode: 'jv-ID', flag: '🇮🇩' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', region: 'asia', speechCode: 'fil-PH', flag: '🇵🇭' },
  
  // Middle East
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', region: 'middle-east', speechCode: 'ar-EG', flag: '🇪🇬' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', region: 'middle-east', speechCode: 'fa-IR', flag: '🇮🇷' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', region: 'middle-east', speechCode: 'tr-TR', flag: '🇹🇷' },
  
  // Africa
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', region: 'africa', speechCode: 'sw-KE', flag: '🇰🇪' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', region: 'africa', speechCode: 'ha-NG', flag: '🇳🇬' },
  { code: 'pcm', name: 'Nigerian Pidgin', nativeName: 'Naija', region: 'africa', speechCode: 'en-NG', flag: '🇳🇬' },
  
  // Europe
  { code: 'ru', name: 'Russian', nativeName: 'Русский', region: 'europe', speechCode: 'ru-RU', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', region: 'americas', speechCode: 'es-ES', flag: '🇪🇸' },
  
  // Americas
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', region: 'americas', speechCode: 'pt-BR', flag: '🇧🇷' },
];

export const REGION_LABELS: Record<Language['region'], string> = {
  india: 'India',
  asia: 'Asia Pacific',
  'middle-east': 'Middle East',
  africa: 'Africa',
  europe: 'Europe',
  americas: 'Americas',
};

export const detectBrowserLanguage = (): Language => {
  const browserLang = navigator.language || 'en';
  const langCode = browserLang.split('-')[0];
  
  // Try exact match first
  const exactMatch = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
  if (exactMatch) return exactMatch;
  
  // Try base language code
  const baseMatch = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
  if (baseMatch) return baseMatch;
  
  // Default to English
  return SUPPORTED_LANGUAGES[0];
};

export const getLanguageByCode = (code: string): Language => {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
};

export const groupLanguagesByRegion = (): Record<Language['region'], Language[]> => {
  return SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    if (!acc[lang.region]) acc[lang.region] = [];
    acc[lang.region].push(lang);
    return acc;
  }, {} as Record<Language['region'], Language[]>);
};
