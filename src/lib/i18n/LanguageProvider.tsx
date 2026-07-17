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
    const loader = loaders[locale] || loaders['en'];
    const mod = await loader();
    translationCache[locale] = mod.default;
    return mod.default;
  } catch {
    if (!translationCache['en']) {
      const en = await loaders['en']();
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
        // Surface to the DOM so non-React listeners (analytics, SSG snapshots,
        // Playwright, native form validation) react too.
        try {
          document.documentElement.lang = locale;
          // Urdu is the only RTL locale we currently support.
          document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
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
