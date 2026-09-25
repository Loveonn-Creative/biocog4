CREATE OR REPLACE FUNCTION public.create_team_invitation(
  p_organization_id uuid,
  p_email text,
  p_role text
)
RETURNS TABLE(id uuid, token text, email text, role text, organization_name text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_token text := gen_random_uuid()::text;
  v_max_members integer;
  v_org_name text;
  v_current_members integer;
  v_pending_invites integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Organization administrator access required';
  END IF;
  IF p_role NOT IN ('admin', 'analyst', 'viewer') THEN
    RAISE EXCEPTION 'Invalid team role';
  END IF;
  IF v_email = '' OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Valid email required';
  END IF;

  SELECT o.name, GREATEST(COALESCE(o.max_members, 1), 1)
    INTO v_org_name, v_max_members
    FROM public.organizations o
    WHERE o.id = p_organization_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  SELECT count(*) INTO v_current_members
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id;
  SELECT count(*) INTO v_pending_invites
    FROM public.team_invitations ti
    WHERE ti.organization_id = p_organization_id
      AND ti.accepted_at IS NULL
      AND ti.expires_at > now();

  IF v_current_members + v_pending_invites >= v_max_members THEN
    RAISE EXCEPTION 'Organization member limit reached';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.organization_id = p_organization_id
      AND lower(ti.email) = v_email
      AND ti.accepted_at IS NULL
      AND ti.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'An active invitation already exists for this email';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN auth.users au ON au.id = om.user_id
    WHERE om.organization_id = p_organization_id
      AND lower(au.email) = v_email
  ) THEN
    RAISE EXCEPTION 'This account is already an organization member';
  END IF;

  RETURN QUERY
  INSERT INTO public.team_invitations (organization_id, email, role, invited_by, token)
  VALUES (p_organization_id, v_email, p_role, auth.uid(), v_token)
  RETURNING team_invitations.id, team_invitations.token, team_invitations.email,
    team_invitations.role, v_org_name, team_invitations.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token text)
RETURNS TABLE(organization_id uuid, organization_name text, accepted_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invitation public.team_invitations%ROWTYPE;
  v_user_email text;
  v_org_name text;
  v_max_members integer;
  v_current_members integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT lower(email) INTO v_user_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_invitation
    FROM public.team_invitations
    WHERE team_invitations.token = p_token
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF v_invitation.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted';
  END IF;
  IF v_invitation.expires_at <= now() THEN
    RAISE EXCEPTION 'Invitation expired';
  END IF;
  IF lower(v_invitation.email) <> v_user_email THEN
    RAISE EXCEPTION 'Signed-in account does not match invitation';
  END IF;

  SELECT o.name, GREATEST(COALESCE(o.max_members, 1), 1)
    INTO v_org_name, v_max_members
    FROM public.organizations o
    WHERE o.id = v_invitation.organization_id
    FOR UPDATE;
  SELECT count(*) INTO v_current_members
    FROM public.organization_members om
    WHERE om.organization_id = v_invitation.organization_id;
  IF v_current_members >= v_max_members AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_invitation.organization_id AND om.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Organization member limit reached';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by, invited_email, joined_at)
  VALUES (v_invitation.organization_id, auth.uid(), v_invitation.role, v_invitation.invited_by, v_invitation.email, now())
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.user_contexts SET is_active = false WHERE user_id = auth.uid();
  INSERT INTO public.user_contexts (user_id, context_type, context_id, context_name, is_active, last_accessed_at)
  VALUES (auth.uid(), 'msme', v_invitation.organization_id, v_org_name, true, now())
  ON CONFLICT (user_id, context_type, context_id)
  DO UPDATE SET context_name = EXCLUDED.context_name, is_active = true, last_accessed_at = now();

  UPDATE public.team_invitations SET accepted_at = now() WHERE id = v_invitation.id;
  RETURN QUERY SELECT v_invitation.organization_id, v_org_name, v_invitation.role;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_invitation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_invitation(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.accept_team_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO authenticated;