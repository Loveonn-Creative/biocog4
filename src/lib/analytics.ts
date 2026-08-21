// Google Analytics (GA4) — single initialisation + SPA page-view tracking.
// Measurement ID comes from the linked Google Analytics connector, with the
// project's production property as a fallback.
//
// IMPORTANT: gtag.js only processes entries pushed to dataLayer as the
// `arguments` object. Pushing a plain Array silently does nothing (the tag
// loads but never sends a hit), so the helper below must keep using
// `arguments`.

const MEASUREMENT_ID =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined) ||
  'G-7DJ1WVE5R3';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function gtag(..._args: unknown[]) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

export function initAnalytics() {
  if (initialized || typeof window === 'undefined' || !MEASUREMENT_ID) return;
  initialized = true;

  // The tag is normally bootstrapped from index.html. Only inject it if that
  // snippet is missing (e.g. a stale cached document).
  const alreadyLoaded = !!document.querySelector(
    'script[src*="googletagmanager.com/gtag/js"]'
  );

  if (!alreadyLoaded) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);

    gtag('js', new Date());
    // Page views are sent manually so client-side route changes are captured.
    gtag('config', MEASUREMENT_ID, { send_page_view: false });
  }
}

export function trackPageView(path: string, title?: string) {
  if (!MEASUREMENT_ID) return;
  gtag('event', 'page_view', {
    page_path: path,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    page_title: title ?? (typeof document !== 'undefined' ? document.title : undefined),
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!MEASUREMENT_ID) return;
  gtag('event', name, params ?? {});
}

/* ------------------------------------------------------------------ */
/* Typed helpers for key product actions.                              */
/* No PII is ever sent: no email, business name, GSTIN or document     */
/* hash may be passed as an event parameter.                           */
/* ------------------------------------------------------------------ */

export const analyticsEvents = {
  signUp: (method: string, contextType?: string) =>
    trackEvent('sign_up', { method, context_type: contextType ?? 'msme' }),

  login: (method: string) => trackEvent('login', { method }),

  passwordResetComplete: () => trackEvent('password_reset_complete'),

  calculatorRunStart: (calculator: string, country?: string) =>
    trackEvent('calculator_run_start', { calculator, country: country ?? 'unknown' }),

  calculatorExport: (calculator: string, format: string) =>
    trackEvent('calculator_export', { calculator, format }),

  reportExport: (framework: string, format: string) =>
    trackEvent('report_export', { framework, format }),

  documentUpload: (source: string, count = 1) =>
    trackEvent('document_upload', { source, count }),

  mrvVerifyComplete: (outcome: string) =>
    trackEvent('mrv_verify_complete', { outcome }),
};

export const ANALYTICS_MEASUREMENT_ID = MEASUREMENT_ID;
