DROP POLICY IF EXISTS "Users can insert their own ledger" ON public.compliance_ledger;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.case_studies_public FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.owns_guest_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT false $$;
REVOKE EXECUTE ON FUNCTION public.get_session_by_fingerprint(text) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Sessions can be updated by owner" ON public.sessions;

DROP POLICY IF EXISTS "Users can view their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chat_history;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON public.chat_history;
CREATE POLICY "Users can view their own chat history" ON public.chat_history FOR SELECT
  USING (user_id IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can insert their own chat messages" ON public.chat_history FOR INSERT
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can update their own chat messages" ON public.chat_history FOR UPDATE
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can create invitations" ON public.team_invitations;

DROP POLICY IF EXISTS "System can create invoices" ON public.invoices;
CREATE POLICY "System can create invoices" ON public.invoices FOR INSERT
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Orgs can manage their listings" ON public.marketplace_listings;
CREATE POLICY "Org admins can view their listings" ON public.marketplace_listings FOR SELECT
  USING (private.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Admins can manage listings" ON public.marketplace_listings FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create applications" ON public.partner_applications;
CREATE POLICY "Users can create applications" ON public.partner_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND COALESCE(status, 'pending') = 'pending');

CREATE OR REPLACE FUNCTION public.guard_monetization_pathway_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN RETURN NEW; END IF;
  IF NEW.verification_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.carbon_verifications v WHERE v.id = NEW.verification_id
      AND (v.user_id = auth.uid() OR (v.organization_id IS NOT NULL AND private.is_org_member(auth.uid(), v.organization_id)))
  ) THEN
    RAISE EXCEPTION 'verification not found' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM 'applied' THEN NEW.status := 'applied'; END IF;
  NEW.completed_at := NULL;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_monetization_pathway_insert ON public.monetization_pathways;
CREATE TRIGGER guard_monetization_pathway_insert BEFORE INSERT ON public.monetization_pathways
  FOR EACH ROW EXECUTE FUNCTION public.guard_monetization_pathway_insert();