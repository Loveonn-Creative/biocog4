-- =============================================
-- Water-bill MRV tables, behind a switch that is OFF (approved for apply 2026-10-12).
-- Purely additive: creates new water_* objects only. No existing table,
-- policy, function or row is changed. Rollback:
--   supabase/pending-migrations/rollback/20261012120000_water_mrv.rollback.sql
-- Methodology: docs/methodology/water-mrv.md
-- =============================================
BEGIN;

-- ---------------------------------------------
-- Feature switch (single row, OFF). Only the DB owner or service_role can turn it on.
-- ---------------------------------------------
CREATE TABLE public.water_mrv_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  gwp_basis text NOT NULL DEFAULT 'AR5',
  period_basis text NOT NULL DEFAULT 'INDIA_FY' CHECK (period_basis IN ('CALENDAR','INDIA_FY')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
INSERT INTO public.water_mrv_settings (id, enabled) VALUES (true, false);

-- Roles per reporting entity (segregation of duties is enforced in the RPCs).
CREATE TABLE public.water_mrv_role (
  user_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('VIEWER','PREPARER','REVIEWER','APPROVER','FACTOR_STEWARD')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_id, role)
);

-- ---------------------------------------------
-- Emission factors: versioned; a value never changes in place.
-- Ships EMPTY. Rows are loaded by a factor steward from the cited publication.
-- ---------------------------------------------
CREATE TABLE public.water_emission_factor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_key text NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  activity_type text NOT NULL CHECK (activity_type IN ('WATER_SUPPLY','WATER_WASTEWATER_TREATMENT')),
  value numeric NOT NULL CHECK (value >= 0),
  unit text NOT NULL,
  geography_type text NOT NULL CHECK (geography_type IN ('SUPPLIER','COUNTRY','REGION')),
  geography text NOT NULL,
  valid_from date NOT NULL,
  valid_to date,
  source_name text NOT NULL CHECK (length(trim(source_name)) > 0),
  source_url text,
  source_table_ref text,
  source_publication_year integer NOT NULL CHECK (source_publication_year BETWEEN 1990 AND 2100),
  gwp_basis text NOT NULL CHECK (gwp_basis IN ('AR4','AR5','AR6')),
  uncertainty numeric CHECK (uncertainty IS NULL OR uncertainty >= 0),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','RETIRED')),
  approved_for_proxy boolean NOT NULL DEFAULT false,
  proxy_for_country text,
  created_by text NOT NULL,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (factor_key, version),
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CHECK (status = 'DRAFT' OR (approved_by IS NOT NULL AND approved_by <> created_by))
);

-- Allowed changes: DRAFT -> APPROVED -> RETIRED (and DRAFT -> RETIRED), approval fields,
-- proxy approval while DRAFT. Everything else needs a new version. No deletes.
CREATE FUNCTION public.water_factor_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'water_emission_factor rows are never deleted; retire them'; END IF;
  IF (NEW.factor_key, NEW.version, NEW.activity_type, NEW.value, NEW.unit, NEW.geography_type, NEW.geography,
      NEW.valid_from, NEW.source_name, NEW.source_publication_year, NEW.gwp_basis, NEW.created_by)
     IS DISTINCT FROM
     (OLD.factor_key, OLD.version, OLD.activity_type, OLD.value, OLD.unit, OLD.geography_type, OLD.geography,
      OLD.valid_from, OLD.source_name, OLD.source_publication_year, OLD.gwp_basis, OLD.created_by) THEN
    RAISE EXCEPTION 'factor values are immutable; insert a new version';
  END IF;
  IF OLD.status = 'RETIRED' THEN RAISE EXCEPTION 'a retired factor cannot change'; END IF;
  IF OLD.status = 'APPROVED' AND NEW.status = 'DRAFT' THEN RAISE EXCEPTION 'an approved factor cannot return to draft'; END IF;
  IF OLD.status = 'APPROVED' AND (NEW.approved_for_proxy, NEW.proxy_for_country, NEW.uncertainty, NEW.valid_to, NEW.approved_by, NEW.approved_at)
     IS DISTINCT FROM (OLD.approved_for_proxy, OLD.proxy_for_country, OLD.uncertainty, OLD.valid_to, OLD.approved_by, OLD.approved_at)
     AND NEW.status <> 'RETIRED' THEN
    RAISE EXCEPTION 'an approved factor cannot change; insert a new version';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER water_factor_guard BEFORE UPDATE OR DELETE ON public.water_emission_factor
  FOR EACH ROW EXECUTE FUNCTION public.water_factor_guard();

