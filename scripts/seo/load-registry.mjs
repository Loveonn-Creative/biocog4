// Bundles src/lib/seo/routeRegistry.ts (TypeScript, "@/" imports) with esbuild
// and imports it, so build scripts read the same data files as the app.
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');

const aliasPlugin = {
  name: 'alias-at',
  setup(b) {
    b.onResolve({ filter: /^@\// }, args =>
      b.resolve(`./${args.path.slice(2)}`, { resolveDir: SRC, kind: args.kind }));
  },
};

export async function loadRegistry() {
  const outDir = path.join(ROOT, 'node_modules', '.cache', 'seo');
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `registry-${process.pid}.mjs`);
  await build({
    entryPoints: [path.join(SRC, 'lib/seo/routeRegistry.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    packages: 'external',
    outfile,
    plugins: [aliasPlugin],
    logLevel: 'error',
  });
  try {
    return await import(pathToFileURL(outfile).href);
  } finally {
    fs.rmSync(outfile, { force: true });
  }
}
