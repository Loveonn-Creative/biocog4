// Closest real pages for a mistyped address or a typed question, used by the
// 404 page. Spelling distance on the path, plus words shared with the path
// and title; typed questions lean on shared words.

export interface RouteEntry { p: string; t: string }
export interface RouteMatch { route: RouteEntry; dist: number; score: number }

export const normalisePath = (s: string) =>
  s.toLowerCase().replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);

export function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 12) return 99;
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return d[b.length];
}

export function closestRoutes(input: string, routes: RouteEntry[], n = 3, byWords = false): RouteMatch[] {
  const a = normalisePath(byWords ? input.trim().replace(/\s+/g, '-') : input);
  const aw = words(a);
  return routes
    .map((route) => {
      const dist = editDistance(a, route.p);
      const sim = 1 - Math.min(dist, Math.max(a.length, route.p.length)) / Math.max(a.length, route.p.length, 1);
      const rw = new Set(words(`${route.p} ${route.t}`));
      const hit = aw.filter((w) => rw.has(w) || (w.length > 3 && [...rw].some((x) => x.startsWith(w)))).length;
      const score = byWords ? hit * 3 + sim : sim * 2 + (aw.length ? hit / aw.length : 0) * 1.5;
      return { route, dist, score };
    })
    .filter((m) => m.route.p !== a)
    .sort((x, y) => y.score - x.score)
    .slice(0, n);
}