-- ---------------------------------------------
-- Scope / category mapping (configuration, I9). Ships EMPTY.
-- ---------------------------------------------
CREATE TABLE public.water_category_mapping_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid,                               -- NULL = default for every entity
  activity_type text NOT NULL CHECK (activity_type IN ('WATER_SUPPLY','WATER_WASTEWATER_TREATMENT')),
  scope smallint NOT NULL CHECK (scope IN (1,2,3)),
  scope3_category smallint,
  valid_from date NOT NULL,
  valid_to date,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','RETIRED')),
  basis text NOT NULL CHECK (length(trim(basis)) > 0),
  created_by text NOT NULL,
  approved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope = 3 AND scope3_category IS NOT NULL AND scope3_category BETWEEN 1 AND 15) OR (scope IN (1,2) AND scope3_category IS NULL)),
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CHECK (status = 'DRAFT' OR (approved_by IS NOT NULL AND approved_by <> created_by))
);

-- ---------------------------------------------
-- Bills (append-only; a corrected bill is a new row).
-- ---------------------------------------------
CREATE TABLE public.water_bill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  entity_id uuid NOT NULL,
  site_id text,
  supplier_id text,
  country_code text CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  region_code text,
  billing_period_start date,
  billing_period_end date,
  volume_raw numeric,
  unit_raw text,
  volume_m3 numeric,                            -- NULL when unit unknown or volume unreadable
  volume_kind text NOT NULL CHECK (volume_kind IN ('SUPPLY','WASTEWATER','COMBINED_UNSPLIT')),
  reading_type text NOT NULL CHECK (reading_type IN ('ACTUAL','ESTIMATED_BY_UTILITY')),
  source_document_ref text,
  corrects_bill_id uuid REFERENCES public.water_bill(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX water_bill_entity_idx ON public.water_bill (entity_id, billing_period_start);

-- One row per calculation run (ingest or approved recalculation).
CREATE TABLE public.water_calc_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('INGEST','RECALC','SHADOW')),
  method_version text NOT NULL,
  gwp_basis text NOT NULL,
  period_basis text NOT NULL,
  planned_by text NOT NULL,
  approved_by text,
  restatement_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'RECALC' OR (approved_by IS NOT NULL AND approved_by <> planned_by))
);

-- Periods closed for reporting; changing them needs a restatement reason.
CREATE TABLE public.water_locked_period (
  entity_id uuid NOT NULL,
  allocation_period text NOT NULL,
  locked_by text NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id, allocation_period)
);

