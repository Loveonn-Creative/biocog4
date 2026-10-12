-- =============================================
-- READ-ONLY: compare water shadow results with the live invoice numbers.
-- Changes nothing. Run in the SQL editor after shadow mode has collected bills.
-- =============================================

-- 1) Shadow coverage per entity and period: calculated vs excluded, never summing NULL as 0.
SELECT r.entity_id, r.allocation_period,
       count(*) FILTER (WHERE r.emissions_kgco2e IS NOT NULL) AS included,
       count(*) FILTER (WHERE r.emissions_kgco2e IS NULL)     AS excluded,
       sum(r.emissions_kgco2e)                                AS kgco2e_calculated,   -- NULL when nothing calculated
       sum(abs(r.allocated_volume_m3)) FILTER (WHERE r.emissions_kgco2e IS NOT NULL) AS m3_included,
       sum(abs(r.allocated_volume_m3)) FILTER (WHERE r.emissions_kgco2e IS NULL)     AS m3_excluded
  FROM public.water_emission_result r
 WHERE r.is_current
 GROUP BY 1, 2 ORDER BY 1, 2;

-- 2) Open gaps by reason.
SELECT reason_code, severity, owner_role, count(*) AS open, count(*) FILTER (WHERE due_date < current_date) AS overdue
  FROM public.water_data_gap_flag WHERE status IN ('OPEN','IN_PROGRESS')
 GROUP BY 1, 2, 3 ORDER BY CASE severity WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END, 4 DESC;

-- 3) Same document, two numbers: the live invoice total vs the water engine.
SELECT d.document_hash, d.vendor,
       (d.cached_result->>'totalCO2Kg')::numeric AS live_invoice_kgco2e,
       sum(r.emissions_kgco2e)                   AS water_engine_kgco2e,
       array_agg(DISTINCT r.status)              AS water_statuses,
       array_agg(DISTINCT x.reason)              AS reasons
  FROM public.water_bill b
  JOIN public.documents d ON d.document_hash = split_part(b.source_document_ref, '#', 1) AND d.user_id = b.entity_id
  JOIN public.water_emission_result r ON r.water_bill_id = b.id AND r.is_current
  LEFT JOIN LATERAL unnest(r.reasons) AS x(reason) ON true
 GROUP BY 1, 2, 3 ORDER BY 1;

-- 4) Water volumes in m³, supply and wastewater apart.
SELECT r.allocation_period, b.volume_kind, sum(r.allocated_volume_m3) AS m3, count(*) FILTER (WHERE r.allocated_volume_m3 IS NULL) AS unreadable
  FROM public.water_emission_result r JOIN public.water_bill b ON b.id = r.water_bill_id
 WHERE r.is_current GROUP BY 1, 2 ORDER BY 1, 2;
