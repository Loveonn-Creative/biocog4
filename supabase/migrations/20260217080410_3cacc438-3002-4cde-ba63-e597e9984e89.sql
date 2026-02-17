
CREATE TABLE public.compliance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid REFERENCES public.documents(id),
  emission_id uuid REFERENCES public.emissions(id),
  verification_id uuid REFERENCES public.carbon_verifications(id),
  document_hash text NOT NULL,
  invoice_number text,
  vendor text,
  invoice_date date,
  amount numeric,
  currency text DEFAULT 'INR',
  green_category text,
  scope integer NOT NULL,
  emission_category text NOT NULL,
  activity_data numeric,
  activity_unit text,
  emission_factor numeric,
  factor_source text,
  co2_kg numeric NOT NULL,
  is_green_benefit boolean DEFAULT false,
  confidence_score numeric,
  verification_score numeric,
  verification_status text DEFAULT 'pending',
  validation_result text DEFAULT 'pending',
  validation_failure_reason text,
  greenwashing_risk text,
  methodology_version text NOT NULL,
  classification_method text,
  gstin text,
  hsn_code text,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  fiscal_year text,
  fiscal_quarter text
);

ALTER TABLE public.compliance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ledger" ON public.compliance_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ledger" ON public.compliance_ledger
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ledger" ON public.compliance_ledger
  FOR UPDATE USING (auth.uid() = user_id);
