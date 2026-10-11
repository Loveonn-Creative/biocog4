// Loads the Supabase client on first use instead of at startup, so the SDK
// (about 44 kB gzipped) stays out of the homepage's first-paint JavaScript.
// Modules on the homepage path import this; everything else can keep using
// "@/integrations/supabase/client" directly.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let clientPromise: Promise<SupabaseClient<Database>> | null = null;

export function loadSupabase(): Promise<SupabaseClient<Database>> {
  if (!clientPromise) clientPromise = import('./client').then(m => m.supabase);
  return clientPromise;
}
