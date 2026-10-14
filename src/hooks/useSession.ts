import { useState, useEffect, useCallback } from 'react';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import type { User, Session } from '@supabase/supabase-js';
import { syncIdentity } from '@/lib/identity';
import { hasGuestData, setPendingGuestImport, type GuestCounts } from '@/lib/guestImport';

const SESSION_STORAGE_KEY = 'senseible_session_id';
const GUEST_TIMEOUT_MS = 8000;

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

// Every component calls useSession. Without sharing, each one ran its own
// session check, so a new visitor got one guest session per component (40+
// rows, with parts of the page holding different session ids). One check is
// shared per page load and replaced only when the person signs in or out.
let sharedSession: Promise<SessionState> | null = null;
/** Whether the shared state is a signed-in one (known synchronously, for sign-out). */
let sharedIsAuthenticated = false;

async function resolveSession(): Promise<SessionState> {
  try {
    const supabase = await loadSupabase();
    // Check for authenticated user first
    const { data: { session: authSession } } = await supabase.auth.getSession();
    
    if (authSession?.user) {
      syncIdentity(authSession.user.id);
      return {
        sessionId: null,
        user: authSession.user,
        authSession,
        isLoading: false,
        isAuthenticated: true
      };
    }

    syncIdentity(null);
    // A slow or unreachable guest-session service must not hold every page on
    // a spinner. After GUEST_TIMEOUT_MS the page continues signed out with the
    // id this device already holds (if any); the check finishes in the
    // background and a new id, if one is created, is used on the next visit.
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    const timedOut = new Promise<SessionState>(resolve => setTimeout(() => resolve({
      sessionId: stored, user: null, authSession: null, isLoading: false, isAuthenticated: false,
    }), GUEST_TIMEOUT_MS));
    return await Promise.race([resolveGuestSession(supabase), timedOut]);
  } catch (error) {
    console.error('Session initialization error:', error);
    return { sessionId: null, user: null, authSession: null, isLoading: false, isAuthenticated: false };
  }
}

async function resolveGuestSession(supabase: Awaited<ReturnType<typeof loadSupabase>>): Promise<SessionState> {
  try {
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
      }
    }

    return {
      sessionId,
      user: null,
      authSession: null,
      isLoading: false,
      isAuthenticated: false
    };
  } catch (error) {
    console.error('Session initialization error:', error);
    return { sessionId: null, user: null, authSession: null, isLoading: false, isAuthenticated: false };
  }
}

/**
 * Signed in or not, known as soon as the stored sign-in is read. Unlike
 * useSession it never waits for the guest session, so route guards can
 * redirect a signed-out visitor at once.
 */
export function useAuthStatus(): 'loading' | 'signedIn' | 'signedOut' {
  const [status, setStatus] = useState<'loading' | 'signedIn' | 'signedOut'>(sharedIsAuthenticated ? 'signedIn' : 'loading');
  useEffect(() => {
    let live = true;
    let unsubscribe: (() => void) | null = null;
    loadSupabase().then(supabase => {
      if (!live) return;
      // Fires INITIAL_SESSION once the stored session is read (and refreshed if
      // it had expired), then on every sign-in and sign-out.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (live) setStatus(session?.user ? 'signedIn' : 'signedOut');
      });
      unsubscribe = () => subscription.unsubscribe();
    }).catch(err => {
      // The client code did not load (usually a new deploy): let the error
      // boundary reload or say so, rather than guessing the visitor is signed out.
      if (live) setStatus(() => { throw err; });
    });
    return () => { live = false; unsubscribe?.(); };
  }, []);
  return status;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    user: null,
    authSession: null,
    isLoading: true,
    isAuthenticated: false
  });

  // One shared session check (see resolveSession).
  const initializeSession = useCallback(async () => {
    if (!sharedSession) {
      sharedSession = resolveSession().then((s) => { sharedIsAuthenticated = s.isAuthenticated; return s; });
    }
    const resolved = await sharedSession;
    setState(resolved);
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
          const signedIn: SessionState = {
            sessionId: null,
            user: session.user,
            authSession: session,
            isLoading: false,
            isAuthenticated: true
          };
          sharedSession = Promise.resolve(signedIn);
          sharedIsAuthenticated = true;
          setState(signedIn);

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
          // Signed out: drop the shared signed-in state so one fresh guest check runs.
          if (sharedIsAuthenticated) { sharedSession = null; sharedIsAuthenticated = false; }
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
    const deviceFingerprint = getDeviceFingerprint();
    // Results kept in this browser (guest uploads are no longer stored on the server).
    const { listGuestResults } = await import('@/lib/guestResults');
    const localInvoices = (await listGuestResults().catch(() => [])).length;
    let counts: GuestCounts = { documents: 0, emissions: 0, verifications: 0, reports: 0 };
    try {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke('merge-session', { body: { sessionId, deviceFingerprint } });
      if (error) console.error('Guest upload check failed');
      else if (data?.preview && hasGuestData(data?.counts as GuestCounts | undefined)) counts = data.counts as GuestCounts;
    } catch {
      console.error('Guest upload check failed');
    }
    if (hasGuestData(counts) || localInvoices > 0) {
      setPendingGuestImport({ sessionId, deviceFingerprint, counts, localInvoices });
    } else {
      // Empty, stale or already used: nothing to offer, so forget it.
      forgetGuestSession(sessionId);
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
