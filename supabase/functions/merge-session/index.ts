import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequest {
  sessionId: string;
  deviceFingerprint: string;
  /** Must be true to move anything. Without it the function only reports counts. */
  confirm?: boolean;
}

// Tables holding guest rows, in the order they are moved. Each update is
// limited to rows still on this guest session with no owner, so a retry after
// a partial failure only moves what is left.
const GUEST_TABLES = ['documents', 'emissions', 'carbon_verifications', 'reports', 'chat_history', 'monetization_pathways'] as const;

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
    const { sessionId, deviceFingerprint, confirm }: MergeRequest = await req.json();

    if (!sessionId || !deviceFingerprint) {
      return new Response(
        JSON.stringify({ error: 'Session ID and device fingerprint required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Validate session ownership via device fingerprint
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, device_fingerprint, last_active, is_active')
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

    // A guest session that was already merged or ended is never reused.
    if (session.is_active === false) {
      return new Response(
        JSON.stringify({ success: true, merged: false, reason: 'session_closed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // What this guest session holds that has no owner yet. Only documents
    // with a result count: placeholders left by a failed read are not
    // invoices. A file this account already holds is not moved again, so
    // nothing is counted twice.
    const { data: guestDocs } = await supabaseAdmin.from('documents')
      .select('id, document_hash, cached_result').eq('session_id', sessionId).is('user_id', null);
    const realDocs = (guestDocs ?? []).filter((d: { cached_result: unknown }) => d.cached_result != null);
    const hashes = [...new Set(realDocs.map((d: { document_hash: string | null }) => d.document_hash).filter((h): h is string => !!h))];
    const { data: owned } = hashes.length
      ? await supabaseAdmin.from('documents').select('document_hash').eq('user_id', user.id).in('document_hash', hashes)
      : { data: [] as Array<{ document_hash: string }> };
    const ownedHashes = new Set((owned ?? []).map((d: { document_hash: string }) => d.document_hash));
    const moveDocIds = realDocs.filter((d: { document_hash: string | null }) => !d.document_hash || !ownedHashes.has(d.document_hash)).map((d: { id: string }) => d.id);
    const skipDocIds = (guestDocs ?? []).map((d: { id: string }) => d.id).filter((id: string) => !moveDocIds.includes(id));
    const [emissionCount, verificationCount, reportCount] = await Promise.all(
      ['emissions', 'carbon_verifications', 'reports'].map(t => {
        let q = supabaseAdmin.from(t).select('id', { count: 'exact', head: true }).eq('session_id', sessionId).is('user_id', null);
        if (t === 'emissions' && skipDocIds.length) q = q.or(`document_id.is.null,document_id.not.in.(${skipDocIds.join(',')})`);
        return q;
      }),
    );
    const counts = {
      documents: moveDocIds.length,
      emissions: emissionCount.count || 0,
      verifications: verificationCount.count || 0,
      reports: reportCount.count || 0,
    };

    // Nothing moves without the signed-in person's explicit confirmation.
    if (confirm !== true) {
      return new Response(
        JSON.stringify({ success: true, preview: true, counts, hashes: realDocs.filter((d: { id: string }) => moveDocIds.includes(d.id)).map((d: { document_hash: string | null }) => d.document_hash).filter(Boolean) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Move table by table and stop at the first error. The session stays open
    // on failure, so a retry moves exactly the rows that are left.
    for (const table of GUEST_TABLES) {
      let move = supabaseAdmin
        .from(table)
        .update({ user_id: user.id, session_id: null })
        .eq('session_id', sessionId)
        .is('user_id', null);
      // Placeholders and files the account already holds stay behind.
      if (table === 'documents') move = move.in('id', moveDocIds.length ? moveDocIds : ['00000000-0000-0000-0000-000000000000']);
      if (table === 'emissions' && skipDocIds.length) move = move.or(`document_id.is.null,document_id.not.in.(${skipDocIds.join(',')})`);
      const { error } = await move;
      if (error) {
        console.error('Merge failed at', table, error.code);
        await supabaseAdmin.from('security_audit_log').insert({
          event_type: 'session_merge_failed',
          user_id: user.id,
          session_id: sessionId,
          details: { table, code: error.code ?? null },
        });
        return new Response(
          JSON.stringify({ success: false, error: 'Could not add these uploads right now. Try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // End the guest session so nothing uploaded on this device later can be
    // merged into this (or any other) account.
    await supabaseAdmin.from('sessions').update({ is_active: false }).eq('id', sessionId);

    await supabaseAdmin.from('security_audit_log').insert({
      event_type: 'SESSION_MERGE_SUCCESS',
      user_id: user.id,
      session_id: sessionId,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
      user_agent: req.headers.get('user-agent'),
      details: { merged_counts: counts, confirmed_by_user: true },
    });

    return new Response(
      JSON.stringify({ success: true, merged: counts }),
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
