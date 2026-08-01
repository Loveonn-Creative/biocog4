import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { startDomTranslator, stopDomTranslator } from './domTranslator';
import { supabase } from '@/integrations/supabase/client';


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
  const userIdRef = useRef<string | null>(null);

  // Single setter used by Settings AND the nav quick-switch.
  // Writes local storage always; mirrors to the profile when signed in so the
  // preference follows the user across devices and future sessions.
  const setLocale = useCallback((newLocale: string) => {
    if (!SUPPORTED.includes(newLocale)) return;
    setLocaleState(newLocale);
    try { localStorage.setItem('senseible_locale', newLocale); } catch {}
    const uid = userIdRef.current;
    if (uid) {
      void supabase
        .from('profiles')
        .update({ preferred_language: newLocale })
        .eq('id', uid)
        .then(({ error }) => {
          if (error) console.error('preferred_language save failed', error.message);
        });
    }
  }, []);

  // Profile-backed preference: the stored profile value wins over browser
  // language and over whatever this device happened to have cached.
  useEffect(() => {
    let cancelled = false;

    const applyForUser = async (uid: string | null) => {
      userIdRef.current = uid;
      if (!uid) return;
      const { data } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', uid)
        .maybeSingle();
      if (cancelled) return;
      const pref = data?.preferred_language;
      if (pref && SUPPORTED.includes(pref)) {
        setLocaleState(pref);
        try { localStorage.setItem('senseible_locale', pref); } catch {}
      } else {
        // First sign-in with no stored preference: adopt the current one.
        try {
          const current = localStorage.getItem('senseible_locale');
          if (current && SUPPORTED.includes(current)) {
            await supabase.from('profiles').update({ preferred_language: current }).eq('id', uid);
          }
        } catch {}
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      void applyForUser(data.session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (uid !== userIdRef.current) void applyForUser(uid);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
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
          document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
        } catch {}
        try {
          if (locale === 'en') stopDomTranslator();
          else startDomTranslator(locale);
        } catch {}
      }
    });
    return () => { cancelled = true; };
  }, [locale]);

  // Cross-tab sync: if the locale changes in another tab, mirror it here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'senseible_locale' && e.newValue && e.newValue !== locale) {
        setLocaleState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, translations, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
};
