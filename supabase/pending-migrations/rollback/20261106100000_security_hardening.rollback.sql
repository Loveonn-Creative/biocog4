-- Rollback for 20261106100000_security_hardening.sql: restores the previous
-- policies, grants and functions exactly. No data is changed.
BEGIN;
DROP TRIGGER IF EXISTS guard_monetization_pathway_insert ON public.monetization_pathways;
DROP FUNCTION IF EXISTS public.guard_monetization_pathway_insert();

DROP POLICY IF EXISTS "Users can create applications" ON public.partner_applications;
CREATE POLICY "Users can create applications" ON public.partner_applications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Org admins can view their listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Admins can manage listings" ON public.marketplace_listings;
CREATE POLICY "Orgs can manage their listings" ON public.marketplace_listings FOR ALL USING (private.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "System can create invoices" ON public.invoices;
CREATE POLICY "System can create invoices" ON public.invoices FOR INSERT WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert members" ON public.organization_members FOR INSERT WITH CHECK (private.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Admins can update members" ON public.organization_members FOR UPDATE USING (private.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins can create invitations" ON public.team_invitations FOR INSERT WITH CHECK (private.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Users can view their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chat_history;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON public.chat_history;
CREATE POLICY "Users can view their own chat history" ON public.chat_history FOR SELECT
USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL AND session_id IS NOT NULL AND auth.uid() IS NULL));
CREATE POLICY "Users can insert their own chat messages" ON public.chat_history FOR INSERT
WITH CHECK ((user_id IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL AND session_id IS NOT NULL));
CREATE POLICY "Users can update their own chat messages" ON public.chat_history FOR UPDATE
USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL AND session_id IS NOT NULL AND auth.uid() IS NULL));

CREATE POLICY "Sessions can be updated by owner" ON public.sessions FOR UPDATE USING (auth.uid() IS NULL);

GRANT EXECUTE ON FUNCTION public.get_session_by_fingerprint(text) TO anon, authenticated;
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

GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.case_studies_public TO anon, authenticated;

CREATE POLICY "Users can insert their own ledger" ON public.compliance_ledger
  FOR INSERT WITH CHECK (auth.uid() = user_id);
COMMIT;
