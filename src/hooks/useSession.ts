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

export function useSession() {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    user: null,
    authSession: null,
    isLoading: true,
    isAuthenticated: false
  });

  // Initialize or get existing anonymous session
  const initializeSession = useCallback(async () => {
    try {
      // Check for authenticated user first
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
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
      
      if (sessionId) {
        // Verify session exists in DB
        const { data: existingSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('id', sessionId)
          .single();
        
        if (!existingSession) {
          sessionId = null;
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }

      // Create new session if needed
      if (!sessionId) {
        const { data: newSession, error } = await supabase
          .from('sessions')
          .insert({ device_fingerprint: navigator.userAgent })
          .select()
          .single();

        if (error) {
          console.error('Failed to create session:', error);
        } else {
          sessionId = newSession.id;
          localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        }
      } else {
        // Update last_active for existing session
        await supabase
          .from('sessions')
          .update({ last_active: new Date().toISOString() })
          .eq('id', sessionId);
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

  // Merge anonymous session data to user account
  const mergeAnonymousSession = async (sessionId: string, userId: string) => {
    try {
      // Update documents
      await supabase
        .from('documents')
        .update({ user_id: userId })
        .eq('session_id', sessionId);

      // Update emissions
      await supabase
        .from('emissions')
        .update({ user_id: userId })
        .eq('session_id', sessionId);

      // Update verifications
      await supabase
        .from('carbon_verifications')
        .update({ user_id: userId })
        .eq('session_id', sessionId);

      // Update reports
      await supabase
        .from('reports')
        .update({ user_id: userId })
        .eq('session_id', sessionId);

      // Clear anonymous session from storage
      localStorage.removeItem(SESSION_STORAGE_KEY);
      console.log('Session data merged to user account');
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
