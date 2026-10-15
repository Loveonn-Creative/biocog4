-- Applied through Lovable (drizzle). Source: supabase/pending-migrations/20261019100000_scope3_trail.sql
-- Rollback: supabase/pending-migrations/rollback/20261019100000_scope3_trail.rollback.sql
-- =============================================
-- Scope 3 supplier evidence trail.
-- Rollback: rollback/20261019100000_scope3_trail.rollback.sql
--
-- Additive only: four new tables, three views and one service-role function.
-- Nothing existing is changed.
--
-- - document_extractions: the OCR fields of an invoice exactly as read, sealed
--   by extract-document (service role) with a SHA-256 of their canonical JSON.
--   Immutable. The browser cannot write it, unlike documents.cached_result.
-- - scope3_factors: versioned emission factors, each with its GHG Protocol
--   Scope 3 category, material (HSN heading, freight mode, ...), geography
--   (a country, or one supplier by GSTIN), unit, data class, source,
--   publication year and validity dates. Approval needs a second person.
--   Immutable once approved, except retirement. SHIPS EMPTY: until sourced
--   factors are approved, every line stays Needs Data rather than estimated.
-- - scope3_documents: one row per sealed invoice, with its dedup key (supplier
--   GSTIN + invoice number + date, hashed) and reconciliation result. A unique
--   index lets an invoice be counted once per owner, however often uploaded.
-- - scope3_lines: one row per invoice line and calculation: source evidence,
--   classification, factor (with source/version/geography/material), activity
--   data, formula, kgCO2e, data class, checks, status and reasons. Append-only
--   with is_current; a recalculation inserts a new row.
-- Database rules back the shared method (supabase/functions/_shared/scope3.ts):
--   * kgCO2e exists only with a factor and activity, and equals their product;
--   * a factor on a line must be approved and match its category, value, unit,
--     key, version and data class;
--   * a "verified" line needs a counted (not duplicate) invoice, no open
--     reasons, a formula and a non-spend data class.
-- Owners read their own rows. All writes go through scope3_record_document
-- (service role only) from the extract-document and scope3-trail functions.
-- =============================================

-- ---------------------------------------------------------------------------
-- Sealed extraction
-- ---------------------------------------------------------------------------
CREATE TABLE public.document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  document_hash text NOT NULL CHECK (document_hash ~ '^[0-9a-f]{64}$'),
  extraction jsonb NOT NULL CHECK (jsonb_typeof(extraction) = 'object' AND jsonb_typeof(extraction->'lines') = 'array'),
  extraction_sha256 text NOT NULL CHECK (extraction_sha256 ~ '^[0-9a-f]{64}$'),
  model text,
  method_version text NOT NULL,
  source_file_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX document_extractions_user_idx ON public.document_extractions (user_id);

-- ---------------------------------------------------------------------------
-- Factor registry
-- ---------------------------------------------------------------------------
CREATE TABLE public.scope3_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_key text NOT NULL CHECK (factor_key ~ '^[A-Z0-9_]{3,80}$'),
  version text NOT NULL CHECK (length(btrim(version)) BETWEEN 1 AND 20),
  scope3_category smallint NOT NULL CHECK (scope3_category BETWEEN 1 AND 15),
  -- 'hsn:720810', 'hsn:7208', 'sac:998311', 'freight:road', 'travel:air', 'waste:landfill', 'stay:hotel'
  material_key text NOT NULL CHECK (material_key ~ '^(hsn:[0-9]{4}([0-9]{2})?|sac:99[0-9]{2}([0-9]{2})?|freight:(road|rail|air|sea)|travel:(road|rail|air)|waste:(landfill|recycling|incineration|composting|co_processing)|stay:hotel)$'),
  geography text NOT NULL CHECK (geography ~ '^([A-Z]{2}|SUPPLIER:[0-9]{2}[A-Z0-9]{13})$'),
  unit text NOT NULL CHECK (unit IN ('kg', 'tonne', 'litre', 'kl', 'kWh', 'MWh', 'scm', 'tkm', 'pkm', 'nos', 'night')),
  kg_co2e_per_unit numeric NOT NULL CHECK (kg_co2e_per_unit > 0 AND kg_co2e_per_unit < 1000000),
  data_class text NOT NULL CHECK (data_class IN ('primary_supplier', 'supplier_specific_factor', 'secondary_factor')),
  boundary text NOT NULL CHECK (length(btrim(boundary)) > 0),        -- e.g. 'cradle-to-gate', 'tank-to-wheel'
  gwp_basis text NOT NULL CHECK (length(btrim(gwp_basis)) > 0),      -- e.g. 'IPCC AR6 GWP100'
  source_name text NOT NULL CHECK (length(btrim(source_name)) > 0),
  source_ref text NOT NULL CHECK (length(btrim(source_ref)) > 0),    -- table, page or document reference
  publication_year smallint NOT NULL CHECK (publication_year BETWEEN 1990 AND 2100),
  evidence_document_id uuid REFERENCES public.documents(id) ON DELETE RESTRICT,
  valid_from date NOT NULL,
  valid_to date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'retired')),
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (factor_key, version),
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  -- Four eyes: approved by someone other than the author.
  CHECK (status = 'draft' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND approved_by <> created_by)),
  -- A supplier's own figure is tied to that supplier, and a country factor is secondary.
  CHECK ((geography LIKE 'SUPPLIER:%') = (data_class IN ('primary_supplier', 'supplier_specific_factor'))),
  -- A supplier's own figure needs its evidence on file.
  CHECK (data_class = 'secondary_factor' OR evidence_document_id IS NOT NULL)
);
CREATE INDEX scope3_factors_lookup_idx ON public.scope3_factors (scope3_category, material_key, geography) WHERE status = 'approved';

