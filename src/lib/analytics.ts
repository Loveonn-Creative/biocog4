// Google Analytics (GA4) — single initialisation + SPA page-view tracking.
// Measurement ID comes from the linked Google Analytics connector, with the
// project's production property as a fallback.

const MEASUREMENT_ID =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined) ||
  'G-7DJ1WVE5R3';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

let initialized = false;

export function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function initAnalytics() {
  if (initialized || typeof window === 'undefined' || !MEASUREMENT_ID) return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  gtag('js', new Date());
  // Page views are sent manually so client-side route changes are captured.
  gtag('config', MEASUREMENT_ID, { send_page_view: false });
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

export const ANALYTICS_MEASUREMENT_ID = MEASUREMENT_ID;
