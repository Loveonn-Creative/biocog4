CREATE TABLE public.scope_review_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 email text NOT NULL,
 phone text,
 company text,
 message text NOT NULL,
 scope_input jsonb NOT NULL,
 estimate_min_inr integer NOT NULL CHECK (estimate_min_inr > 0),
 estimate_max_inr integer NOT NULL CHECK (estimate_max_inr >= estimate_min_inr),
 email_status text NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending','sent','suppressed','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.scope_review_requests TO service_role;
ALTER TABLE public.scope_review_requests ENABLE ROW LEVEL SECURITY;
-- No client policies: only the server-side contact function can store or inspect requests.
CREATE TRIGGER update_scope_review_requests_updated_at BEFORE UPDATE ON public.scope_review_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();