-- ---------------------------------------------------------------------------
-- Invoices and lines
-- ---------------------------------------------------------------------------
CREATE TABLE public.scope3_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE CASCADE,
  extraction_id uuid NOT NULL REFERENCES public.document_extractions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  owner_scope text GENERATED ALWAYS AS (COALESCE('org:' || organization_id::text, 'user:' || user_id::text)) STORED,
  invoice_key text CHECK (invoice_key IS NULL OR invoice_key ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('counted', 'duplicate', 'unidentified')),
  duplicate_of uuid REFERENCES public.scope3_documents(id) ON DELETE SET NULL,
  reconciliation jsonb NOT NULL,
  method_version text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'unidentified') = (invoice_key IS NULL)),
  CHECK (status <> 'counted' OR duplicate_of IS NULL)
);
-- The double-counting control: one counted invoice per owner and key.
CREATE UNIQUE INDEX scope3_documents_counted_once ON public.scope3_documents (owner_scope, invoice_key) WHERE status = 'counted';
CREATE INDEX scope3_documents_user_idx ON public.scope3_documents (user_id);

CREATE TABLE public.scope3_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope3_document_id uuid NOT NULL REFERENCES public.scope3_documents(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  extraction_id uuid NOT NULL REFERENCES public.document_extractions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  line_index integer NOT NULL CHECK (line_index >= 0),
  is_current boolean NOT NULL DEFAULT true,
  inputs_sha256 text NOT NULL CHECK (inputs_sha256 ~ '^[0-9a-f]{64}$'),
  -- Source evidence, as sealed
  supplier_gstin text,
  supplier_name text,
  invoice_number text,
  invoice_date date,
  description text NOT NULL,
  hsn_code text,
  quantity numeric,
  unit text,
  line_total numeric,
  source_page integer,
  source_text text,
  logistics jsonb,
  -- Classification
  scope smallint CHECK (scope IN (1, 2, 3)),
  scope3_category smallint CHECK (scope3_category BETWEEN 1 AND 15),
  classification_method text NOT NULL CHECK (classification_method IN ('HSN', 'SAC', 'KEYWORD', 'NONE')),
  classification_basis text NOT NULL,
  material_key text,
  -- Factor, copied from the registry at calculation time
  factor_id uuid REFERENCES public.scope3_factors(id) ON DELETE RESTRICT,
  factor_key text,
  factor_version text,
  factor_value numeric,
  factor_unit text,
  factor_source text,
  factor_geography text,
  factor_material text,
  data_class text NOT NULL CHECK (data_class IN ('primary_supplier', 'supplier_specific_factor', 'secondary_factor', 'spend_based', 'unverified')),
  -- Calculation
  activity_qty numeric,
  activity_unit text,
  formula text,
  kg_co2e numeric CHECK (kg_co2e IS NULL OR kg_co2e >= 0),
  status text NOT NULL CHECK (status IN ('verified', 'needs_data', 'needs_review', 'duplicate', 'not_scope3')),
  reasons text[] NOT NULL DEFAULT '{}',
  next_action text,
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence text CHECK (confidence IN ('high', 'medium', 'low')),
  method_version text NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  -- No number without a factor and activity; the number is their product.
  CHECK (kg_co2e IS NULL OR (factor_id IS NOT NULL AND activity_qty IS NOT NULL AND factor_value IS NOT NULL
         AND abs(kg_co2e - activity_qty * factor_value) <= 0.000001 * greatest(1, abs(kg_co2e)))),
  -- What "verified" requires.
  CHECK (status <> 'verified' OR (kg_co2e IS NOT NULL AND scope = 3 AND scope3_category IS NOT NULL AND formula IS NOT NULL
         AND cardinality(reasons) = 0 AND data_class IN ('primary_supplier', 'supplier_specific_factor', 'secondary_factor'))),
  CHECK (status = 'verified' OR status = 'not_scope3' OR cardinality(reasons) > 0)
);
CREATE UNIQUE INDEX scope3_lines_current ON public.scope3_lines (document_id, line_index) WHERE is_current;
CREATE INDEX scope3_lines_user_idx ON public.scope3_lines (user_id) WHERE is_current;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.scope3_immutable_extraction()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'A sealed extraction cannot be changed' USING ERRCODE = 'P0001';
END $$;
CREATE TRIGGER document_extractions_immutable BEFORE UPDATE ON public.document_extractions
  FOR EACH ROW EXECUTE FUNCTION public.scope3_immutable_extraction();

