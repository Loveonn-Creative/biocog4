CREATE OR REPLACE FUNCTION public.owns_guest_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = _session_id
      AND s.is_active = true
      AND s.device_fingerprint = COALESCE(
        (NULLIF(current_setting('request.headers', true), '')::jsonb ->> 'user-agent'),
        ''
      )
  );
$$;

REVOKE ALL ON FUNCTION public.owns_guest_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_guest_session(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Owners can view documents" ON public.documents FOR SELECT TO anon, authenticated
USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));
CREATE POLICY "Owners can insert documents" ON public.documents FOR INSERT TO anon, authenticated
WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));
CREATE POLICY "Owners can update documents" ON public.documents FOR UPDATE TO anon, authenticated
USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)))
WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));

DROP POLICY IF EXISTS "Users can view their own emissions" ON public.emissions;
DROP POLICY IF EXISTS "Users can insert their own emissions" ON public.emissions;
DROP POLICY IF EXISTS "Users can update their own emissions" ON public.emissions;
CREATE POLICY "Owners can view emissions" ON public.emissions FOR SELECT TO anon, authenticated
USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));
CREATE POLICY "Owners can insert emissions" ON public.emissions FOR INSERT TO anon, authenticated
WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));
CREATE POLICY "Owners can update emissions" ON public.emissions FOR UPDATE TO anon, authenticated
USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)))
WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));

DROP POLICY IF EXISTS "Users can view their own verifications" ON public.carbon_verifications;
DROP POLICY IF EXISTS "Users can insert their own verifications" ON public.carbon_verifications;
DROP POLICY IF EXISTS "Users can update their own verifications" ON public.carbon_verifications;
CREATE POLICY "Owners can view verifications" ON public.carbon_verifications FOR SELECT TO anon, authenticated
USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));
CREATE POLICY "Owners can insert verifications" ON public.carbon_verifications FOR INSERT TO anon, authenticated
WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));
CREATE POLICY "Owners can update verifications" ON public.carbon_verifications FOR UPDATE TO anon, authenticated
USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)))
WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));

DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
CREATE POLICY "Owners can view reports" ON public.reports FOR SELECT TO anon, authenticated
USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));
CREATE POLICY "Owners can insert reports" ON public.reports FOR INSERT TO anon, authenticated
WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));

DROP POLICY IF EXISTS "Users can view their own pathways" ON public.monetization_pathways;
DROP POLICY IF EXISTS "Users can insert their own pathways" ON public.monetization_pathways;
DROP POLICY IF EXISTS "Users can update their own pathways" ON public.monetization_pathways;
CREATE POLICY "Owners can view pathways" ON public.monetization_pathways FOR SELECT TO anon, authenticated
USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));
CREATE POLICY "Owners can insert pathways" ON public.monetization_pathways FOR INSERT TO anon, authenticated
WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));
CREATE POLICY "Owners can update pathways" ON public.monetization_pathways FOR UPDATE TO anon, authenticated
USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)))
WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND public.owns_guest_session(session_id)));