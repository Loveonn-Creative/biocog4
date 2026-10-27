// import-records: saves checked spreadsheet bill rows as records for a
// signed-in user. The logic is in handler.ts (tested directly); this file
// only wires the HTTP server and the database client.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { versionProbe } from "../_shared/versionProbe.ts";
import { corsHeaders, handleImportRecords } from "./handler.ts";

serve(async (req) => {
  const probe = versionProbe(req, "import-records");
  if (probe) return probe;
  try {
    return await handleImportRecords(req, {
      env: (k) => Deno.env.get(k),
      makeClient: (url, key) => createClient(url, key),
    });
  } catch (error) {
    console.error('import-records failed:', error instanceof Error ? error.name : 'error');
    return new Response(JSON.stringify({ error: 'Something went wrong while saving. Nothing more was saved; try again.', code: 'internal' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