CREATE OR REPLACE FUNCTION public.scope3_guard_factor()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'An approved or retired factor cannot be deleted; retire it instead' USING ERRCODE = 'P0001'; END IF;
    RETURN OLD;
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status', 'approved_by', 'approved_at']) <> (to_jsonb(OLD) - ARRAY['status', 'approved_by', 'approved_at']) AND OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'An approved factor cannot be edited; add a new version' USING ERRCODE = 'P0001';
  END IF;
  IF NOT ((OLD.status = NEW.status AND OLD.status = 'draft')
          OR (OLD.status = 'draft' AND NEW.status = 'approved')
          OR (OLD.status = 'approved' AND NEW.status = 'retired' AND NEW.approved_by = OLD.approved_by AND NEW.approved_at = OLD.approved_at)) THEN
    RAISE EXCEPTION 'Factor status can only move draft -> approved -> retired' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER scope3_factors_guard BEFORE UPDATE OR DELETE ON public.scope3_factors
  FOR EACH ROW EXECUTE FUNCTION public.scope3_guard_factor();

CREATE OR REPLACE FUNCTION public.scope3_guard_line()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE f public.scope3_factors; d public.scope3_documents;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Append-only: the only change is retiring a row when a newer one replaces it.
    IF (to_jsonb(NEW) - 'is_current') <> (to_jsonb(OLD) - 'is_current') OR (NEW.is_current AND NOT OLD.is_current) THEN
      RAISE EXCEPTION 'A Scope 3 line is append-only' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO d FROM public.scope3_documents WHERE id = NEW.scope3_document_id;
  IF d.document_id IS DISTINCT FROM NEW.document_id OR d.extraction_id IS DISTINCT FROM NEW.extraction_id OR d.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Line does not belong to its invoice' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.factor_id IS NOT NULL THEN
    SELECT * INTO f FROM public.scope3_factors WHERE id = NEW.factor_id;
    IF f.status <> 'approved' OR f.scope3_category <> NEW.scope3_category OR f.kg_co2e_per_unit <> NEW.factor_value
       OR f.unit <> NEW.factor_unit OR f.factor_key <> NEW.factor_key OR f.version <> NEW.factor_version
       OR f.data_class <> NEW.data_class OR f.geography <> NEW.factor_geography OR f.material_key <> NEW.factor_material THEN
      RAISE EXCEPTION 'Line factor does not match an approved factor' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.data_class NOT IN ('unverified') THEN
    RAISE EXCEPTION 'A data class other than unverified needs a factor' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'verified' AND d.status <> 'counted' THEN
    RAISE EXCEPTION 'Only a counted invoice can have verified lines' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER scope3_lines_guard BEFORE INSERT OR UPDATE ON public.scope3_lines
  FOR EACH ROW EXECUTE FUNCTION public.scope3_guard_line();

