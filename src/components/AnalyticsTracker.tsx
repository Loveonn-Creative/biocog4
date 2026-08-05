import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, trackPageView } from '@/lib/analytics';

/**
 * Initialises Google Analytics once and reports a page view for every
 * client-side route change (SPA navigations are not auto-tracked by gtag).
 */
export const AnalyticsTracker = () => {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const path = location.pathname + location.search;
    if (lastPath.current === path) return;
    lastPath.current = path;
    // Let the route's <Helmet> title settle before reporting.
    const id = window.setTimeout(() => trackPageView(path), 60);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.search]);

  return null;
};
