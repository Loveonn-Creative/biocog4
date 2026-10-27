// Speech code for the site language. Kept apart from the voice helpers so the
// home page can read it without loading the answer code up front.

import { getLocaleMeta } from "@/lib/i18n/locales";

/** Speech code for the site language ("hi" -> "hi-IN"); Indian English when unknown. */
export function speechLangFor(locale: string | null | undefined): string {
  const code = (locale || "en").trim() || "en";
  const speech = getLocaleMeta(code)?.speechCode;
  return speech && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(speech) ? speech : "en-IN";
}
