CREATE OR REPLACE FUNCTION public.service_create_team_invitation(
  p_actor_id uuid, p_organization_id uuid, p_email text, p_role text, p_token text
)
RETURNS public.team_invitations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_email text := lower(trim(p_email)); v_limit integer; v_used integer; v_result public.team_invitations;
BEGIN
  IF NOT public.is_org_admin(p_actor_id, p_organization_id) THEN RAISE EXCEPTION 'Organization administrator access required'; END IF;
  IF p_role NOT IN ('admin','analyst','viewer') THEN RAISE EXCEPTION 'Invalid team role'; END IF;
  IF v_email = '' OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Valid email required'; END IF;
  SELECT GREATEST(COALESCE(max_members,1),1) INTO v_limit FROM public.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found'; END IF;
  SELECT count(*) INTO v_used FROM public.organization_members WHERE organization_id=p_organization_id;
  SELECT v_used + count(*) INTO v_used FROM public.team_invitations WHERE organization_id=p_organization_id AND accepted_at IS NULL AND expires_at>now();
  IF v_used >= v_limit THEN RAISE EXCEPTION 'Organization member limit reached'; END IF;
  IF EXISTS (SELECT 1 FROM public.team_invitations WHERE organization_id=p_organization_id AND lower(email)=v_email AND accepted_at IS NULL AND expires_at>now()) THEN RAISE EXCEPTION 'An active invitation already exists for this email'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members om JOIN auth.users u ON u.id=om.user_id WHERE om.organization_id=p_organization_id AND lower(u.email)=v_email) THEN RAISE EXCEPTION 'This account is already an organization member'; END IF;
  INSERT INTO public.team_invitations(organization_id,email,role,invited_by,token) VALUES(p_organization_id,v_email,p_role,p_actor_id,p_token) RETURNING * INTO v_result;
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.service_accept_team_invitation(p_user_id uuid, p_user_email text, p_token text)
RETURNS TABLE(organization_id uuid, organization_name text, accepted_role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_inv public.team_invitations%ROWTYPE; v_name text; v_limit integer; v_count integer;
BEGIN
  SELECT * INTO v_inv FROM public.team_invitations WHERE token=p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF v_inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation already accepted'; END IF;
  IF v_inv.expires_at<=now() THEN RAISE EXCEPTION 'Invitation expired'; END IF;
  IF lower(v_inv.email)<>lower(trim(p_user_email)) THEN RAISE EXCEPTION 'Signed-in account does not match invitation'; END IF;
  SELECT name,GREATEST(COALESCE(max_members,1),1) INTO v_name,v_limit FROM public.organizations WHERE id=v_inv.organization_id FOR UPDATE;
  SELECT count(*) INTO v_count FROM public.organization_members WHERE organization_id=v_inv.organization_id;
  IF v_count>=v_limit AND NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=v_inv.organization_id AND user_id=p_user_id) THEN RAISE EXCEPTION 'Organization member limit reached'; END IF;
  INSERT INTO public.organization_members(organization_id,user_id,role,invited_by,invited_email,joined_at) VALUES(v_inv.organization_id,p_user_id,v_inv.role,v_inv.invited_by,v_inv.email,now()) ON CONFLICT(organization_id,user_id) DO NOTHING;
  UPDATE public.user_contexts SET is_active=false WHERE user_id=p_user_id;
  INSERT INTO public.user_contexts(user_id,context_type,context_id,context_name,is_active,last_accessed_at) VALUES(p_user_id,'msme',v_inv.organization_id,v_name,true,now()) ON CONFLICT(user_id,context_type,context_id) DO UPDATE SET context_name=EXCLUDED.context_name,is_active=true,last_accessed_at=now();
  UPDATE public.team_invitations SET accepted_at=now() WHERE id=v_inv.id;
  RETURN QUERY SELECT v_inv.organization_id,v_name,v_inv.role;
END $$;

REVOKE ALL ON FUNCTION public.service_create_team_invitation(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_create_team_invitation(uuid,uuid,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.service_accept_team_invitation(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_accept_team_invitation(uuid,text,text) TO service_role;