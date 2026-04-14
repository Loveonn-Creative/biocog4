import { useCallback } from 'react';
import { useI18nContext } from './LanguageProvider';

export function useTranslation() {
  const { locale, setLocale, translations, isLoading } = useI18nContext();

  const t = useCallback(
    (key: string, fallback?: string): string => {
      return translations[key] || fallback || key;
    },
    [translations]
  );

  return { t, locale, setLocale, isLoading };
}
