-- Behaviour tests for 20261012120000_water_mrv.sql. Each block raises on failure.
\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.expect_error(sql text, needle text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE sql; EXCEPTION WHEN OTHERS THEN
    IF position(needle IN SQLERRM) = 0 THEN RAISE EXCEPTION 'expected error containing "%", got "%"', needle, SQLERRM; END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'expected an error containing "%" but the statement succeeded: %', needle, sql;
END $$;

-- 1. Switch ships OFF and the RPC refuses to write.
DO $$ BEGIN
  IF (SELECT enabled FROM public.water_mrv_settings) THEN RAISE EXCEPTION 'switch must default OFF'; END IF;
  PERFORM pg_temp.expect_error($q$SELECT public.water_persist_run('{"bill":{}}'::jsonb)$q$, 'water MRV is disabled');
END $$;

-- 2. Factor table ships empty; a factor needs a different approver; values are immutable.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.water_emission_factor) OR EXISTS (SELECT 1 FROM public.water_category_mapping_rule) THEN
    RAISE EXCEPTION 'factor and mapping tables must ship empty'; END IF;
  PERFORM pg_temp.expect_error($q$INSERT INTO public.water_emission_factor (factor_key,version,activity_type,value,unit,geography_type,geography,valid_from,source_name,source_publication_year,gwp_basis,status,created_by,approved_by)
    VALUES ('k',1,'WATER_SUPPLY',0.5,'kgCO2e/m3','COUNTRY','IN','2020-01-01','TEST FIXTURE',2025,'AR5','APPROVED','alice','alice')$q$, 'check constraint');
END $$;
INSERT INTO public.water_emission_factor (id,factor_key,version,activity_type,value,unit,geography_type,geography,valid_from,source_name,source_publication_year,gwp_basis,status,created_by,approved_by,approved_at)
VALUES ('00000000-0000-0000-0000-0000000000f1','test-in-supply',1,'WATER_SUPPLY',0.5,'kgCO2e/m3','COUNTRY','IN','2020-01-01','TEST FIXTURE (not a real factor)',2025,'AR5','APPROVED','alice','bob',now());
DO $$ BEGIN
  PERFORM pg_temp.expect_error($q$UPDATE public.water_emission_factor SET value = 0.6$q$, 'immutable');
  PERFORM pg_temp.expect_error($q$UPDATE public.water_emission_factor SET status = 'DRAFT'$q$, 'cannot return to draft');
  PERFORM pg_temp.expect_error($q$DELETE FROM public.water_emission_factor$q$, 'never deleted');
END $$;
INSERT INTO public.water_category_mapping_rule (id,activity_type,scope,scope3_category,valid_from,status,basis,created_by,approved_by)
VALUES ('00000000-0000-0000-0000-0000000000a1','WATER_SUPPLY',3,1,'2020-01-01','APPROVED','TEST','alice','bob');
DO $$ BEGIN
  PERFORM pg_temp.expect_error($q$INSERT INTO public.water_category_mapping_rule (activity_type,scope,scope3_category,valid_from,basis,created_by) VALUES ('WATER_SUPPLY',3,NULL,'2020-01-01','x','a')$q$, 'check constraint');
  PERFORM pg_temp.expect_error($q$INSERT INTO public.water_category_mapping_rule (activity_type,scope,scope3_category,valid_from,basis,created_by) VALUES ('WATER_SUPPLY',2,1,'2020-01-01','x','a')$q$, 'check constraint');
END $$;

