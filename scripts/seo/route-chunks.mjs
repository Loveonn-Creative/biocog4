// Route → JavaScript chunks, from src/App.tsx and Vite's build manifest.
//
// A page's code is a lazy chunk, so on a direct visit the browser would only
// learn about it after the main bundle has run: one extra round trip before
// the page can render. The prerender writes these chunks as <link
// rel="modulepreload"> into each page's HTML so they download alongside the
// main bundle, and publishes the same map as /route-chunks.json for in-app
// prefetching (src/lib/routePrefetch.ts).

/** [{ pattern, module }] for every lazily loaded page route in App.tsx. */
export function routeModulesFromApp(appSource) {
  const lazies = new Map();
  for (const m of appSource.matchAll(/const (\w+) = lazy\(\(\) => import\("\.\/([^"]+)"\)\);/g)) {
    lazies.set(m[1], `src/${m[2]}`);
  }
  const out = [];
  for (const m of appSource.matchAll(/<Route path="([^"]+)" element=\{(.*?)\} \/>/g)) {
    const comp = [...m[2].matchAll(/<(\w+)/g)].map(x => x[1]).find(c => c !== 'RequireAuth');
    if (lazies.has(comp)) out.push({ pattern: m[1], module: lazies.get(comp) });
  }
  // Service pages are mapped from their nav list.
  const svc = appSource.match(/serviceNav\.map\(sp => <Route key=\{sp\.slug\} path=\{`\/\$\{sp\.slug\}`\} element=\{<(\w+) /);
  if (svc && lazies.has(svc[1])) out.push({ pattern: '/:service', module: lazies.get(svc[1]), service: true });
  return out;
}

// A page shared with another chunk is keyed by its chunk name ("_Pricing-hash.js")
// instead of its source path; fall back to the one dynamic entry of that name.
const moduleKey = (manifest, module) => {
  const bySrc = ['.tsx', '.ts', '.jsx', '.js'].map(ext => module + ext).find(k => manifest[k]);
  if (bySrc) return bySrc;
  const name = module.split('/').pop();
  const byName = Object.keys(manifest).filter(k => manifest[k].isDynamicEntry && manifest[k].name === name);
  return byName.length === 1 ? byName[0] : undefined;
};

/** Chunk files a module needs that the entry has not already loaded. */
export { moduleKey };

export function chunksFor(manifest, module) {
  const entryKey = Object.keys(manifest).find(k => manifest[k].isEntry);
  const closure = (key, seen = new Set()) => {
    if (!key || seen.has(key) || !manifest[key]) return seen;
    seen.add(key);
    for (const dep of manifest[key].imports ?? []) closure(dep, seen);
    return seen;
  };
  const loaded = closure(entryKey);
  const key = moduleKey(manifest, module);
  if (!key) return [];
  return [...closure(key)].filter(k => !loaded.has(k)).map(k => `/${manifest[k].file}`);
}

/** pattern → chunk list, for every page route. Service slugs are expanded. */
export function routeChunkMap(appSource, manifest, serviceSlugs = []) {
  const map = {};
  for (const r of routeModulesFromApp(appSource)) {
    const chunks = chunksFor(manifest, r.module);
    if (!chunks.length) continue;
    if (r.service) for (const slug of serviceSlugs) map[`/${slug}`] = chunks;
    else map[r.pattern] = chunks;
  }
  return map;
}

/** Chunk list for a concrete path: exact pattern first, then one with params. */
export function chunksForPath(map, pathname) {
  if (map[pathname]) return map[pathname];
  const parts = pathname.split('/');
  for (const [pattern, chunks] of Object.entries(map)) {
    const pp = pattern.split('/');
    if (pp.length === parts.length && pp.every((p, i) => p.startsWith(':') || p === parts[i])) return chunks;
  }
  return [];
}

/** Compact form for the browser: one list of files, routes as indexes into it. */
export function compactChunkMap(map) {
  const files = [...new Set(Object.values(map).flat())];
  const index = new Map(files.map((f, i) => [f, i]));
  const routes = Object.fromEntries(Object.entries(map).map(([p, list]) => [p, list.map(f => index.get(f))]));
  return { files, routes };
}
