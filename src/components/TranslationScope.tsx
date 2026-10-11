import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18nContext } from "@/lib/i18n/LanguageProvider";
import { setRuntimeTranslationAllowed } from "@/lib/i18n/autoTranslate";
import { startDomTranslator, stopDomTranslator } from "@/lib/i18n/domTranslator";
import { isSensitiveRoute } from "@/lib/i18n/sensitiveRoutes";

/**
 * Switches runtime machine translation off on sensitive routes and back on
 * elsewhere, as the visitor navigates. Static reviewed bundles (useT keys)
 * keep working everywhere; untranslated copy falls back to English.
 */
export const TranslationScope = () => {
  const { pathname } = useLocation();
  const { locale } = useI18nContext();
  const sensitive = isSensitiveRoute(pathname);

  useEffect(() => {
    setRuntimeTranslationAllowed(!sensitive);
    try {
      if (sensitive || locale === "en") stopDomTranslator();
      else startDomTranslator(locale);
    } catch {
      // DOM translation is best-effort; English remains readable.
    }
  }, [sensitive, locale]);

  return null;
};
