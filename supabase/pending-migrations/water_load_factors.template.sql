-- =============================================
-- TEMPLATE: load water emission factors and mapping rules (NOT run; no values filled in).
-- A factor steward copies each value from the cited publication, a second person
-- approves. Leave a row out rather than guess any field. See docs/methodology/water-mrv.md §5-6.
-- =============================================
BEGIN;

-- 1) Factors arrive as DRAFT (created_by = steward).
-- INSERT INTO public.water_emission_factor
--   (factor_key, version, activity_type, value, unit, geography_type, geography, valid_from, valid_to,
--    source_name, source_url, source_table_ref, source_publication_year, gwp_basis, uncertainty,
--    approved_for_proxy, proxy_for_country, created_by)
-- VALUES
--   ('desnz-<year>-water-supply', 1, 'WATER_SUPPLY', <value from workbook>, 'kgCO2e/m3', 'COUNTRY', 'GB',
--    '<year>-01-01', NULL, 'UK DESNZ/Defra GHG conversion factors <year>', '<gov.uk URL>', '<sheet "Water supply", row/column>',
--    <year>, '<AR basis stated in that edition>', NULL, false, NULL, '<steward email>');

-- 2) Approval by a different person (the table rejects approved_by = created_by).
--    For a UK factor to be used for Indian bills it must also be approved as a proxy:
-- UPDATE public.water_emission_factor SET approved_for_proxy = true, proxy_for_country = 'IN'
--  WHERE factor_key = 'desnz-<year>-water-supply' AND version = 1 AND status = 'DRAFT';
-- UPDATE public.water_emission_factor SET status = 'APPROVED', approved_by = '<approver email>', approved_at = now()
--  WHERE factor_key = 'desnz-<year>-water-supply' AND version = 1 AND status = 'DRAFT';

-- 3) Default mapping rules (approve only after the decision in methodology §6).
-- INSERT INTO public.water_category_mapping_rule (entity_id, activity_type, scope, scope3_category, valid_from, status, basis, created_by, approved_by)
-- VALUES
--   (NULL, 'WATER_WASTEWATER_TREATMENT', 3, 5, '2020-01-01', 'APPROVED', 'GHG Protocol Scope 3 Technical Guidance (2013) ch. 5', '<creator>', '<approver>'),
--   (NULL, 'WATER_SUPPLY', 3, 1, '2020-01-01', 'APPROVED', 'GHG Protocol Scope 3 Standard (2011) ch. 5, Category 1 (interpretation approved by <approver>)', '<creator>', '<approver>');

COMMIT;
