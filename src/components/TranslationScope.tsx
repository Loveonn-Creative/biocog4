import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18nContext } from "@/lib/i18n/LanguageProvider";
import { setRuntimeTranslationAllowed } from "@/lib/i18n/autoTranslate";
import { startDomTranslator, stopDomTranslator } from "@/lib/i18n/domTranslator";
import { isSensitiveRoute } from "@/lib/i18n/sensitiveRoutes";
import { loadPacks } from "@/lib/i18n/packs";

/**
 * Switches runtime machine translation off on sensitive routes and back on
 * elsewhere, as the visitor navigates. Static reviewed bundles (useT keys)
 * keep working everywhere; untranslated copy falls back to English.
 * On public routes it seeds the page's prebuilt language pack first, so text
 * swaps without waiting on the network.
 */
export const TranslationScope = () => {
  const { pathname } = useLocation();
  const { locale } = useI18nContext();
  const sensitive = isSensitiveRoute(pathname);

  // Runs before the translator effect below, so the pack is on its way
  // (and runtime requests are held for it) before the first DOM walk.
  useEffect(() => {
    void loadPacks(locale, pathname);
  }, [pathname, locale]);

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