-- 3. Switch on (test only) and persist: one calculated bill, one bill with no factor.
UPDATE public.water_mrv_settings SET enabled = true;
SELECT public.water_persist_run($j${"actor":"svc","method_version":"WATER_MRV_v1.0",
 "bill":{"idempotency_key":"k1","entity_id":"00000000-0000-0000-0000-0000000000e1","site_id":"s1","supplier_id":"sup1","country_code":"IN",
   "billing_period_start":"2026-05-01","billing_period_end":"2026-05-31","volume_raw":100,"unit_raw":"kL","volume_m3":100,"volume_kind":"SUPPLY","reading_type":"ACTUAL"},
 "results":[{"allocation_period":"2026","allocated_volume_m3":100,"allocation_method":"WHOLE_PERIOD","status":"CALCULATED","emissions_kgco2e":50,
   "activity_type":"WATER_SUPPLY","factor_id":"00000000-0000-0000-0000-0000000000f1","factor_version":1,"factor_value":0.5,"factor_unit":"kgCO2e/m3",
   "factor_source":"TEST FIXTURE (not a real factor)","factor_geography":"COUNTRY:IN","factor_year":2025,"gwp_basis":"AR5","factor_tier":"A",
   "scope":3,"scope3_category":1,"mapping_status":"MAPPED","mapping_rule_id":"00000000-0000-0000-0000-0000000000a1","reasons":[]}],"flags":[]}$j$::jsonb);
SELECT public.water_persist_run($j${"actor":"svc","method_version":"WATER_MRV_v1.0",
 "bill":{"idempotency_key":"k2","entity_id":"00000000-0000-0000-0000-0000000000e1","site_id":"s1","supplier_id":"sup1","country_code":"KE",
   "billing_period_start":"2026-05-01","billing_period_end":"2026-05-31","volume_raw":40,"unit_raw":"m3","volume_m3":40,"volume_kind":"SUPPLY","reading_type":"ACTUAL"},
 "results":[{"allocation_period":"2026","allocated_volume_m3":40,"allocation_method":"WHOLE_PERIOD","status":"UNAVAILABLE_FACTOR_PENDING","emissions_kgco2e":null,
   "activity_type":"WATER_SUPPLY","factor_tier":"none","scope":3,"scope3_category":1,"mapping_status":"MAPPED","mapping_rule_id":"00000000-0000-0000-0000-0000000000a1","reasons":["NO_FACTOR"]}],
 "flags":[{"allocation_period":"2026","reason_code":"NO_FACTOR","severity":"High","owner_role":"FACTOR_STEWARD","due_date":"2026-10-22","detail":"no factor"}]}$j$::jsonb);

DO $$ DECLARE r jsonb; BEGIN
  -- Idempotent re-ingest.
  r := public.water_persist_run('{"actor":"svc","bill":{"idempotency_key":"k1"}}'::jsonb);
  IF r->>'status' <> 'duplicate' THEN RAISE EXCEPTION 're-ingest must be a no-op, got %', r; END IF;
  IF (SELECT count(*) FROM public.water_bill) <> 2 THEN RAISE EXCEPTION 'expected 2 bills'; END IF;
  -- NULL stays NULL (I2, I8).
  IF (SELECT emissions_kgco2e FROM public.water_emission_result r JOIN public.water_bill b ON b.id=r.water_bill_id WHERE b.idempotency_key='k2') IS NOT NULL THEN
    RAISE EXCEPTION 'missing factor must store NULL'; END IF;
  IF (SELECT sum(emissions_kgco2e) FROM public.water_emission_result WHERE is_current) <> 50 THEN RAISE EXCEPTION 'sum must be 50'; END IF;
  IF (SELECT count(*) FILTER (WHERE emissions_kgco2e IS NULL) FROM public.water_emission_result WHERE is_current) <> 1 THEN RAISE EXCEPTION 'one excluded row'; END IF;
  -- The database itself refuses a 0 (or any number) without a factor.
  PERFORM pg_temp.expect_error($q$INSERT INTO public.water_emission_result (water_bill_id,entity_id,allocation_period,version,calc_run_id,allocation_method,status,emissions_kgco2e,factor_tier,mapping_status)
    SELECT b.id,b.entity_id,'2027',1,(SELECT id FROM public.water_calc_run LIMIT 1),'WHOLE_PERIOD','CALCULATED',0,'none','MAPPING_PENDING_REVIEW' FROM public.water_bill b WHERE idempotency_key='k2'$q$, 'check constraint');
  -- Results and audit are append-only.
  PERFORM pg_temp.expect_error($q$UPDATE public.water_emission_result SET emissions_kgco2e = 1$q$, 'append-only');
  PERFORM pg_temp.expect_error($q$DELETE FROM public.water_emission_result$q$, 'append-only');
  PERFORM pg_temp.expect_error($q$UPDATE public.water_audit_event SET actor = 'x'$q$, 'immutable');
  PERFORM pg_temp.expect_error($q$DELETE FROM public.water_audit_event$q$, 'immutable');
  PERFORM pg_temp.expect_error($q$TRUNCATE public.water_audit_event$q$, 'immutable');
  IF (SELECT count(*) FROM public.water_audit_event WHERE action='INGEST') <> 2 THEN RAISE EXCEPTION 'two ingest audits'; END IF;
