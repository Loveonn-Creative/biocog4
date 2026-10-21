-- Behaviour tests for 20261105100000_public_library.sql (run by run_public_library.sh).
SET client_min_messages = notice;
DO $$
DECLARE r jsonb; n integer; c record;
BEGIN
  -- Empty: not ready, nothing found.
  r := public.search_public_library(ARRAY['cbam','steel']);
  IF (r->>'ready')::boolean OR jsonb_array_length(r->'rows') <> 0 THEN RAISE EXCEPTION 'FAIL empty library should be not ready'; END IF;
  RAISE NOTICE 'ok empty library is not ready';

  -- First check is claimed; a second inside 6 hours is not.
  SELECT * INTO c FROM public.claim_public_library_check();
  IF NOT c.claimed OR c.version IS NOT NULL THEN RAISE EXCEPTION 'FAIL first claim'; END IF;
  SELECT * INTO c FROM public.claim_public_library_check();
  IF c.claimed THEN RAISE EXCEPTION 'FAIL second claim should wait'; END IF;
  RAISE NOTICE 'ok one check per interval';

  n := public.apply_public_library('0123456789abcdef', '[
    {"kind":"answer","title":"How do I calculate CBAM embedded emissions for steel?","text":"Direct plus indirect emissions per tonne of steel.","url":"https://senseible.earth/answers/cbam-steel"},
    {"kind":"article","title":"Scope 2 from electricity bills","text":"Multiply kWh by the grid factor.","url":"https://senseible.earth/climate-intelligence/scope-2"},
    {"kind":"fact","title":"Senseible platform: Reads invoices","text":"Reads tax invoices and electricity bills.","url":null},
    {"kind":"fact","title":"Senseible platform: Reads invoices","text":"Duplicate in the same payload.","url":null}
  ]'::jsonb);
  IF n <> 3 THEN RAISE EXCEPTION 'FAIL expected 3 entries after dedupe, got %', n; END IF;
  RAISE NOTICE 'ok apply dedupes and loads';

  r := public.search_public_library(ARRAY['cbam','steel']);
  IF NOT (r->>'ready')::boolean OR r->'rows'->0->>'url' <> 'https://senseible.earth/answers/cbam-steel' THEN RAISE EXCEPTION 'FAIL search best match %', r; END IF;
  IF (r->'rows'->0) ?| ARRAY['id','search','rank'] THEN RAISE EXCEPTION 'FAIL search leaks internal columns'; END IF;
  RAISE NOTICE 'ok search finds the closest entry with only public fields';

  r := public.search_public_library(ARRAY['bill']);
  IF jsonb_array_length(r->'rows') < 1 THEN RAISE EXCEPTION 'FAIL stemmed term bill should match bills'; END IF;
  RAISE NOTICE 'ok stemming matches plurals';

  -- Unsafe terms are dropped, never parsed as tsquery syntax.
  r := public.search_public_library(ARRAY['steel'' | !', 'a&b', '(x)', 'DROP']);
  IF jsonb_array_length(r->'rows') <> 0 THEN RAISE EXCEPTION 'FAIL unsafe terms should be ignored'; END IF;
  r := public.search_public_library(ARRAY[]::text[]);
  IF jsonb_array_length(r->'rows') <> 0 THEN RAISE EXCEPTION 'FAIL no terms'; END IF;
  RAISE NOTICE 'ok unsafe or empty terms return nothing';

  -- A new version replaces the library: removed entries go, changed ones update.
  n := public.apply_public_library('fedcba9876543210', '[
    {"kind":"answer","title":"How do I calculate CBAM embedded emissions for steel?","text":"Updated text about steel.","url":"https://senseible.earth/answers/cbam-steel"}
  ]'::jsonb);
  IF n <> 1 OR (SELECT body FROM public.public_library_entries) <> 'Updated text about steel.' THEN RAISE EXCEPTION 'FAIL replace'; END IF;
  IF (SELECT version FROM public.public_library_state) <> 'fedcba9876543210' THEN RAISE EXCEPTION 'FAIL version'; END IF;
  RAISE NOTICE 'ok new version replaces the library';

  -- Bad input is refused and changes nothing.
  BEGIN PERFORM public.apply_public_library('nothex', '[{"kind":"answer","title":"x","text":"y","url":null}]'); RAISE EXCEPTION 'FAIL bad version accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF; END;
  BEGIN PERFORM public.apply_public_library('0123456789abcdef', '[{"kind":"answer","title":"x","text":"y","url":"https://evil.example/x"}]'); RAISE EXCEPTION 'FAIL foreign url accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM public.apply_public_library('0123456789abcdef', '[{"kind":"secret","title":"x","text":"y","url":null}]'); RAISE EXCEPTION 'FAIL bad kind accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM public.apply_public_library('0123456789abcdef', '[]'); RAISE EXCEPTION 'FAIL empty accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF; END;
  IF (SELECT count(*) FROM public.public_library_entries) <> 1 THEN RAISE EXCEPTION 'FAIL refused input changed rows'; END IF;
  RAISE NOTICE 'ok bad versions, foreign links, unknown kinds and empty lists are refused';

  -- Browsers cannot read or call any of it.
  IF has_table_privilege('anon', 'public.public_library_entries', 'SELECT') OR has_table_privilege('authenticated', 'public.public_library_state', 'SELECT')
     OR has_function_privilege('anon', 'public.search_public_library(text[], integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.apply_public_library(text, jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.claim_public_library_check(interval)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL browser roles have access';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.search_public_library(text[], integer)', 'EXECUTE') THEN RAISE EXCEPTION 'FAIL service_role cannot search'; END IF;
  RAISE NOTICE 'ok only service_role can use the library';

  RAISE NOTICE 'ALL PUBLIC LIBRARY TESTS PASSED';
END $$;
