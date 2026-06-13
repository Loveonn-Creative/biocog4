
-- grant_applications: remove anonymous-readable branch
DROP POLICY IF EXISTS "Users can view their own applications" ON public.grant_applications;
CREATE POLICY "Users can view their own applications"
  ON public.grant_applications
  FOR SELECT
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- subscriptions: only service role may insert/update
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;

-- security_audit_log: allow authenticated users to insert their own events
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_log;
CREATE POLICY "Users can insert their own audit events"
  ON public.security_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Storage: drop shared guest folder access (cross-session leakage)
DROP POLICY IF EXISTS "Guest users can read from session folder" ON storage.objects;
DROP POLICY IF EXISTS "Guest users can upload to session folder" ON storage.objects;
-- Re-add guest INSERT only (reads happen via signed URLs returned at upload)
CREATE POLICY "Guests can upload to documents bucket"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'guest'
  );

-- Revoke EXECUTE on internal helper SECURITY DEFINER functions from public users.
-- These are RLS/policy helpers and must NOT be callable directly via the API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_partner_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_partner_access(uuid, uuid) FROM PUBLIC, anon, authenticated;
