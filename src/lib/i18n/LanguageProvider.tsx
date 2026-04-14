import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  translations: Record<string, string>;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  translations: {},
  isLoading: false,
});

export const useI18nContext = () => useContext(I18nContext);

// Cache loaded translations
const translationCache: Record<string, Record<string, string>> = {};

// Lazy-load translation JSON
async function loadTranslation(locale: string): Promise<Record<string, string>> {
  if (translationCache[locale]) return translationCache[locale];
  if (locale === 'en') {
    const mod = await import('./translations/en.json');
    translationCache['en'] = mod.default;
    return mod.default;
  }
  try {
    const mod = await import(`./translations/${locale}.json`);
    translationCache[locale] = mod.default;
    return mod.default;
  } catch {
    // Fallback to English
    if (!translationCache['en']) {
      const en = await import('./translations/en.json');
      translationCache['en'] = en.default;
    }
    return translationCache['en'];
  }
}

function detectInitialLocale(): string {
  // Check localStorage
  const stored = localStorage.getItem('senseible_locale');
  if (stored) return stored;
  // Check browser language
  const browserLang = navigator.language?.split('-')[0] || 'en';
  const supported = ['en', 'hi', 'bn', 'ta', 'mr', 'id', 'ur', 'tl', 'vi', 'th', 'es'];
  return supported.includes(browserLang) ? browserLang : 'en';
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem('senseible_locale', newLocale);
  }, []);

  // Load translations when locale changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadTranslation(locale).then(t => {
      if (!cancelled) {
        setTranslations(t);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [locale]);

  // Detect initial locale on mount
  useEffect(() => {
    const initial = detectInitialLocale();
    if (initial !== 'en') setLocaleState(initial);
    // Always load English as base
    loadTranslation('en').then(t => setTranslations(t));
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, translations, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
};
