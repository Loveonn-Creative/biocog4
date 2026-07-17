import { useCallback, useSyncExternalStore } from 'react';
import { useI18nContext } from './LanguageProvider';
import { subscribe, translateSync } from './autoTranslate';

/**
 * Universal translator. Backwards-compatible with the old
 * `t(key, fallback)` shape but also auto-translates any English
 * string when only one arg is passed:
 *
 *   t('nav.save', 'Save')     // static JSON key first, then auto
 *   t('Save changes')          // pure auto-translate path
 */
export function useTranslation() {
  const { locale, setLocale, translations, isLoading } = useI18nContext();

  // Re-render this component whenever new auto-translations land in the
  // shared cache, so live language switches propagate instantly.
  useSyncExternalStore(
    subscribe,
    () => `${locale}:${Object.keys(translations).length}`,
    () => 'en:0'
  );

  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (key == null) return '';
      const staticHit = translations[key];
      if (staticHit) return staticHit;
      // Auto-translate the English source (fallback if provided, else the key itself)
      const source = fallback ?? key;
      return translateSync(locale, source);
    },
    [translations, locale]
  );

  return { t, locale, setLocale, isLoading };
}
