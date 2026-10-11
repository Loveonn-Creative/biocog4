import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequest {
  sessionId: string;
  deviceFingerprint: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header to verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client for user auth verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client for data operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { sessionId, deviceFingerprint }: MergeRequest = await req.json();

    if (!sessionId || !deviceFingerprint) {
      return new Response(
        JSON.stringify({ error: 'Session ID and device fingerprint required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Validate session ownership via device fingerprint
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, device_fingerprint, last_active')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionId);
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify device fingerprint matches
    if (session.device_fingerprint !== deviceFingerprint) {
      // Log potential attack attempt
      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'SESSION_MERGE_FINGERPRINT_MISMATCH',
        user_id: user.id,
        session_id: sessionId,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        user_agent: req.headers.get('user-agent'),
        details: {
          expected_fingerprint: session.device_fingerprint?.substring(0, 50) + '...',
          provided_fingerprint: deviceFingerprint?.substring(0, 50) + '...',
        },
      });

      return new Response(
        JSON.stringify({ error: 'Session ownership verification failed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only a guest session used recently on this device is merged. A session
    // left idle (for example by a previous visitor on a shared computer) is
    // never attached to whoever signs in next.
    const MERGE_WINDOW_MS = 24 * 60 * 60 * 1000;
    const lastActive = session.last_active ? new Date(session.last_active).getTime() : 0;
    if (!lastActive || Date.now() - lastActive > MERGE_WINDOW_MS) {
      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'session_merge_skipped_stale',
        user_id: user.id,
        session_id: sessionId,
        details: { last_active: session.last_active ?? null },
      });
      return new Response(
        JSON.stringify({ success: true, merged: false, reason: 'stale_session' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count data to be merged
    const [docCount, emissionCount, verificationCount, reportCount] = await Promise.all([
      supabaseAdmin.from('documents').select('id', { count: 'exact' }).eq('session_id', sessionId),
      supabaseAdmin.from('emissions').select('id', { count: 'exact' }).eq('session_id', sessionId),
      supabaseAdmin.from('carbon_verifications').select('id', { count: 'exact' }).eq('session_id', sessionId),
      supabaseAdmin.from('reports').select('id', { count: 'exact' }).eq('session_id', sessionId),
    ]);

    const mergeStats = {
      documents: docCount.count || 0,
      emissions: emissionCount.count || 0,
      verifications: verificationCount.count || 0,
      reports: reportCount.count || 0,
    };

    // Perform the merge operations using service role
    const mergeResults = await Promise.all([
      supabaseAdmin
        .from('documents')
        .update({ user_id: user.id, session_id: null })
        .eq('session_id', sessionId)
        .is('user_id', null),
      supabaseAdmin
        .from('emissions')
        .update({ user_id: user.id, session_id: null })
        .eq('session_id', sessionId)
        .is('user_id', null),
      supabaseAdmin
        .from('carbon_verifications')
        .update({ user_id: user.id, session_id: null })
        .eq('session_id', sessionId)
        .is('user_id', null),
      supabaseAdmin
        .from('reports')
        .update({ user_id: user.id, session_id: null })
        .eq('session_id', sessionId)
        .is('user_id', null),
      supabaseAdmin
        .from('chat_history')
        .update({ user_id: user.id, session_id: null })
        .eq('session_id', sessionId)
        .is('user_id', null),
      supabaseAdmin
        .from('monetization_pathways')
        .update({ user_id: user.id, session_id: null })
        .eq('session_id', sessionId)
        .is('user_id', null),
    ]);

    // Check for errors
    const errors = mergeResults.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Merge errors:', errors.map(e => e.error));
    }

    // End the guest session so nothing uploaded on this device later can be
    // merged into this (or any other) account.
    await supabaseAdmin.from('sessions').update({ is_active: false }).eq('id', sessionId);

    // Log successful merge
    await supabaseAdmin.from('security_audit_log').insert({
      event_type: 'SESSION_MERGE_SUCCESS',
      user_id: user.id,
      session_id: sessionId,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
      user_agent: req.headers.get('user-agent'),
      details: {
        merged_counts: mergeStats,
        errors_count: errors.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        merged: mergeStats,
        message: 'Session data merged successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Session merge error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
