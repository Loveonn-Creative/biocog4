-- ============================================================
-- FINAL SECURITY FIX: Strengthen session isolation
-- ============================================================

-- 1. Fix sessions table - completely restrict reading to only own session
DROP POLICY IF EXISTS "Users can only read their own session" ON public.sessions;

-- Sessions are only readable via the security definer functions
-- which validate device fingerprint
CREATE POLICY "No direct session reads"
ON public.sessions FOR SELECT
USING (false);

-- Alternative: Allow authenticated users to see sessions table is empty for them
-- CREATE POLICY "Authenticated users see no sessions"
-- ON public.sessions FOR SELECT
-- USING (auth.uid() IS NOT NULL AND false);

-- 2. Create a more secure session validation function that uses request context
-- This is called by edge functions to validate session ownership
CREATE OR REPLACE FUNCTION public.validate_session_access(
  session_uuid uuid,
  fingerprint text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_fingerprint text;
BEGIN
  -- Get the session's fingerprint
  SELECT device_fingerprint INTO session_fingerprint
  FROM public.sessions
  WHERE id = session_uuid;
  
  -- Return true only if fingerprints match
  RETURN session_fingerprint IS NOT NULL AND session_fingerprint = fingerprint;
END;
$$;

-- 3. Add additional security columns to sessions for enhanced validation
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS ip_hash text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 4. Create function to securely create session with validation
CREATE OR REPLACE FUNCTION public.create_secure_session(
  fingerprint text,
  ip_hash text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_session_id uuid;
BEGIN
  -- Create new session
  INSERT INTO public.sessions (device_fingerprint, ip_hash, is_active)
  VALUES (fingerprint, ip_hash, true)
  RETURNING id INTO new_session_id;
  
  RETURN new_session_id;
END;
$$;

-- 5. Create function to get session data if ownership is validated
CREATE OR REPLACE FUNCTION public.get_own_session(
  session_uuid uuid,
  fingerprint text
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  last_active timestamptz,
  is_active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.created_at, s.last_active, s.is_active
  FROM public.sessions s
  WHERE s.id = session_uuid
    AND s.device_fingerprint = fingerprint;
END;
$$;

-- 6. Update session activity securely
CREATE OR REPLACE FUNCTION public.update_session_activity(
  session_uuid uuid,
  fingerprint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.sessions
  SET last_active = now()
  WHERE id = session_uuid
    AND device_fingerprint = fingerprint;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;