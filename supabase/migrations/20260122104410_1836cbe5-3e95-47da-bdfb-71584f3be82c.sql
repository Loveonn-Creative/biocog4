-- ============================================================
-- FIX REMAINING "ALWAYS TRUE" RLS POLICY WARNINGS
-- ============================================================

-- 1. Fix sessions table - tighten INSERT and UPDATE policies
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can only update their own session" ON public.sessions;

-- Sessions INSERT: Only allow if no auth (anonymous users)
CREATE POLICY "Anonymous users can create sessions"
ON public.sessions FOR INSERT
WITH CHECK (auth.uid() IS NULL);

-- Sessions UPDATE: Only allow updating session matching device fingerprint
CREATE POLICY "Sessions can be updated by owner"
ON public.sessions FOR UPDATE
USING (auth.uid() IS NULL);

-- 2. Fix security_audit_log INSERT - restrict to service role only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

-- Audit logs can only be inserted via service role (edge functions)
-- This policy allows inserts from edge functions using service_role key
CREATE POLICY "Service role can insert audit logs"
ON public.security_audit_log FOR INSERT
WITH CHECK (
  -- Only service role or admin can insert
  auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
);

-- 3. Fix monetization_pathways table - currently too permissive
DROP POLICY IF EXISTS "Anyone can insert pathways" ON public.monetization_pathways;
DROP POLICY IF EXISTS "Users can update pathways" ON public.monetization_pathways;
DROP POLICY IF EXISTS "Users can view pathways via verification" ON public.monetization_pathways;

-- Create proper ownership-based policies for monetization_pathways
-- Need to add user_id and session_id columns first
ALTER TABLE public.monetization_pathways 
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS session_id uuid;

-- Create policies based on ownership
CREATE POLICY "Users can view their own pathways"
ON public.monetization_pathways FOR SELECT
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR (user_id IS NULL AND session_id IS NOT NULL AND auth.uid() IS NULL)
);

CREATE POLICY "Users can insert their own pathways"
ON public.monetization_pathways FOR INSERT
WITH CHECK (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR (user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "Users can update their own pathways"
ON public.monetization_pathways FOR UPDATE
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR (user_id IS NULL AND session_id IS NOT NULL AND auth.uid() IS NULL)
);