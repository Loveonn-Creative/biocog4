import { useCallback, useSyncExternalStore } from "react";
import { useI18nContext } from "./LanguageProvider";
import { getStoreVersion, subscribe, translateSync } from "./autoTranslate";

/**
 * Universal translator hook.
 *
 *   const t = useT();
 *   t("Save changes")                 // static JSON first, then auto-translate
 *   t("welcome_key", "Welcome back")  // treats first arg as a key when a
 *                                     // fallback is supplied (matches legacy useTranslation)
 *
 * Every component using `useT` re-renders when new auto-translations arrive,
 * so switching language instantly re-flows any visible copy.
 */
export function useT() {
  const { locale, translations } = useI18nContext();
  // Subscribe once to the auto-translate store so this component re-renders
  // when new translations are cached in.
  // The snapshot is the store version, so every new batch of translations
  // re-renders this component (the previous snapshot never changed).
  const version = useSyncExternalStore(subscribe, getStoreVersion, getStoreVersion);

  return useCallback(
    (input: string, fallback?: string): string => {
      if (input == null) return "";
      // Legacy shape: useT("key", "English fallback")
      if (fallback !== undefined) {
        const fromStatic = translations[input];
        if (fromStatic) return fromStatic;
        return translateSync(locale, fallback);
      }
      // Auto shape: pass the English string as both source and lookup
      const fromStatic = translations[input];
      if (fromStatic) return fromStatic;
      return translateSync(locale, input);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, translations, version]
  );
}

/** JSX helper: <T>Save changes</T> */
export function T({ children }: { children: string }) {
  const t = useT();
  return <>{t(children)}</>;
}