END $$;

-- 4. Flags: state machine and segregation of duties.
DO $$ DECLARE f uuid; BEGIN
  SELECT id INTO f FROM public.water_data_gap_flag WHERE reason_code='NO_FACTOR';
  PERFORM pg_temp.expect_error(format($q$SELECT public.water_transition_flag(%L,'ACCEPTED_RISK','alice','immaterial','alice')$q$, f), 'check constraint');
  PERFORM pg_temp.expect_error(format($q$SELECT public.water_transition_flag(%L,'RESOLVED','alice')$q$, f), 'check constraint');
  PERFORM public.water_transition_flag(f, 'IN_PROGRESS', 'alice');
  PERFORM pg_temp.expect_error(format($q$UPDATE public.water_data_gap_flag SET reason_code='MISSING_FIELD' WHERE id=%L$q$, f), 'only the status');
END $$;

-- 5. Recalculation: the KE bill gets a factor; v1 is kept, v2 supersedes it, its flag auto-resolves.
INSERT INTO public.water_emission_factor (id,factor_key,version,activity_type,value,unit,geography_type,geography,valid_from,source_name,source_publication_year,gwp_basis,status,created_by,approved_by,approved_at)
VALUES ('00000000-0000-0000-0000-0000000000f2','test-ke-supply',1,'WATER_SUPPLY',0.25,'kgCO2e/m3','COUNTRY','KE','2020-01-01','TEST FIXTURE (not a real factor)',2025,'AR5','APPROVED','alice','bob',now());
DO $$ DECLARE old_id uuid; bill uuid; r jsonb; BEGIN
  SELECT r.id, r.water_bill_id INTO old_id, bill FROM public.water_emission_result r JOIN public.water_bill b ON b.id=r.water_bill_id WHERE b.idempotency_key='k2';
  PERFORM pg_temp.expect_error(format($q$SELECT public.water_apply_recalc('{"planned_by":"p","approved_by":"p","entity_id":"00000000-0000-0000-0000-0000000000e1","inserts":[]}'::jsonb)$q$), 'different approver');
  r := public.water_apply_recalc(jsonb_build_object('planned_by','p','approved_by','q','method_version','WATER_MRV_v1.0',
    'entity_id','00000000-0000-0000-0000-0000000000e1','inserts', jsonb_build_array(jsonb_build_object(
      'water_bill_id', bill, 'supersedes_id', old_id, 'allocation_period','2026','allocated_volume_m3',40,'allocation_method','WHOLE_PERIOD',
      'status','CALCULATED','emissions_kgco2e',10,'activity_type','WATER_SUPPLY','factor_id','00000000-0000-0000-0000-0000000000f2','factor_version',1,
      'factor_value',0.25,'factor_unit','kgCO2e/m3','factor_tier','A','scope',3,'scope3_category',1,'mapping_status','MAPPED',
      'mapping_rule_id','00000000-0000-0000-0000-0000000000a1','reasons','[]'::jsonb))));
  IF (SELECT count(*) FROM public.water_emission_result WHERE water_bill_id = bill) <> 2 THEN RAISE EXCEPTION 'history must keep v1'; END IF;
  IF (SELECT is_current FROM public.water_emission_result WHERE id = old_id) THEN RAISE EXCEPTION 'v1 must be superseded'; END IF;
  IF (SELECT version FROM public.water_emission_result WHERE water_bill_id = bill AND is_current) <> 2 THEN RAISE EXCEPTION 'v2 must be current'; END IF;
  IF (SELECT status FROM public.water_data_gap_flag WHERE water_bill_id = bill) <> 'RESOLVED' THEN RAISE EXCEPTION 'flag must auto-resolve'; END IF;
  -- Replaying the same plan is stale and changes nothing.
  PERFORM pg_temp.expect_error(format($q$SELECT public.water_apply_recalc(jsonb_build_object('planned_by','p','approved_by','q','method_version','WATER_MRV_v1.0','entity_id','00000000-0000-0000-0000-0000000000e1',
    'inserts', jsonb_build_array(jsonb_build_object('water_bill_id',%L,'supersedes_id',%L,'allocation_period','2026','allocation_method','WHOLE_PERIOD','status','INVALID_INPUT','factor_tier','none','mapping_status','MAPPING_PENDING_REVIEW'))))$q$, bill, old_id), 'stale plan');
  -- Locked period needs a restatement reason.
  INSERT INTO public.water_locked_period VALUES ('00000000-0000-0000-0000-0000000000e1','2026','auditor');
  PERFORM pg_temp.expect_error(format($q$SELECT public.water_apply_recalc(jsonb_build_object('planned_by','p','approved_by','q','method_version','WATER_MRV_v1.0','entity_id','00000000-0000-0000-0000-0000000000e1',
    'inserts', jsonb_build_array(jsonb_build_object('water_bill_id',%L,'allocation_period','2026','allocation_method','WHOLE_PERIOD','status','INVALID_INPUT','factor_tier','none','mapping_status','MAPPING_PENDING_REVIEW'))))$q$, bill), 'locked');
  IF (SELECT sum(emissions_kgco2e) FROM public.water_emission_result WHERE is_current) <> 60 THEN RAISE EXCEPTION 'current total must be 60'; END IF;
