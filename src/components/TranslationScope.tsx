import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useI18nContext } from "@/lib/i18n/LanguageProvider";
import { setRuntimeTranslationAllowed } from "@/lib/i18n/autoTranslate";
import { startDomTranslator, stopDomTranslator } from "@/lib/i18n/domTranslator";
import { isSensitiveRoute } from "@/lib/i18n/sensitiveRoutes";
import { installPackPrefetch, loadRoutePack } from "@/lib/i18n/packs";

/**
 * Switches runtime machine translation off on sensitive routes and back on
 * elsewhere, as the visitor navigates. Static reviewed bundles (useT keys)
 * keep working everywhere; untranslated copy falls back to English.
 * On public pages it also loads the page's static translation pack, so a
 * language switch or page change shows translated text on the first walk.
 */
export const TranslationScope = () => {
  const { pathname } = useLocation();
  const { locale } = useI18nContext();
  const sensitive = isSensitiveRoute(pathname);
  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => installPackPrefetch(() => localeRef.current), []);

  useEffect(() => {
    setRuntimeTranslationAllowed(!sensitive);
    try {
      if (sensitive || locale === "en") stopDomTranslator();
      else {
        // Seeds the cache as soon as the pack arrives; runtime misses wait for it.
        void loadRoutePack(locale, pathname);
        startDomTranslator(locale);
      }
    } catch {
      // DOM translation is best-effort; English remains readable.
    }
  }, [sensitive, locale, pathname]);

  return null;
};
