import { trackEvent } from "@/lib/analytics";

/** Funnel events. Never pass personal data or free text. */
export const leadEvents = {
  view: (page: string) => trackEvent("lead_magnet_view", { page }),
  engage: (page: string) => trackEvent("lead_magnet_engage", { page }),
  result: (page: string, params: Record<string, string | number>) => trackEvent("lead_magnet_result", { page, ...params }),
  cta: (page: string, cta: string) => trackEvent("lead_magnet_cta", { page, cta }),
  submit: (page: string, params: Record<string, string | number>) => trackEvent("lead_magnet_submit", { page, ...params }),
};

export const fmtInt = (n: number) => n.toLocaleString("en-IN");
