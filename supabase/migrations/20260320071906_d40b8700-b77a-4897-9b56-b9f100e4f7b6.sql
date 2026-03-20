CREATE TABLE public.net_zero_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  baseline_co2_kg numeric NOT NULL,
  target_reduction_pct numeric NOT NULL,
  target_date date NOT NULL,
  sector text,
  roadmap jsonb DEFAULT '[]'::jsonb,
  tasks jsonb DEFAULT '[]'::jsonb,
  progress_pct numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.net_zero_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
ON public.net_zero_goals FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);