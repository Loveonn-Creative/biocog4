CREATE TABLE public.public_library_entries (
  id text PRIMARY KEY CHECK (id ~ '^[0-9a-f]{32}$'),
  kind text NOT NULL CHECK (kind IN ('answer', 'article', 'fact')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  url text CHECK (url IS NULL OR url ~ '^https://senseible\.earth/[a-z0-9/-]{1,200}$'),
  search tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', body), 'B')
  ) STORED,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX public_library_entries_search_idx ON public.public_library_entries USING gin (search);

CREATE TABLE public.public_library_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  version text CHECK (version IS NULL OR version ~ '^[0-9a-f]{16}$'),
  entries integer NOT NULL DEFAULT 0 CHECK (entries >= 0),
  checked_at timestamptz NOT NULL DEFAULT 'epoch',
  synced_at timestamptz
);
INSERT INTO public.public_library_state DEFAULT VALUES;

ALTER TABLE public.public_library_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_library_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_library_entries, public.public_library_state FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.search_public_library(p_terms text[], p_limit integer DEFAULT 24)
RETURNS jsonb
LANGUAGE sql STABLE SET search_path = ''
AS $$
  WITH t AS (
    SELECT string_agg(term, ' | ') AS q
    FROM (SELECT DISTINCT term FROM unnest(p_terms[1:12]) AS term WHERE term ~ '^[a-z0-9]{1,40}$') s
  ), q AS (
    SELECT to_tsquery('english', t.q) AS tsq FROM t WHERE t.q IS NOT NULL
  ), hits AS (
    SELECT e.kind, e.title, e.body, e.url, ts_rank(e.search, q.tsq) AS rank
    FROM public.public_library_entries e, q
    WHERE e.search @@ q.tsq
    ORDER BY rank DESC, e.title
    LIMIT least(greatest(coalesce(p_limit, 24), 1), 50)
  )
  SELECT jsonb_build_object(
    'ready', (SELECT entries > 0 FROM public.public_library_state),
    'rows', coalesce((SELECT jsonb_agg(jsonb_build_object('kind', kind, 'title', title, 'text', body, 'url', url) ORDER BY rank DESC, title) FROM hits), '[]'::jsonb)
  );
$$;

CREATE FUNCTION public.claim_public_library_check(p_min_age interval DEFAULT interval '6 hours')
RETURNS TABLE (claimed boolean, version text)
LANGUAGE sql VOLATILE SET search_path = ''
AS $$
  WITH c AS (
    UPDATE public.public_library_state SET checked_at = now()
    WHERE checked_at < now() - p_min_age
    RETURNING public_library_state.version
  )
  SELECT true, c.version FROM c
  UNION ALL
  SELECT false, s.version FROM public.public_library_state s WHERE NOT EXISTS (SELECT 1 FROM c);
$$;

CREATE FUNCTION public.apply_public_library(p_version text, p_entries jsonb)
RETURNS integer
LANGUAGE plpgsql VOLATILE SET search_path = ''
AS $$
DECLARE n integer;
BEGIN
  IF p_version !~ '^[0-9a-f]{16}$' THEN RAISE EXCEPTION 'bad version'; END IF;
  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) NOT BETWEEN 1 AND 20000 THEN
    RAISE EXCEPTION 'bad entries';
  END IF;
  CREATE TEMP TABLE incoming ON COMMIT DROP AS
    SELECT DISTINCT ON (id) id, kind, title, body, url FROM (
      SELECT md5(coalesce(x->>'url', '') || chr(31) || (x->>'title')) AS id,
             x->>'kind' AS kind, x->>'title' AS title, x->>'text' AS body, nullif(x->>'url', '') AS url
      FROM jsonb_array_elements(p_entries) AS x
    ) s ORDER BY id;
  INSERT INTO public.public_library_entries AS e (id, kind, title, body, url)
    SELECT id, kind, title, body, url FROM incoming
  ON CONFLICT (id) DO UPDATE SET kind = excluded.kind, title = excluded.title, body = excluded.body, url = excluded.url, updated_at = now()
    WHERE (e.kind, e.title, e.body, e.url) IS DISTINCT FROM (excluded.kind, excluded.title, excluded.body, excluded.url);
  DELETE FROM public.public_library_entries e WHERE NOT EXISTS (SELECT 1 FROM incoming i WHERE i.id = e.id);
  SELECT count(*) INTO n FROM public.public_library_entries;
  UPDATE public.public_library_state SET version = p_version, entries = n, synced_at = now();
  DROP TABLE incoming;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.search_public_library(text[], integer), public.claim_public_library_check(interval), public.apply_public_library(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_library(text[], integer), public.claim_public_library_check(interval), public.apply_public_library(text, jsonb) TO service_role;