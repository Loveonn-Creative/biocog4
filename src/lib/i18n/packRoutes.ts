// Which pages get a static translation pack, and the pack file name for each.
// Shared by the client (packs.ts) and scripts/i18n/build-packs.mjs.

import { isSensitiveRoute } from "./sensitiveRoutes";

/** File name for a route: "/" -> "index", "/vs/plan-a" -> "vs__plan-a". */
export function routeKey(pathname: string): string {
  let p = (pathname || "/").split(/[?#]/)[0];
  try { p = decodeURIComponent(p); } catch { /* keep as is */ }
  p = p.replace(/\/+$/, "") || "/";
  if (p === "/") return "index";
  return p.slice(1).toLowerCase().replace(/[^a-z0-9-]+/g, "__");
}

/**
 * Public pages that get a pack: not sensitive (those never use runtime
 * translation), not the static Hindi and German editions, and not the
 * individual answer pages (the /answers hub itself is included).
 */
export function isPackRoute(pathname: string): boolean {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";
  if (isSensitiveRoute(p)) return false;
  if (/^\/(hi|de)(\/|$)/.test(p)) return false;
  if (p.startsWith("/answers/")) return false;
  return true;
}