-- ---------------------------------------------
-- Results: append-only and versioned (I7). Lineage stored in full (I4).
-- ---------------------------------------------
CREATE TABLE public.water_emission_result (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  water_bill_id uuid NOT NULL REFERENCES public.water_bill(id),
  entity_id uuid NOT NULL,
  allocation_period text NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  supersedes_id uuid REFERENCES public.water_emission_result(id),
  is_current boolean NOT NULL DEFAULT true,
  calc_run_id uuid NOT NULL REFERENCES public.water_calc_run(id),
  allocated_volume_m3 numeric,
  allocation_method text NOT NULL CHECK (allocation_method IN ('WHOLE_PERIOD','PRO_RATA_DAYS')),
  status text NOT NULL CHECK (status IN ('CALCULATED','ESTIMATED_PROXY','UNAVAILABLE_FACTOR_PENDING','INVALID_INPUT')),
  emissions_kgco2e numeric,
  activity_type text,
  factor_id uuid REFERENCES public.water_emission_factor(id),
  factor_version integer,
  factor_value numeric,
  factor_unit text,
  factor_source text,
  factor_geography text,
  factor_year integer,
  gwp_basis text,
  factor_uncertainty numeric,
  factor_tier text NOT NULL CHECK (factor_tier IN ('A','B','none')),
  resolution_trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope smallint,
  scope3_category smallint,
  mapping_status text NOT NULL CHECK (mapping_status IN ('MAPPED','MAPPING_PENDING_REVIEW')),
  mapping_rule_id uuid REFERENCES public.water_category_mapping_rule(id),
  reasons text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (water_bill_id, allocation_period, version),
  -- I2: without a factor there is no number. Never 0.
  CHECK (factor_id IS NOT NULL OR emissions_kgco2e IS NULL),
  CHECK (status IN ('CALCULATED','ESTIMATED_PROXY') = (emissions_kgco2e IS NOT NULL)),
  CHECK (factor_tier <> 'none' OR factor_id IS NULL),
  CHECK (mapping_status <> 'MAPPED' OR scope IS NOT NULL)
);
CREATE UNIQUE INDEX water_result_one_current ON public.water_emission_result (water_bill_id, allocation_period) WHERE is_current;
CREATE INDEX water_result_entity_idx ON public.water_emission_result (entity_id, allocation_period) WHERE is_current;

-- Only change ever allowed: is_current true -> false when superseded.
CREATE FUNCTION public.water_result_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'water_emission_result is append-only'; END IF;
  IF (to_jsonb(NEW) - 'is_current') IS DISTINCT FROM (to_jsonb(OLD) - 'is_current')
     OR NOT (OLD.is_current AND NOT NEW.is_current) THEN
    RAISE EXCEPTION 'water_emission_result is append-only; insert a new version';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER water_result_guard BEFORE UPDATE OR DELETE ON public.water_emission_result
  FOR EACH ROW EXECUTE FUNCTION public.water_result_guard();

-- ---------------------------------------------
-- Data-gap flags with a state machine.
-- ---------------------------------------------
CREATE TABLE public.water_data_gap_flag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  water_bill_id uuid NOT NULL REFERENCES public.water_bill(id),
  entity_id uuid NOT NULL,
  emission_result_id uuid REFERENCES public.water_emission_result(id),
  allocation_period text,
  reason_code text NOT NULL CHECK (reason_code IN ('NO_FACTOR','PROXY_FACTOR_USED','AMBIGUOUS_FACTOR','GWP_BASIS_MISMATCH',
    'COMBINED_UNSPLIT','MAPPING_PENDING','UTILITY_ESTIMATED_READING','PERIOD_SPANS_YEARS','UNKNOWN_UNIT','MISSING_FIELD','NEGATIVE_VOLUME_UNMATCHED')),
  severity text NOT NULL CHECK (severity IN ('High','Medium','Low')),
  owner_role text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','ACCEPTED_RISK')),
  detail text,
  resolution_note text,
  actor text,
  approver text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'ACCEPTED_RISK' OR (approver IS NOT NULL AND actor IS NOT NULL AND approver <> actor AND length(trim(coalesce(resolution_note,''))) > 0)),
  CHECK (status <> 'RESOLVED' OR length(trim(coalesce(resolution_note,''))) > 0)
);
CREATE UNIQUE INDEX water_flag_one_live ON public.water_data_gap_flag (water_bill_id, coalesce(allocation_period,'-'), reason_code)
  WHERE status IN ('OPEN','IN_PROGRESS','ACCEPTED_RISK');

CREATE FUNCTION public.water_flag_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'flags are never deleted'; END IF;
  IF OLD.status IN ('RESOLVED','ACCEPTED_RISK') THEN RAISE EXCEPTION 'flag % is closed', OLD.id; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','resolution_note','actor','approver','updated_at'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','resolution_note','actor','approver','updated_at']) THEN
    RAISE EXCEPTION 'only the status of a flag can change';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER water_flag_guard BEFORE UPDATE OR DELETE ON public.water_data_gap_flag
  FOR EACH ROW EXECUTE FUNCTION public.water_flag_guard();

