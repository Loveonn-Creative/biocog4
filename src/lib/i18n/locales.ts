// Single source of truth for the locales the platform can render.
// Display metadata (native name, region, speech code) comes from
// src/lib/languages.ts so the nav quick-switch, Settings and the Voice AI
// all describe the same set.

import { SUPPORTED_LANGUAGES, REGION_LABELS, type Language } from '@/lib/languages';

/** Locales the translation engine supports (static JSON or runtime auto-translate). */
export const SUPPORTED_LOCALES = [
  'en', 'hi', 'bn', 'ta', 'mr', 'te', 'gu', 'pa', 'ml', 'kn', 'ur',
  'id', 'tl', 'vi', 'th', 'zh', 'ar', 'es', 'pt',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(code: string | null | undefined): code is SupportedLocale {
  return !!code && (SUPPORTED_LOCALES as readonly string[]).includes(code);
}

// Locales that have display metadata only here (not in SUPPORTED_LANGUAGES)
const EXTRA_META: Record<string, Language> = {
  gu: { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'india', speechCode: 'gu-IN', flag: '🇮🇳' },
  ml: { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'india', speechCode: 'ml-IN', flag: '🇮🇳' },
  kn: { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'india', speechCode: 'kn-IN', flag: '🇮🇳' },
  th: { code: 'th', name: 'Thai', nativeName: 'ไทย', region: 'asia', speechCode: 'th-TH', flag: '🇹🇭' },
};

export function getLocaleMeta(code: string): Language {
  return (
    SUPPORTED_LANGUAGES.find(l => l.code === code) ||
    EXTRA_META[code] || {
      code,
      name: code.toUpperCase(),
      nativeName: code.toUpperCase(),
      region: 'asia',
      speechCode: code,
      flag: '🌐',
    }
  );
}

/** Supported locales grouped by region, ready for a Settings picker. */
export function getLocalesByRegion(): { region: Language['region']; label: string; locales: Language[] }[] {
  const groups = new Map<Language['region'], Language[]>();
  for (const code of SUPPORTED_LOCALES) {
    const meta = getLocaleMeta(code);
    const list = groups.get(meta.region) || [];
    list.push(meta);
    groups.set(meta.region, list);
  }
  const order: Language['region'][] = ['india', 'asia', 'middle-east', 'africa', 'europe', 'americas'];
  return order
    .filter(r => groups.has(r))
    .map(r => ({ region: r, label: REGION_LABELS[r], locales: groups.get(r)! }));
}
