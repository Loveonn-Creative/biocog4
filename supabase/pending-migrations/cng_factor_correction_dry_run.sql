-- Read-only. Run before 20261104100000_cng_factor_correction.sql.
-- Shows what the correction would change, and what it deliberately leaves.
CREATE OR REPLACE FUNCTION pg_temp.try_jsonb(t text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN t::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

WITH rows AS (
  SELECT e.id, e.verified, e.activity_data, e.co2_kg,
         pg_temp.try_jsonb(e.verification_notes) AS notes
    FROM public.emissions e
   WHERE e.category = 'fuel'
     AND e.emission_factor = 2.75
     AND lower(trim(coalesce(e.activity_unit, ''))) = 'kg'
     AND e.activity_data > 0 AND e.co2_kg > 0
), cng AS (
  SELECT * FROM rows
   WHERE split_part(coalesce(notes ->> 'factorSource', ''), ':', 2) = 'CNG'
      OR (coalesce(notes ->> 'factorSource', '') = '' AND coalesce(notes ->> 'sourceDescription', '') ~* '(^|[^a-z])cng([^a-z]|$)')
)
SELECT count(*) FILTER (WHERE NOT coalesce(verified, false))                                   AS unverified_rows_to_correct,
       round(sum(co2_kg) FILTER (WHERE NOT coalesce(verified, false)), 2)                      AS old_total_kg,
       round(sum(round(activity_data * 2.69, 2)) FILTER (WHERE NOT coalesce(verified, false)), 2) AS new_total_kg,
       count(*) FILTER (WHERE verified)                                                         AS verified_rows_left_as_verified,
       (SELECT count(*) FROM rows) - count(*)                                                   AS other_2_75_kg_rows_not_cng
  FROM cng;
