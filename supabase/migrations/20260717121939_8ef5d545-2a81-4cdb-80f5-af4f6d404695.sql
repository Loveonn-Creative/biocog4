CREATE TABLE public.translation_cache (
  locale text NOT NULL,
  source_hash text NOT NULL,
  source text NOT NULL,
  translated text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (locale, source_hash)
);

GRANT SELECT ON public.translation_cache TO anon, authenticated;
GRANT ALL ON public.translation_cache TO service_role;

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translation_cache_public_read"
ON public.translation_cache
FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX idx_translation_cache_locale ON public.translation_cache(locale);