import { FUNCTION_VERSIONS } from './functionVersions.generated.ts';

// GET /functions/v1/<name>?__version answers which source this deployment was
// built from (scripts/function-versions.mjs). Only that exact request is
// answered here; every other request goes to the function unchanged. The reply
// carries a hash of public code and nothing else.
export function versionProbe(req: Request, name: string): Response | null {
  if (req.method !== 'GET') return null;
  if (!new URL(req.url).searchParams.has('__version')) return null;
  return new Response(JSON.stringify({ function: name, version: FUNCTION_VERSIONS[name] ?? 'unknown' }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
  });
}
