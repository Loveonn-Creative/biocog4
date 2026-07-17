// Locale-aware wrapper around sonner. Translates the message using the active
// locale before showing the toast, so any call site becomes multilingual with
// zero code changes beyond swapping the import.
//
//   import { toast } from "@/lib/i18n/toast";
//   toast.success("Saved");

import { toast as sonner, type ExternalToast } from "sonner";
import { translateSync } from "./autoTranslate";

function currentLocale(): string {
  try {
    return localStorage.getItem("senseible_locale") || "en";
  } catch {
    return "en";
  }
}

function tr(msg: string | number | React.ReactNode): any {
  if (typeof msg !== "string") return msg;
  return translateSync(currentLocale(), msg);
}

function wrap(kind: "success" | "error" | "info" | "warning" | "message") {
  return (msg: any, opts?: ExternalToast) => {
    const translated = tr(msg);
    // sonner types: message accepts string or node
    return (sonner as any)[kind](translated, opts);
  };
}

export const toast = Object.assign(
  (msg: any, opts?: ExternalToast) => sonner(tr(msg), opts),
  {
    success: wrap("success"),
    error: wrap("error"),
    info: wrap("info"),
    warning: wrap("warning"),
    message: wrap("message"),
    loading: (msg: any, opts?: ExternalToast) => sonner.loading(tr(msg), opts),
    promise: sonner.promise.bind(sonner),
    dismiss: sonner.dismiss.bind(sonner),
    custom: sonner.custom.bind(sonner),
  }
);

export type { ExternalToast };
