// Real-time voice (ElevenLabs) session tokens. Pro and Scale only, within a
// monthly session cap (_shared/intelligence.ts). Each session's length is
// capped by the ElevenLabs agent's "maximum conversation duration", which must
// match VOICE_SESSION_MAX_MINUTES.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { accessFor, VOICE_SESSION_MAX_MINUTES, voiceSessionsPerMonth } from "../_shared/intelligence.ts";
import { planForUser, takeUse } from "../_shared/intelligenceUsage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============= AUTHENTICATION =============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub as string | undefined;
    if (authError || !userId) return json({ error: 'Unauthorized' }, 401);

    // ============= PLAN AND MONTHLY CAP =============
    const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const plan = await planForUser(admin, userId);
    if (!accessFor(plan).voice) return json({ error: 'plan', message: 'Real-time voice is part of Pro and Scale.' }, 403);

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID');
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) return json({ error: 'Voice AI not configured' }, 500);

    const sessions = voiceSessionsPerMonth(plan);
    const take = await takeUse(admin, `u:${userId}`, 'voice_session', sessions);
    if (!take.allowed) {
      return json({ error: 'voice_limit', message: `You have used this month's ${sessions} voice sessions. They reset on the 1st.`, sessionsPerMonth: sessions }, 429);
    }

    // Always use the server-configured agent — never trust client overrides.
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(ELEVENLABS_AGENT_ID)}`,
      { method: 'GET', headers: { 'xi-api-key': ELEVENLABS_API_KEY } }
    );

    if (!response.ok) {
      console.error('ElevenLabs token error status:', response.status);
      return json({ error: 'Failed to get voice token' }, 502);
    }

    const data = await response.json();
    return json({ token: data.token, sessionsLeft: Math.max(0, sessions - take.used), sessionMaxMinutes: VOICE_SESSION_MAX_MINUTES });
  } catch (error) {
    console.error('Voice token error:', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Internal error' }, 500);
  }
});
