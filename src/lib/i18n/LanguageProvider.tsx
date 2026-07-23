import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { startDomTranslator, stopDomTranslator } from './domTranslator';

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
// Lazy-load translation JSON (only English is guaranteed to exist statically;
// other locales fall back to English + runtime auto-translation).
async function loadTranslation(locale: string): Promise<Record<string, string>> {
  if (translationCache[locale]) return translationCache[locale];
  const loaders: Record<string, () => Promise<{ default: Record<string, string> }>> = {
    en: () => import('./translations/en.json'),
    hi: () => import('./translations/hi.json'),
    bn: () => import('./translations/bn.json'),
    ta: () => import('./translations/ta.json'),
    mr: () => import('./translations/mr.json'),
    id: () => import('./translations/id.json'),
    ur: () => import('./translations/ur.json'),
    tl: () => import('./translations/tl.json'),
    vi: () => import('./translations/vi.json'),
    th: () => import('./translations/th.json'),
    es: () => import('./translations/es.json'),
  };
  try {
    const loader = loaders[locale];
    if (loader) {
      const mod = await loader();
      translationCache[locale] = mod.default;
      return mod.default;
    }
    // No static bundle: use English keys as fallback; runtime auto-translation
    // will still translate visible strings via the DOM translator.
    if (!translationCache['en']) {
      const en = await loaders['en']();
      translationCache['en'] = en.default;
    }
    translationCache[locale] = translationCache['en'];
    return translationCache['en'];
  } catch {
    if (!translationCache['en']) {
      const en = await loaders['en']();
      translationCache['en'] = en.default;
    }
    return translationCache['en'];
  }
}

const SUPPORTED = [
  'en', 'hi', 'bn', 'ta', 'mr', 'id', 'ur', 'tl', 'vi', 'th', 'es',
  'te', 'gu', 'pa', 'ml', 'kn', 'zh', 'ar', 'pt',
];

function detectInitialLocale(): string {
  const stored = localStorage.getItem('senseible_locale');
  if (stored && SUPPORTED.includes(stored)) return stored;
  const browserLang = navigator.language?.split('-')[0] || 'en';
  return SUPPORTED.includes(browserLang) ? browserLang : 'en';
}

const RTL_LOCALES = new Set(['ur', 'ar', 'fa', 'he']);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Lazy-init so first render has the correct locale (no flash / no double render)
  const [locale, setLocaleState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en';
    try { return detectInitialLocale(); } catch { return 'en'; }
  });
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    try { localStorage.setItem('senseible_locale', newLocale); } catch {}
  }, []);

  // Load translations when locale changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadTranslation(locale).then(t => {
      if (!cancelled) {
        setTranslations(t);
        setIsLoading(false);
        try {
          document.documentElement.lang = locale;
          document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
        } catch {}
        // Universal DOM translator: makes the language switch cover every
        // rendered string, including pages that never adopted useTranslation.
        try {
          if (locale === 'en') stopDomTranslator();
          else startDomTranslator(locale);
        } catch {}
      }
    });
    return () => { cancelled = true; };
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, translations, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
};