-- ---------------------------------------------
-- Audit trail (immutable).
-- ---------------------------------------------
CREATE TABLE public.water_audit_event (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  action text NOT NULL,
  entity_id uuid,
  subject_table text NOT NULL,
  subject_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE FUNCTION public.water_audit_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'water_audit_event is immutable'; END $$;
CREATE TRIGGER water_audit_immutable BEFORE UPDATE OR DELETE ON public.water_audit_event
  FOR EACH ROW EXECUTE FUNCTION public.water_audit_immutable();
CREATE TRIGGER water_audit_no_truncate BEFORE TRUNCATE ON public.water_audit_event
  FOR EACH STATEMENT EXECUTE FUNCTION public.water_audit_immutable();

-- ---------------------------------------------
-- Persist one pipeline run for one bill in one transaction (PERSIST + AUDIT).
-- p: { actor, kind ('INGEST' default | 'SHADOW'), method_version, bill:{...}, results:[{...}], flags:[{...}] }
-- Results reference factors and rules by id; rows are taken as computed by
-- supabase/functions/_shared/water/pipeline.ts. Re-ingesting the same bill is a no-op.
-- ---------------------------------------------
CREATE FUNCTION public.water_persist_run(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.water_mrv_settings;
  b jsonb := p->'bill';
  v_bill uuid; v_run uuid; v_res uuid; r jsonb; f jsonb;
  v_ids jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO s FROM public.water_mrv_settings WHERE id;
  IF NOT coalesce(s.enabled, false) THEN RAISE EXCEPTION 'water MRV is disabled' USING ERRCODE = 'P0001'; END IF;

  SELECT id INTO v_bill FROM public.water_bill WHERE idempotency_key = b->>'idempotency_key';
  IF v_bill IS NOT NULL THEN
    RETURN jsonb_build_object('status','duplicate','water_bill_id',v_bill);
  END IF;

  INSERT INTO public.water_bill (idempotency_key, entity_id, site_id, supplier_id, country_code, region_code,
    billing_period_start, billing_period_end, volume_raw, unit_raw, volume_m3, volume_kind, reading_type,
    source_document_ref, corrects_bill_id)
  VALUES (b->>'idempotency_key', (b->>'entity_id')::uuid, b->>'site_id', b->>'supplier_id', b->>'country_code', b->>'region_code',
    (b->>'billing_period_start')::date, (b->>'billing_period_end')::date, (b->>'volume_raw')::numeric, b->>'unit_raw',
    (b->>'volume_m3')::numeric, b->>'volume_kind', b->>'reading_type', b->>'source_document_ref', (b->>'corrects_bill_id')::uuid)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_bill;
  IF v_bill IS NULL THEN  -- lost a race with an identical ingest
    SELECT id INTO v_bill FROM public.water_bill WHERE idempotency_key = b->>'idempotency_key';
    RETURN jsonb_build_object('status','duplicate','water_bill_id',v_bill);
  END IF;

  INSERT INTO public.water_calc_run (kind, method_version, gwp_basis, period_basis, planned_by)
  VALUES (CASE WHEN p->>'kind' = 'SHADOW' THEN 'SHADOW' ELSE 'INGEST' END, p->>'method_version', s.gwp_basis, s.period_basis, p->>'actor')
  RETURNING id INTO v_run;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p->'results','[]'::jsonb)) LOOP
    INSERT INTO public.water_emission_result (water_bill_id, entity_id, allocation_period, version, calc_run_id,
      allocated_volume_m3, allocation_method, status, emissions_kgco2e, activity_type, factor_id, factor_version, factor_value,
      factor_unit, factor_source, factor_geography, factor_year, gwp_basis, factor_uncertainty, factor_tier, resolution_trace,
      scope, scope3_category, mapping_status, mapping_rule_id, reasons)
    VALUES (v_bill, (b->>'entity_id')::uuid, r->>'allocation_period', 1, v_run,
      (r->>'allocated_volume_m3')::numeric, r->>'allocation_method', r->>'status', (r->>'emissions_kgco2e')::numeric, r->>'activity_type',
      (r->>'factor_id')::uuid, (r->>'factor_version')::int, (r->>'factor_value')::numeric, r->>'factor_unit', r->>'factor_source',
      r->>'factor_geography', (r->>'factor_year')::int, r->>'gwp_basis', (r->>'factor_uncertainty')::numeric, r->>'factor_tier',
      coalesce(r->'resolution_trace','[]'::jsonb), (r->>'scope')::smallint, (r->>'scope3_category')::smallint, r->>'mapping_status',
      (r->>'mapping_rule_id')::uuid, ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'reasons','[]'::jsonb))))
    RETURNING id INTO v_res;
    v_ids := v_ids || jsonb_build_object(r->>'allocation_period', v_res);
  END LOOP;

  FOR f IN SELECT * FROM jsonb_array_elements(coalesce(p->'flags','[]'::jsonb)) LOOP
    INSERT INTO public.water_data_gap_flag (water_bill_id, entity_id, emission_result_id, allocation_period, reason_code,
      severity, owner_role, due_date, detail)
    VALUES (v_bill, (b->>'entity_id')::uuid, (v_ids->>coalesce(f->>'allocation_period','UNALLOCATED'))::uuid, f->>'allocation_period',
      f->>'reason_code', f->>'severity', f->>'owner_role', (f->>'due_date')::date, f->>'detail')
    ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO public.water_audit_event (actor, action, entity_id, subject_table, subject_id, payload)
  VALUES (p->>'actor', CASE WHEN p->>'kind' = 'SHADOW' THEN 'SHADOW_INGEST' ELSE 'INGEST' END, (b->>'entity_id')::uuid, 'water_bill', v_bill::text,
          jsonb_build_object('calc_run_id', v_run, 'results', jsonb_array_length(coalesce(p->'results','[]'::jsonb)),
                             'flags', jsonb_array_length(coalesce(p->'flags','[]'::jsonb))));
  RETURN jsonb_build_object('status','stored','water_bill_id',v_bill,'calc_run_id',v_run,'result_ids',v_ids);
