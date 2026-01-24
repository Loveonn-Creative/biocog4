-- Phase 1: Grant developer admin access (first user in profiles)
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM profiles 
ORDER BY created_at ASC 
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

-- Phase 4: Create partner applications table for onboarding queue
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_name text NOT NULL,
  organization_type text NOT NULL,
  contact_email text NOT NULL,
  website text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view their own applications"
ON public.partner_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own applications
CREATE POLICY "Users can create applications"
ON public.partner_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view and manage all applications
CREATE POLICY "Admins can manage applications"
ON public.partner_applications
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));