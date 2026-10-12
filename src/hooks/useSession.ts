import { useState, useEffect, useCallback } from 'react';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import type { User, Session } from '@supabase/supabase-js';
import { syncIdentity } from '@/lib/identity';
import { hasGuestData, setPendingGuestImport, type GuestCounts } from '@/lib/guestImport';

const SESSION_STORAGE_KEY = 'senseible_session_id';

// Every component calls useSession, so each mounts its own auth listener.
// This set makes sure one guest session is checked at most once per page load.
const guestChecksStarted = new Set<string>();

/** Forget this device's guest session, after its uploads were added to an account or declined. */
export function forgetGuestSession(sessionId: string) {
  try {
    if (localStorage.getItem(SESSION_STORAGE_KEY) === sessionId) localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch { /* storage blocked */ }
}

interface SessionState {
  sessionId: string | null;
  user: User | null;
  authSession: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Get device fingerprint for secure session validation
const getDeviceFingerprint = (): string => {
  return navigator.userAgent;
};

export function useSession() {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    user: null,
    authSession: null,
    isLoading: true,
    isAuthenticated: false
  });

  // Initialize or get existing anonymous session using secure RPC functions
  const initializeSession = useCallback(async () => {
    try {
      const supabase = await loadSupabase();
      // Check for authenticated user first
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        syncIdentity(authSession.user.id);
        setState({
          sessionId: null,
          user: authSession.user,
          authSession,
          isLoading: false,
          isAuthenticated: true
        });
        return;
      }

      syncIdentity(null);
      // Check for existing anonymous session
      let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      const fingerprint = getDeviceFingerprint();
      
      if (sessionId) {
        // Verify session exists and belongs to this device via secure RPC
        const { data: sessionData, error: sessionError } = await supabase
          .rpc('get_own_session', {
            session_uuid: sessionId,
            fingerprint: fingerprint
          });
        
        if (sessionError || !sessionData || sessionData.length === 0) {
          // Session doesn't exist or doesn't belong to this device
          sessionId = null;
          localStorage.removeItem(SESSION_STORAGE_KEY);
        } else {
          // Update session activity securely
          await supabase.rpc('update_session_activity', {
            session_uuid: sessionId,
            fingerprint: fingerprint
          });
        }
      }

      // Create new session if needed using secure RPC
      if (!sessionId) {
        const { data: newSessionId, error } = await supabase
          .rpc('create_secure_session', {
            fingerprint: fingerprint,
            ip_hash: null // Could add IP hashing for extra security
          });

        if (error) {
          console.error('[Session] Failed to create session:', error);
        } else if (newSessionId) {
          sessionId = newSessionId;
          localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
          console.log('[Session] Created new session:', sessionId.substring(0, 8) + '...');
        }
      }

      setState({
        sessionId,
        user: null,
        authSession: null,
        isLoading: false,
        isAuthenticated: false
      });
    } catch (error) {
      console.error('Session initialization error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Listen for auth changes
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    void loadSupabase().then(supabase => {
      if (cancelled) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          // A different account than the last one on this device: drop the
          // previous person's cached data before anything renders.
          syncIdentity(session.user.id);
          setState({
            sessionId: null,
            user: session.user,
            authSession: session,
            isLoading: false,
            isAuthenticated: true
          });

          // Guest uploads on this device are never adopted automatically. The
          // person who signed in is asked first (GuestImportPrompt).
          if (event === 'SIGNED_IN') {
            const anonSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
            if (anonSessionId && !guestChecksStarted.has(anonSessionId)) {
              guestChecksStarted.add(anonSessionId);
              setTimeout(() => { void previewGuestUploads(anonSessionId); }, 0);
            }
          }
        } else {
          syncIdentity(null);
          initializeSession();
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    });

    initializeSession();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [initializeSession]);

  // Ask the server what this device's guest session holds. Nothing moves here;
  // the person decides in GuestImportPrompt.
  const previewGuestUploads = async (sessionId: string) => {
    try {
      const deviceFingerprint = getDeviceFingerprint();
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke('merge-session', { body: { sessionId, deviceFingerprint } });
      if (error) { console.error('Guest upload check failed'); return; }
      const counts = data?.counts as GuestCounts | undefined;
      if (data?.preview && hasGuestData(counts)) {
        setPendingGuestImport({ sessionId, deviceFingerprint, counts });
      } else {
        // Empty, stale or already used: nothing to offer, so forget it.
        forgetGuestSession(sessionId);
      }
    } catch {
      console.error('Guest upload check failed');
    }
  };

  const signOut = async () => {
    const supabase = await loadSupabase();
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setPendingGuestImport(null);
    syncIdentity(null);
    initializeSession();
  };

  return {
    ...state,
    signOut,
    refreshSession: initializeSession
  };
}