END $$;

-- ---------------------------------------------
-- Apply an approved recalculation plan (from recalc.ts applyPlan) atomically.
-- p: { planned_by, approved_by, method_version, restatement_reason?, entity_id,
--      inserts:[{ water_bill_id, supersedes_id?, ...result fields }], flags:[...] }
-- Fails if any superseded row is no longer current (a concurrent change).
-- ---------------------------------------------
CREATE FUNCTION public.water_apply_recalc(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.water_mrv_settings;
  v_run uuid; v_res uuid; r jsonb; f jsonb; old public.water_emission_result;
  v_version int; n int := 0;
BEGIN
  SELECT * INTO s FROM public.water_mrv_settings WHERE id;
  IF NOT coalesce(s.enabled, false) THEN RAISE EXCEPTION 'water MRV is disabled' USING ERRCODE = 'P0001'; END IF;
  IF coalesce(p->>'planned_by','') = '' OR coalesce(p->>'approved_by','') = '' OR p->>'planned_by' = p->>'approved_by' THEN
    RAISE EXCEPTION 'a recalculation needs a planner and a different approver';
  END IF;

  INSERT INTO public.water_calc_run (kind, method_version, gwp_basis, period_basis, planned_by, approved_by, restatement_reason)
  VALUES ('RECALC', p->>'method_version', s.gwp_basis, s.period_basis, p->>'planned_by', p->>'approved_by', p->>'restatement_reason')
  RETURNING id INTO v_run;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p->'inserts','[]'::jsonb)) LOOP
    IF EXISTS (SELECT 1 FROM public.water_locked_period l WHERE l.entity_id = (p->>'entity_id')::uuid
               AND l.allocation_period = r->>'allocation_period')
       AND coalesce(trim(p->>'restatement_reason'),'') = '' THEN
      RAISE EXCEPTION 'period % is locked; a restatement reason is required', r->>'allocation_period';
    END IF;
    v_version := 1;
    IF r->>'supersedes_id' IS NOT NULL THEN
      SELECT * INTO old FROM public.water_emission_result WHERE id = (r->>'supersedes_id')::uuid FOR UPDATE;
      IF old.id IS NULL OR NOT old.is_current OR old.water_bill_id <> (r->>'water_bill_id')::uuid THEN
        RAISE EXCEPTION 'stale plan: result % is no longer current', r->>'supersedes_id';
      END IF;
      UPDATE public.water_emission_result SET is_current = false WHERE id = old.id;
      v_version := old.version + 1;
    END IF;
    INSERT INTO public.water_emission_result (water_bill_id, entity_id, allocation_period, version, supersedes_id, calc_run_id,
      allocated_volume_m3, allocation_method, status, emissions_kgco2e, activity_type, factor_id, factor_version, factor_value,
      factor_unit, factor_source, factor_geography, factor_year, gwp_basis, factor_uncertainty, factor_tier, resolution_trace,
      scope, scope3_category, mapping_status, mapping_rule_id, reasons)
    VALUES ((r->>'water_bill_id')::uuid, (p->>'entity_id')::uuid, r->>'allocation_period', v_version, (r->>'supersedes_id')::uuid, v_run,
      (r->>'allocated_volume_m3')::numeric, r->>'allocation_method', r->>'status', (r->>'emissions_kgco2e')::numeric, r->>'activity_type',
      (r->>'factor_id')::uuid, (r->>'factor_version')::int, (r->>'factor_value')::numeric, r->>'factor_unit', r->>'factor_source',
      r->>'factor_geography', (r->>'factor_year')::int, r->>'gwp_basis', (r->>'factor_uncertainty')::numeric, r->>'factor_tier',
      coalesce(r->'resolution_trace','[]'::jsonb), (r->>'scope')::smallint, (r->>'scope3_category')::smallint, r->>'mapping_status',
      (r->>'mapping_rule_id')::uuid, ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'reasons','[]'::jsonb))))
    RETURNING id INTO v_res;

    -- Auto-resolve live flags on this bill/period whose reason the new result no longer carries.
    UPDATE public.water_data_gap_flag g
       SET status = 'RESOLVED', resolution_note = 'auto-resolved by superseding run ' || v_run, actor = 'system'
     WHERE g.water_bill_id = (r->>'water_bill_id')::uuid AND g.allocation_period = r->>'allocation_period'
       AND g.status IN ('OPEN','IN_PROGRESS')
       AND NOT (g.reason_code = ANY (ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'reasons','[]'::jsonb)))));
    n := n + 1;
  END LOOP;

  FOR f IN SELECT * FROM jsonb_array_elements(coalesce(p->'flags','[]'::jsonb)) LOOP
    INSERT INTO public.water_data_gap_flag (water_bill_id, entity_id, allocation_period, reason_code, severity, owner_role, due_date, detail)
    VALUES ((f->>'water_bill_id')::uuid, (p->>'entity_id')::uuid, f->>'allocation_period', f->>'reason_code', f->>'severity',
            f->>'owner_role', (f->>'due_date')::date, f->>'detail')
    ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO public.water_audit_event (actor, action, entity_id, subject_table, subject_id, payload)
  VALUES (p->>'approved_by', 'RECALC_APPLIED', (p->>'entity_id')::uuid, 'water_calc_run', v_run::text,
          jsonb_build_object('planned_by', p->>'planned_by', 'new_versions', n, 'restatement_reason', p->>'restatement_reason'));
  RETURN jsonb_build_object('status','applied','calc_run_id',v_run,'new_versions',n);
