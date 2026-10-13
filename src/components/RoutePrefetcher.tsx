import { useEffect } from "react";
import { installRoutePrefetch } from "@/lib/routePrefetch";

// Pages a signed-in person moves between most; fetched once the first page is idle.
const APP_PATHS = ["/dashboard", "/history", "/verify", "/reports", "/mrv-dashboard", "/monetize"];
const PUBLIC_PATHS = ["/auth", "/pricing"];

// A stored sign-in is enough to guess which pages come next; this avoids
// loading the Supabase client on public pages just to decide what to prefetch.
const hasStoredSession = () => {
  try {
    return Object.keys(localStorage).some(k => /^sb-.+-auth-token$/.test(k));
  } catch {
    return false;
  }
};

export const RoutePrefetcher = () => {
  useEffect(() => installRoutePrefetch(() => (hasStoredSession() ? APP_PATHS : PUBLIC_PATHS)), []);
  return null;
};
