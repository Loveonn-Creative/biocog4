-- Allow users to update their own saved calculator runs (needed for real-time autosave upserts)
CREATE POLICY "Users can update their own calculator runs"
ON public.calculator_runs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_calculator_runs_user_slug_created
ON public.calculator_runs (user_id, calculator_slug, created_at DESC);