END $$;

-- Flag transitions go through here so the actor is recorded and audited.
CREATE FUNCTION public.water_transition_flag(p_flag uuid, p_to text, p_actor text, p_note text DEFAULT NULL, p_approver text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE g public.water_data_gap_flag;
BEGIN
  SELECT * INTO g FROM public.water_data_gap_flag WHERE id = p_flag FOR UPDATE;
  IF g.id IS NULL THEN RAISE EXCEPTION 'flag not found'; END IF;
  IF p_to NOT IN ('OPEN','IN_PROGRESS','RESOLVED','ACCEPTED_RISK') OR p_to = g.status THEN RAISE EXCEPTION 'invalid transition'; END IF;
  UPDATE public.water_data_gap_flag SET status = p_to, actor = p_actor, resolution_note = p_note, approver = p_approver WHERE id = p_flag;
  INSERT INTO public.water_audit_event (actor, action, entity_id, subject_table, subject_id, payload)
  VALUES (p_actor, 'FLAG_' || p_to, g.entity_id, 'water_data_gap_flag', p_flag::text,
          jsonb_build_object('from', g.status, 'approver', p_approver, 'note', p_note));
END $$;

REVOKE ALL ON FUNCTION public.water_persist_run(jsonb), public.water_apply_recalc(jsonb),
  public.water_transition_flag(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.water_persist_run(jsonb), public.water_apply_recalc(jsonb),
  public.water_transition_flag(uuid, text, text, text, text) TO service_role;

-- ---------------------------------------------
-- RLS: read-only for members of the entity; every write goes through service_role.
-- ---------------------------------------------
ALTER TABLE public.water_mrv_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_mrv_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_emission_factor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_category_mapping_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_bill ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_calc_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_locked_period ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_emission_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_data_gap_flag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_audit_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own water roles" ON public.water_mrv_role FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "approved water factors" ON public.water_emission_factor FOR SELECT TO authenticated USING (status <> 'DRAFT');
CREATE POLICY "approved water mappings" ON public.water_category_mapping_rule FOR SELECT TO authenticated
  USING (status <> 'DRAFT' AND (entity_id IS NULL OR entity_id IN (SELECT r.entity_id FROM public.water_mrv_role r WHERE r.user_id = auth.uid())));
CREATE POLICY "entity water bills" ON public.water_bill FOR SELECT TO authenticated
  USING (entity_id IN (SELECT r.entity_id FROM public.water_mrv_role r WHERE r.user_id = auth.uid()));
CREATE POLICY "entity water results" ON public.water_emission_result FOR SELECT TO authenticated
  USING (entity_id IN (SELECT r.entity_id FROM public.water_mrv_role r WHERE r.user_id = auth.uid()));
CREATE POLICY "entity water flags" ON public.water_data_gap_flag FOR SELECT TO authenticated
  USING (entity_id IN (SELECT r.entity_id FROM public.water_mrv_role r WHERE r.user_id = auth.uid()));
CREATE POLICY "entity locked periods" ON public.water_locked_period FOR SELECT TO authenticated
  USING (entity_id IN (SELECT r.entity_id FROM public.water_mrv_role r WHERE r.user_id = auth.uid()));
-- water_mrv_settings, water_calc_run and water_audit_event: no client policies (service_role only).

REVOKE ALL ON public.water_mrv_settings, public.water_mrv_role, public.water_emission_factor, public.water_category_mapping_rule,
  public.water_bill, public.water_calc_run, public.water_locked_period, public.water_emission_result,
  public.water_data_gap_flag, public.water_audit_event FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.water_mrv_settings, public.water_mrv_role, public.water_emission_factor,
  public.water_category_mapping_rule, public.water_bill, public.water_calc_run, public.water_locked_period,
  public.water_emission_result, public.water_data_gap_flag, public.water_audit_event FROM authenticated;
REVOKE ALL ON public.water_mrv_settings, public.water_calc_run, public.water_audit_event FROM authenticated;
REVOKE ALL ON SEQUENCE public.water_audit_event_id_seq FROM anon, authenticated;

COMMIT;
