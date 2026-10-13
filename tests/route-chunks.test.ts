import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
// @ts-expect-error plain .mjs build helper
import { routeModulesFromApp, chunksFor, routeChunkMap, chunksForPath as buildChunksForPath, compactChunkMap } from '../scripts/seo/route-chunks.mjs';
import { chunksForPath } from '../src/lib/routePrefetch';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf-8');

describe('route → page module, read from App.tsx', () => {
  const routes = routeModulesFromApp(app) as { pattern: string; module: string; service?: boolean }[];
  test('every lazily loaded route is found, with its module', () => {
    const lazyRoutes = [...app.matchAll(/<Route path="([^"]+)" element=\{(.*?)\} \/>/g)].filter(m => !/<Index /.test(m[2]));
    expect(routes.filter(r => !r.service).length).toBe(lazyRoutes.length);
    expect(routes).toContainEqual({ pattern: '/pricing', module: 'src/pages/Pricing' });
    expect(routes).toContainEqual({ pattern: '/dashboard', module: 'src/pages/Dashboard' });
    expect(routes).toContainEqual({ pattern: '/climate-intelligence/:slug', module: 'src/pages/CMSArticle' });
    expect(routes.find(r => r.service)?.module).toBe('src/pages/ServicePage');
  });
});

describe('chunks a page needs beyond the main bundle', () => {
  const manifest = {
    'index.html': { file: 'assets/index.js', isEntry: true, imports: ['_vendor.js'] },
    '_vendor.js': { file: 'assets/vendor.js' },
    'src/pages/Pricing.tsx': { file: 'assets/Pricing.js', isDynamicEntry: true, imports: ['_vendor.js', '_client.js'] },
    '_client.js': { file: 'assets/client.js', imports: ['_vendor.js'] },
    '_ServicePage-x.js': { file: 'assets/ServicePage.js', name: 'ServicePage', isDynamicEntry: true, imports: ['_client.js'] },
  };
  test('includes the page and its static imports, never what the entry already loaded', () => {
    expect(chunksFor(manifest, 'src/pages/Pricing')).toEqual(['/assets/Pricing.js', '/assets/client.js']);
  });
  test('falls back to the chunk name for a shared page module', () => {
    expect(chunksFor(manifest, 'src/pages/ServicePage')).toEqual(['/assets/ServicePage.js', '/assets/client.js']);
  });
  test('the browser reads the compact map the same way the build does', () => {
    const map = routeChunkMap(app, manifest, ['carbon-accounting']);
    const compact = compactChunkMap(map);
    for (const path of ['/pricing', '/carbon-accounting', '/nope']) {
      expect(chunksForPath(compact, path)).toEqual(buildChunksForPath(map, path));
    }
    expect(chunksForPath(compact, '/pricing')).toEqual(['/assets/Pricing.js', '/assets/client.js']);
    expect(chunksForPath({ files: ['/a.js'], routes: { '/legal/:slug': [0] } }, '/legal/terms')).toEqual(['/a.js']);
    expect(chunksForPath({ files: ['/a.js'], routes: { '/legal/:slug': [0] } }, '/legal/terms/x')).toEqual([]);
  });
});
