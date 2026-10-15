CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, anon;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION private.is_org_member(_user_id uuid, _org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id) $$;
CREATE OR REPLACE FUNCTION private.is_org_admin(_user_id uuid, _org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id AND role IN ('owner','admin'))
      OR EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND owner_id = _user_id) $$;
CREATE OR REPLACE FUNCTION private.has_partner_access(_user_id uuid, _partner_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.partner_access WHERE user_id = _user_id AND partner_id = _partner_id) $$;
CREATE OR REPLACE FUNCTION private.is_partner_admin(_user_id uuid, _partner_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.partner_access WHERE user_id = _user_id AND partner_id = _partner_id AND role = 'admin') $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_org_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_org_admin(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_partner_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_partner_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.is_org_admin(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.has_partner_access(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.is_partner_admin(uuid, uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Only admins can view audit logs" ON public.security_audit_log FOR SELECT USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Members can view their org" ON public.organizations;
CREATE POLICY "Members can view their org" ON public.organizations FOR SELECT USING (private.is_org_member(auth.uid(), id));
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
CREATE POLICY "Members can view org members" ON public.organization_members FOR SELECT USING (private.is_org_member(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Admins can insert members" ON public.organization_members;
CREATE POLICY "Admins can insert members" ON public.organization_members FOR INSERT WITH CHECK (private.is_org_admin(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Admins can update members" ON public.organization_members;
CREATE POLICY "Admins can update members" ON public.organization_members FOR UPDATE USING (private.is_org_admin(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Admins can remove members" ON public.organization_members;
CREATE POLICY "Admins can remove members" ON public.organization_members FOR DELETE USING (user_id = auth.uid() OR private.is_org_admin(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Partner members can view their org" ON public.partner_organizations;
CREATE POLICY "Partner members can view their org" ON public.partner_organizations FOR SELECT USING (private.has_partner_access(auth.uid(), id));
DROP POLICY IF EXISTS "Admins can manage partners" ON public.partner_organizations;
CREATE POLICY "Admins can manage partners" ON public.partner_organizations FOR ALL USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Partner admins can manage access" ON public.partner_access;
CREATE POLICY "Partner admins can manage access" ON public.partner_access FOR ALL USING (private.is_partner_admin(auth.uid(), partner_id));
DROP POLICY IF EXISTS "Orgs can manage their listings" ON public.marketplace_listings;
CREATE POLICY "Orgs can manage their listings" ON public.marketplace_listings FOR ALL USING (private.is_org_admin(auth.uid(), organization_id));
DROP POLICY IF EXISTS "System can create invoices" ON public.invoices;
CREATE POLICY "System can create invoices" ON public.invoices FOR INSERT WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Org admins can view invitations" ON public.team_invitations;
CREATE POLICY "Org admins can view invitations" ON public.team_invitations FOR SELECT USING (private.is_org_admin(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Org admins can create invitations" ON public.team_invitations;
CREATE POLICY "Org admins can create invitations" ON public.team_invitations FOR INSERT WITH CHECK (private.is_org_admin(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Org admins can delete invitations" ON public.team_invitations;
CREATE POLICY "Org admins can delete invitations" ON public.team_invitations FOR DELETE USING (private.is_org_admin(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Admins can manage applications" ON public.partner_applications;
CREATE POLICY "Admins can manage applications" ON public.partner_applications FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.seat_limit_for_tier(p_tier text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE lower(coalesce(p_tier, 'snapshot')) WHEN 'basic' THEN 3 WHEN 'essential' THEN 3 WHEN 'pro' THEN 10 WHEN 'scale' THEN 10 ELSE 1 END $$;

CREATE OR REPLACE FUNCTION public.owner_seat_limit(p_owner_id uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN p.subscription_expires_at IS NOT NULL AND p.subscription_expires_at < now() THEN 1
      WHEN lower(coalesce(p.subscription_tier, '')) = 'scale' THEN GREATEST(public.seat_limit_for_tier('scale'),
        COALESCE((SELECT q.seats FROM public.scale_price_quotes q WHERE q.user_id = p.id AND q.status = 'consumed' AND q.seats IS NOT NULL ORDER BY q.consumed_at DESC NULLS LAST, q.created_at DESC LIMIT 1), 0))
      ELSE public.seat_limit_for_tier(p.subscription_tier)
    END
    FROM public.profiles p WHERE p.id = p_owner_id), 1) $$;

CREATE OR REPLACE FUNCTION public.sync_organization_seat_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    IF TG_OP = 'UPDATE' AND NEW.max_members IS DISTINCT FROM OLD.max_members THEN RETURN NEW; END IF;
    IF TG_OP = 'INSERT' AND NEW.max_members IS NOT NULL AND NEW.max_members > 1 THEN RETURN NEW; END IF;
  END IF;
  NEW.max_members := public.owner_seat_limit(NEW.owner_id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS sync_organization_seat_limit ON public.organizations;
CREATE TRIGGER sync_organization_seat_limit BEFORE INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.sync_organization_seat_limit();

CREATE OR REPLACE FUNCTION public.sync_owner_org_seat_limits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.organizations o SET max_members = public.owner_seat_limit(NEW.id)
   WHERE o.owner_id = NEW.id AND o.max_members IS DISTINCT FROM public.owner_seat_limit(NEW.id);
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS sync_owner_org_seat_limits ON public.profiles;
CREATE TRIGGER sync_owner_org_seat_limits AFTER UPDATE OF subscription_tier, subscription_expires_at ON public.profiles FOR EACH ROW
  WHEN (OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier OR OLD.subscription_expires_at IS DISTINCT FROM NEW.subscription_expires_at)
  EXECUTE FUNCTION public.sync_owner_org_seat_limits();

CREATE OR REPLACE FUNCTION public.sync_quote_org_seat_limits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.organizations o SET max_members = public.owner_seat_limit(NEW.user_id)
   WHERE o.owner_id = NEW.user_id AND o.max_members IS DISTINCT FROM public.owner_seat_limit(NEW.user_id);
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS sync_quote_org_seat_limits ON public.scale_price_quotes;
CREATE TRIGGER sync_quote_org_seat_limits AFTER INSERT OR UPDATE OF status, seats ON public.scale_price_quotes FOR EACH ROW EXECUTE FUNCTION public.sync_quote_org_seat_limits();

REVOKE ALL ON FUNCTION public.owner_seat_limit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_quote_org_seat_limits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_organization_seat_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_owner_org_seat_limits() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.organizations_max_members_backup (organization_id uuid PRIMARY KEY, max_members integer, backed_up_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.organizations_max_members_backup TO service_role;
ALTER TABLE public.organizations_max_members_backup ENABLE ROW LEVEL SECURITY;
INSERT INTO public.organizations_max_members_backup (organization_id, max_members) SELECT id, max_members FROM public.organizations ON CONFLICT (organization_id) DO NOTHING;

UPDATE public.organizations o SET max_members = public.owner_seat_limit(o.owner_id)
 WHERE o.owner_id IS NOT NULL AND o.max_members IS DISTINCT FROM public.owner_seat_limit(o.owner_id);

CREATE OR REPLACE FUNCTION public.create_organization(p_name text) RETURNS public.organizations LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_name text := btrim(coalesce(p_name, '')); v_org public.organizations;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF;
  IF v_name = '' OR length(v_name) > 120 THEN RAISE EXCEPTION 'Organization name must be between 1 and 120 characters' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.organizations (name, owner_id) VALUES (v_name, v_uid) RETURNING * INTO v_org;
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at) VALUES (v_org.id, v_uid, 'owner', now())
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner';
  UPDATE public.user_contexts SET is_active = false WHERE user_id = v_uid;
  INSERT INTO public.user_contexts (user_id, context_type, context_id, context_name, is_active, last_accessed_at)
    VALUES (v_uid, 'msme', v_org.id, v_org.name, true, now())
    ON CONFLICT (user_id, context_type, context_id) DO UPDATE SET context_name = EXCLUDED.context_name, is_active = true, last_accessed_at = now();
  RETURN v_org;
END; $$;
REVOKE ALL ON FUNCTION public.create_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_member_role(p_organization_id uuid, p_user_id uuid, p_role text) RETURNS public.organization_members LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_member public.organization_members;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF;
  IF NOT private.is_org_admin(v_uid, p_organization_id) THEN RAISE EXCEPTION 'Organization administrator access required' USING ERRCODE = '42501'; END IF;
  IF p_role NOT IN ('admin', 'analyst', 'viewer') THEN RAISE EXCEPTION 'Invalid team role' USING ERRCODE = '22023'; END IF;
  IF p_user_id = v_uid THEN RAISE EXCEPTION 'You cannot change your own role' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_member FROM public.organization_members WHERE organization_id = p_organization_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002'; END IF;
  IF v_member.role = 'owner' OR EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id AND owner_id = p_user_id) THEN
    RAISE EXCEPTION 'The organization owner cannot be changed' USING ERRCODE = '42501'; END IF;
  UPDATE public.organization_members SET role = p_role WHERE id = v_member.id RETURNING * INTO v_member;
  RETURN v_member;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_member(p_organization_id uuid, p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_member public.organization_members;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF;
  IF p_user_id <> v_uid AND NOT private.is_org_admin(v_uid, p_organization_id) THEN RAISE EXCEPTION 'Organization administrator access required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_member FROM public.organization_members WHERE organization_id = p_organization_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002'; END IF;
  IF v_member.role = 'owner' OR EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id AND owner_id = p_user_id) THEN
    RAISE EXCEPTION 'The organization owner cannot be removed' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.organization_members WHERE id = v_member.id;
  DELETE FROM public.user_contexts WHERE user_id = p_user_id AND context_type = 'msme' AND context_id = p_organization_id;
END; $$;
REVOKE ALL ON FUNCTION public.update_member_role(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_member_role(uuid, uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.remove_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid, uuid) TO authenticated;