-- ---------------------------------------------------------------------------
-- The one write path: record an invoice and its lines atomically
-- ---------------------------------------------------------------------------
-- p = { document_id, extraction_id, user_id, organization_id, invoice_key,
--       reconciliation, method_version, lines: [ { line_index, inputs_sha256, ...columns } ] }
CREATE OR REPLACE FUNCTION public.scope3_record_document(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_doc public.scope3_documents;
  v_owner text := COALESCE('org:' || (p->>'organization_id'), 'user:' || (p->>'user_id'));
  v_key text := NULLIF(p->>'invoice_key', '');
  v_status text;
  v_dup uuid;
  v_ext public.document_extractions;
  l jsonb;
  v_row public.scope3_lines;
  v_cur public.scope3_lines;
  v_written int := 0;
  v_kept int := 0;
  v_indexes int[] := '{}';
BEGIN
  SELECT * INTO v_ext FROM public.document_extractions WHERE id = (p->>'extraction_id')::uuid;
  IF v_ext.id IS NULL OR v_ext.document_id <> (p->>'document_id')::uuid OR v_ext.user_id <> (p->>'user_id')::uuid THEN
    RAISE EXCEPTION 'No sealed extraction for this invoice' USING ERRCODE = 'P0001';
  END IF;
  IF v_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_owner || '|' || v_key, 0));
    SELECT id INTO v_dup FROM public.scope3_documents
      WHERE owner_scope = v_owner AND invoice_key = v_key AND status = 'counted' AND document_id <> (p->>'document_id')::uuid
      ORDER BY processed_at LIMIT 1;
  END IF;
  v_status := CASE WHEN v_key IS NULL THEN 'unidentified' WHEN v_dup IS NOT NULL THEN 'duplicate' ELSE 'counted' END;

  INSERT INTO public.scope3_documents (document_id, extraction_id, user_id, organization_id, invoice_key, status, duplicate_of, reconciliation, method_version)
  VALUES ((p->>'document_id')::uuid, v_ext.id, v_ext.user_id, v_ext.organization_id, v_key, v_status, v_dup, COALESCE(p->'reconciliation', '{}'::jsonb), p->>'method_version')
  ON CONFLICT (document_id) DO UPDATE SET invoice_key = EXCLUDED.invoice_key, status = EXCLUDED.status, duplicate_of = EXCLUDED.duplicate_of,
    reconciliation = EXCLUDED.reconciliation, method_version = EXCLUDED.method_version, processed_at = now()
  RETURNING * INTO v_doc;

  FOR l IN SELECT * FROM jsonb_array_elements(COALESCE(p->'lines', '[]'::jsonb)) LOOP
    v_row := jsonb_populate_record(NULL::public.scope3_lines, l);
    v_row.id := gen_random_uuid();
    v_row.scope3_document_id := v_doc.id;
    v_row.document_id := v_doc.document_id;
    v_row.extraction_id := v_doc.extraction_id;
    v_row.user_id := v_doc.user_id;
    v_row.organization_id := v_doc.organization_id;
    v_row.is_current := true;
    v_row.method_version := p->>'method_version';
    v_row.calculated_at := now();
    -- An invoice already counted from another upload: its lines never count again.
    IF v_doc.status = 'duplicate' AND v_row.status <> 'not_scope3' THEN
      v_row.status := 'duplicate';
      v_row.reasons := ARRAY(SELECT DISTINCT unnest(v_row.reasons || ARRAY['duplicate_invoice']) ORDER BY 1);
    END IF;
    v_indexes := v_indexes || v_row.line_index;
    SELECT * INTO v_cur FROM public.scope3_lines WHERE document_id = v_doc.document_id AND line_index = v_row.line_index AND is_current;
    IF v_cur.id IS NOT NULL AND v_cur.inputs_sha256 = v_row.inputs_sha256 AND v_cur.status = v_row.status THEN
      v_kept := v_kept + 1;
      CONTINUE;
    END IF;
    IF v_cur.id IS NOT NULL THEN UPDATE public.scope3_lines SET is_current = false WHERE id = v_cur.id; END IF;
    INSERT INTO public.scope3_lines SELECT v_row.*;
    v_written := v_written + 1;
  END LOOP;
  -- Lines no longer in the extraction stop being current.
  UPDATE public.scope3_lines SET is_current = false
    WHERE document_id = v_doc.document_id AND is_current AND NOT (line_index = ANY (v_indexes));

  RETURN jsonb_build_object('scope3_document_id', v_doc.id, 'status', v_doc.status, 'duplicate_of', v_doc.duplicate_of, 'written', v_written, 'kept', v_kept);
