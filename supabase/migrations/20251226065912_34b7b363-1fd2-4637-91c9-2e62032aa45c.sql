-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 1. Sessions table (anonymous users without sign-in)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active TIMESTAMPTZ DEFAULT now()
);

-- 2. User profiles (for signed-in users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  business_name TEXT,
  gstin TEXT,
  phone TEXT,
  location TEXT,
  sector TEXT,
  size TEXT CHECK (size IN ('micro', 'small', 'medium')),
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Documents table (all uploaded invoices/bills)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  vendor TEXT,
  invoice_date DATE,
  invoice_number TEXT,
  amount DECIMAL(15,2),
  currency TEXT DEFAULT 'INR',
  tax_amount DECIMAL(15,2),
  subtotal DECIMAL(15,2),
  raw_ocr_data JSONB,
  file_url TEXT,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Emissions table (calculated from documents)
CREATE TABLE public.emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scope INTEGER NOT NULL CHECK (scope IN (1, 2, 3)),
  category TEXT NOT NULL,
  activity_data DECIMAL(15,4),
  activity_unit TEXT,
  emission_factor DECIMAL(10,6),
  co2_kg DECIMAL(15,4) NOT NULL,
  data_quality TEXT CHECK (data_quality IN ('high', 'medium', 'low')),
  verified BOOLEAN DEFAULT FALSE,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Carbon Verifications table
CREATE TABLE public.carbon_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emission_ids UUID[] NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total_co2_kg DECIMAL(15,4) NOT NULL,
  verification_status TEXT DEFAULT 'pending' 
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'needs_review')),
  verification_score DECIMAL(3,2),
  greenwashing_risk TEXT CHECK (greenwashing_risk IN ('low', 'medium', 'high')),
  ai_analysis JSONB,
  ccts_eligible BOOLEAN DEFAULT FALSE,
  cbam_compliant BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);

-- 7. Monetization Pathways table
CREATE TABLE public.monetization_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID REFERENCES public.carbon_verifications(id) ON DELETE CASCADE,
  pathway_type TEXT NOT NULL 
    CHECK (pathway_type IN ('carbon_credit', 'green_loan', 'govt_incentive')),
  estimated_value DECIMAL(15,2),
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'available' 
    CHECK (status IN ('available', 'applied', 'approved', 'rejected', 'completed')),
  partner_name TEXT,
  partner_details JSONB,
  applied_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Reports table (downloadable carbon reports)
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL 
    CHECK (report_type IN ('monthly', 'quarterly', 'annual', 'custom', 'compliance')),
  period_start DATE,
  period_end DATE,
  scope1_total DECIMAL(15,4),
  scope2_total DECIMAL(15,4),
  scope3_total DECIMAL(15,4),
  total_co2_kg DECIMAL(15,4),
  report_data JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for sessions (anyone can create, read by session_id match)
CREATE POLICY "Anyone can create sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sessions can be read by anyone"
  ON public.sessions FOR SELECT
  USING (true);

CREATE POLICY "Sessions can be updated by anyone"
  ON public.sessions FOR UPDATE
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for documents (session-based OR user-based access)
CREATE POLICY "Anyone can insert documents"
  ON public.documents FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view documents by session or user_id"
  ON public.documents FOR SELECT
  USING (
    session_id IS NOT NULL OR 
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    session_id IS NOT NULL
  );

-- RLS Policies for emissions
CREATE POLICY "Anyone can insert emissions"
  ON public.emissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view emissions by session or user_id"
  ON public.emissions FOR SELECT
  USING (
    session_id IS NOT NULL OR 
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Users can update their emissions"
  ON public.emissions FOR UPDATE
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    session_id IS NOT NULL
  );

-- RLS Policies for carbon_verifications
CREATE POLICY "Anyone can insert verifications"
  ON public.carbon_verifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view verifications by session or user_id"
  ON public.carbon_verifications FOR SELECT
  USING (
    session_id IS NOT NULL OR 
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Users can update their verifications"
  ON public.carbon_verifications FOR UPDATE
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    session_id IS NOT NULL
  );

-- RLS Policies for monetization_pathways
CREATE POLICY "Anyone can insert pathways"
  ON public.monetization_pathways FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view pathways via verification"
  ON public.monetization_pathways FOR SELECT
  USING (true);

CREATE POLICY "Users can update pathways"
  ON public.monetization_pathways FOR UPDATE
  USING (true);

-- RLS Policies for reports
CREATE POLICY "Anyone can insert reports"
  ON public.reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view reports by session or user_id"
  ON public.reports FOR SELECT
  USING (
    session_id IS NOT NULL OR 
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- Storage policies for documents bucket
CREATE POLICY "Anyone can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- Create indexes for performance
CREATE INDEX idx_documents_session_id ON public.documents(session_id);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_emissions_document_id ON public.emissions(document_id);
CREATE INDEX idx_emissions_session_id ON public.emissions(session_id);
CREATE INDEX idx_emissions_scope ON public.emissions(scope);
CREATE INDEX idx_verifications_session_id ON public.carbon_verifications(session_id);
CREATE INDEX idx_pathways_verification_id ON public.monetization_pathways(verification_id);