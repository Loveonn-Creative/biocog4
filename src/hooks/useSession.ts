import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

const SESSION_STORAGE_KEY = 'senseible_session_id';

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
      // Check for authenticated user first
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        console.log('[Session] Authenticated user:', authSession.user.id.substring(0, 8) + '...');
        setState({
          sessionId: null,
          user: authSession.user,
          authSession,
          isLoading: false,
          isAuthenticated: true
        });
        return;
      }

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setState({
          sessionId: null,
          user: session.user,
          authSession: session,
          isLoading: false,
          isAuthenticated: true
        });

        // Merge anonymous session data on login
        if (event === 'SIGNED_IN') {
          const anonSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
          if (anonSessionId) {
            setTimeout(() => {
              mergeAnonymousSession(anonSessionId, session.user.id);
            }, 0);
          }
        }
      } else {
        initializeSession();
      }
    });

    initializeSession();

    return () => subscription.unsubscribe();
  }, [initializeSession]);

  // Securely merge anonymous session data to user account via edge function
  const mergeAnonymousSession = async (sessionId: string, _userId: string) => {
    try {
      // Get device fingerprint for server-side validation
      const deviceFingerprint = getDeviceFingerprint();
      
      // Call secure server-side merge function
      const { data, error } = await supabase.functions.invoke('merge-session', {
        body: {
          sessionId,
          deviceFingerprint,
        },
      });

      if (error) {
        console.error('Session merge failed:', error);
        // Don't expose error details to prevent information leakage
        return;
      }

      if (data?.success) {
        // Clear anonymous session from storage only after successful merge
        localStorage.removeItem(SESSION_STORAGE_KEY);
        console.log('Session data merged securely:', data.merged);
      } else {
        console.error('Session merge returned unsuccessful');
      }
    } catch (error) {
      console.error('Failed to merge session:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    initializeSession();
  };

  return {
    ...state,
    signOut,
    refreshSession: initializeSession
  };
}
