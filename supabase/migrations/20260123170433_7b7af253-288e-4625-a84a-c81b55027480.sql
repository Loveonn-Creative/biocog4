-- =============================================
-- SENSEIBLE PLATFORM ARCHITECTURE EXPANSION
-- Phase 1: Create all tables first
-- =============================================

-- 1. ORGANIZATIONS TABLE (MSME Business Entities)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_tier TEXT DEFAULT 'snapshot',
  max_members INTEGER DEFAULT 1,
  logo_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ORGANIZATION MEMBERS TABLE
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'analyst', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_email TEXT,
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 3. PARTNER ORGANIZATIONS TABLE
CREATE TABLE public.partner_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('carbon_buyer', 'bank', 'erp', 'climate_finance', 'corporate')),
  verified BOOLEAN DEFAULT false,
  contact_email TEXT,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  supported_currencies TEXT[] DEFAULT ARRAY['INR', 'USD'],
  supported_languages TEXT[] DEFAULT ARRAY['en', 'hi'],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PARTNER ACCESS TABLE
CREATE TABLE public.partner_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES public.partner_organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'analyst', 'admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, partner_id)
);

-- 5. MARKETPLACE LISTINGS TABLE (Anonymized MSME Credits)
CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID REFERENCES public.carbon_verifications(id),
  organization_id UUID REFERENCES public.organizations(id),
  msme_hash TEXT NOT NULL,
  sector TEXT,
  region TEXT,
  credits_available NUMERIC NOT NULL,
  price_per_tonne NUMERIC,
  currency TEXT DEFAULT 'INR',
  vintage TEXT,
  methodology TEXT,
  sdg_alignment INTEGER[],
  verification_score NUMERIC,
  is_active BOOLEAN DEFAULT true,
  listed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PAYMENT METHODS TABLE (Razorpay Tokenized)
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  razorpay_token_id TEXT NOT NULL,
  card_last_four TEXT,
  card_brand TEXT,
  card_network TEXT,
  is_default BOOLEAN DEFAULT false,
  is_autopay_enabled BOOLEAN DEFAULT false,
  expires_month INTEGER,
  expires_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. BILLING ADDRESSES TABLE
CREATE TABLE public.billing_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'India',
  gstin TEXT,
  is_default BOOLEAN DEFAULT false,
  use_company_address BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. INVOICES TABLE
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id),
  invoice_number TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  billing_address_id UUID REFERENCES public.billing_addresses(id),
  razorpay_payment_id TEXT,
  pdf_url TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. USER CONTEXTS TABLE (Role Switching)
CREATE TABLE public.user_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('msme', 'partner')),
  context_id UUID NOT NULL,
  context_name TEXT,
  is_active BOOLEAN DEFAULT false,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, context_type, context_id)
);

-- 10. TEAM INVITATIONS TABLE
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Add organization_id to existing tables for data isolation
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.emissions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.carbon_verifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- =============================================
-- Phase 2: Enable RLS on all tables
-- =============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Phase 3: Helper functions (security definer)
-- =============================================

-- Check if user is org member
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Check if user is org admin/owner
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id 
    AND organization_id = _org_id
    AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND owner_id = _user_id
  )
$$;

-- Check if user has partner access
CREATE OR REPLACE FUNCTION public.has_partner_access(_user_id UUID, _partner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_access
    WHERE user_id = _user_id AND partner_id = _partner_id
  )
$$;

-- Check if user is partner admin
CREATE OR REPLACE FUNCTION public.is_partner_admin(_user_id UUID, _partner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_access
    WHERE user_id = _user_id 
    AND partner_id = _partner_id
    AND role = 'admin'
  )
$$;

-- =============================================
-- Phase 4: Create RLS policies using functions
-- =============================================

-- Organizations policies
CREATE POLICY "Owners can view their org"
  ON public.organizations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Members can view their org"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Owners can update their organization"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Organization members policies
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can insert members"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can update members"
  ON public.organization_members FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can remove members"
  ON public.organization_members FOR DELETE
  USING (user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));

-- Partner organizations policies
CREATE POLICY "Public can view verified partners"
  ON public.partner_organizations FOR SELECT
  USING (verified = true);

CREATE POLICY "Partner members can view their org"
  ON public.partner_organizations FOR SELECT
  USING (public.has_partner_access(auth.uid(), id));

CREATE POLICY "Admins can manage partners"
  ON public.partner_organizations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Partner access policies
CREATE POLICY "Users can view their partner access"
  ON public.partner_access FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Partner admins can manage access"
  ON public.partner_access FOR ALL
  USING (public.is_partner_admin(auth.uid(), partner_id));

-- Marketplace listings policies
CREATE POLICY "Authenticated users can view active listings"
  ON public.marketplace_listings FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Orgs can manage their listings"
  ON public.marketplace_listings FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Payment methods policies
CREATE POLICY "Users can view their payment methods"
  ON public.payment_methods FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add payment methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their payment methods"
  ON public.payment_methods FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their payment methods"
  ON public.payment_methods FOR DELETE
  USING (user_id = auth.uid());

-- Billing addresses policies
CREATE POLICY "Users can view their billing addresses"
  ON public.billing_addresses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add billing addresses"
  ON public.billing_addresses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their billing addresses"
  ON public.billing_addresses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their billing addresses"
  ON public.billing_addresses FOR DELETE
  USING (user_id = auth.uid());

-- Invoices policies
CREATE POLICY "Users can view their invoices"
  ON public.invoices FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- User contexts policies
CREATE POLICY "Users can view their contexts"
  ON public.user_contexts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add contexts"
  ON public.user_contexts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their contexts"
  ON public.user_contexts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their contexts"
  ON public.user_contexts FOR DELETE
  USING (user_id = auth.uid());

-- Team invitations policies
CREATE POLICY "Org admins can view invitations"
  ON public.team_invitations FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- =============================================
-- Phase 5: Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_access_user_id ON public.partner_access(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_access_partner_id ON public.partner_access(partner_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active ON public.marketplace_listings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_contexts_user_id ON public.user_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contexts_active ON public.user_contexts(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);

-- =============================================
-- Phase 6: Triggers
-- =============================================
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_organizations_updated_at
  BEFORE UPDATE ON public.partner_organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_addresses_updated_at
  BEFORE UPDATE ON public.billing_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Phase 7: Context switching functions
-- =============================================
CREATE OR REPLACE FUNCTION public.switch_user_context(
  p_context_type TEXT,
  p_context_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_contexts
  SET is_active = false
  WHERE user_id = auth.uid();
  
  UPDATE public.user_contexts
  SET is_active = true, last_accessed_at = now()
  WHERE user_id = auth.uid()
    AND context_type = p_context_type
    AND context_id = p_context_id;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_context()
RETURNS TABLE(context_type TEXT, context_id UUID, context_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uc.context_type, uc.context_id, uc.context_name
  FROM public.user_contexts uc
  WHERE uc.user_id = auth.uid() AND uc.is_active = true
  LIMIT 1;
$$;