END $$;
REVOKE ALL ON FUNCTION public.scope3_record_document(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scope3_record_document(jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- Read side: the current trail and its aggregates (owner's rows via RLS)
-- ---------------------------------------------------------------------------
CREATE VIEW public.scope3_trail WITH (security_invoker = true) AS
SELECT l.*, d.status AS invoice_status, d.duplicate_of, d.reconciliation, e.extraction_sha256, e.document_hash, e.source_file_path, e.model AS extraction_model, e.created_at AS sealed_at
FROM public.scope3_lines l
JOIN public.scope3_documents d ON d.id = l.scope3_document_id
JOIN public.document_extractions e ON e.id = l.extraction_id
WHERE l.is_current;

CREATE VIEW public.scope3_category_totals WITH (security_invoker = true) AS
SELECT l.user_id, l.organization_id, l.scope3_category,
       sum(l.kg_co2e) AS verified_kg, count(*) AS verified_lines,
       count(*) FILTER (WHERE l.data_class IN ('primary_supplier', 'supplier_specific_factor')) AS supplier_data_lines
FROM public.scope3_lines l
JOIN public.scope3_documents d ON d.id = l.scope3_document_id AND d.status = 'counted'
WHERE l.is_current AND l.status = 'verified'
GROUP BY l.user_id, l.organization_id, l.scope3_category;

CREATE VIEW public.scope3_supplier_ledger WITH (security_invoker = true) AS
SELECT l.user_id, l.organization_id,
       COALESCE(l.supplier_gstin, 'unidentified') AS supplier_key,
       max(l.supplier_name) AS supplier_name,
       sum(l.kg_co2e) FILTER (WHERE l.status = 'verified') AS verified_kg,
       count(*) FILTER (WHERE l.status = 'verified') AS verified_lines,
       count(*) AS scope3_lines,
       count(*) FILTER (WHERE l.status = 'needs_data') AS needs_data_lines,
       count(*) FILTER (WHERE l.status = 'needs_review') AS needs_review_lines,
       count(*) FILTER (WHERE l.status = 'verified' AND l.data_class = 'primary_supplier') AS primary_lines,
       count(*) FILTER (WHERE l.status = 'verified' AND l.data_class = 'supplier_specific_factor') AS supplier_factor_lines,
       count(*) FILTER (WHERE l.status = 'verified' AND l.data_class = 'secondary_factor') AS secondary_lines,
       sum(l.line_total) FILTER (WHERE l.status = 'verified') AS verified_spend,
       sum(l.line_total) AS spend
FROM public.scope3_lines l
JOIN public.scope3_documents d ON d.id = l.scope3_document_id AND d.status = 'counted'
WHERE l.is_current AND l.status IN ('verified', 'needs_data', 'needs_review')
GROUP BY l.user_id, l.organization_id, COALESCE(l.supplier_gstin, 'unidentified');

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope3_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope3_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope3_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their sealed extractions" ON public.document_extractions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Signed-in users read approved factors" ON public.scope3_factors FOR SELECT TO authenticated USING (status IN ('approved', 'retired'));
CREATE POLICY "Owners read their Scope 3 invoices" ON public.scope3_documents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners read their Scope 3 lines" ON public.scope3_lines FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.document_extractions, public.scope3_factors, public.scope3_documents, public.scope3_lines FROM anon, authenticated;
REVOKE ALL ON public.scope3_trail, public.scope3_category_totals, public.scope3_supplier_ledger FROM anon, authenticated;
GRANT SELECT ON public.document_extractions, public.scope3_factors, public.scope3_documents, public.scope3_lines TO authenticated;
GRANT SELECT ON public.scope3_trail, public.scope3_category_totals, public.scope3_supplier_ledger TO authenticated;
GRANT ALL ON public.document_extractions, public.scope3_factors, public.scope3_documents, public.scope3_lines TO service_role;
GRANT SELECT ON public.scope3_trail, public.scope3_category_totals, public.scope3_supplier_ledger TO service_role;
REVOKE ALL ON FUNCTION public.scope3_immutable_extraction(), public.scope3_guard_factor(), public.scope3_guard_line() FROM PUBLIC, anon, authenticated;