END $$;

-- 6. RLS: a member sees their entity; a stranger and anon see nothing; clients cannot write or call the RPCs.
INSERT INTO public.water_mrv_role VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e1','VIEWER');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.water_bill) <> 2 THEN RAISE EXCEPTION 'member must see 2 bills'; END IF;
  IF (SELECT count(*) FROM public.water_emission_result) <> 3 THEN RAISE EXCEPTION 'member must see 3 result versions'; END IF;
  PERFORM pg_temp.expect_error($q$INSERT INTO public.water_mrv_role VALUES (auth.uid(),'00000000-0000-0000-0000-0000000000e2','APPROVER')$q$, 'permission denied');
  PERFORM pg_temp.expect_error($q$UPDATE public.water_mrv_settings SET enabled=false$q$, 'permission denied');
  PERFORM pg_temp.expect_error($q$SELECT public.water_persist_run('{}'::jsonb)$q$, 'permission denied');
  PERFORM pg_temp.expect_error($q$SELECT count(*) FROM public.water_audit_event$q$, 'permission denied');
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.water_bill) <> 0 OR (SELECT count(*) FROM public.water_emission_result) <> 0 THEN RAISE EXCEPTION 'stranger must see nothing'; END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN PERFORM pg_temp.expect_error($q$SELECT count(*) FROM public.water_bill$q$, 'permission denied'); END $$;
RESET ROLE;
SELECT 'water_mrv migration tests passed' AS result;
