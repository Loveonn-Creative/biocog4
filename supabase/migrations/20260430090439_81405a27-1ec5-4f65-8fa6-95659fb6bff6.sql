CREATE TABLE public.calculator_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  calculator_slug text NOT NULL,
  label text,
  inputs jsonb NOT NULL,
  results jsonb NOT NULL,
  factor_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_calculator_runs_user_id ON public.calculator_runs(user_id);
CREATE INDEX idx_calculator_runs_slug ON public.calculator_runs(calculator_slug);
CREATE INDEX idx_calculator_runs_created ON public.calculator_runs(created_at DESC);

ALTER TABLE public.calculator_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calculator runs"
  ON public.calculator_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculator runs"
  ON public.calculator_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculator runs"
  ON public.calculator_runs FOR DELETE
  USING (auth.uid() = user_id);