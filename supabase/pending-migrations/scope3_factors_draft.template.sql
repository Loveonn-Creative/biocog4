-- =============================================
-- DRAFT (NOT run). Scope 3 factors researched for the evidence trail
-- (table public.scope3_factors from 20261019100000_scope3_trail.sql).
-- Sourcing notes, confidence and gaps: docs/methodology/scope3-factors.md
--
-- How to use:
-- 1. The author opens each cited publication and checks the value, unit,
--    boundary and GWP basis against it. Every <angle-bracket> field must be
--    filled from the publication itself; the SQL fails until it is, on purpose.
--    Leave a row out rather than guess a field.
-- 2. The author runs the INSERTs: rows arrive as status 'draft'.
-- 3. A second person reviews the same pages and approves (the table refuses
--    approved_by = created_by).
-- 4. Each user's trail picks the factors up on the next upload, or at once
--    through "Recalculate" on the MRV dashboard (scope3-trail function).
-- =============================================
BEGIN;

-- ---------------------------------------------------------------------------
-- Category 4, rail freight, India.
-- Smart Freight Centre, "India Default GHG Emission Values V1.0, complementing
-- the GLEC Framework" (with the TCI-IIMB Supply Chain Sustainability Lab).
-- Rail table: WTT 0.0064 + TTW 0.0041 = 0.0106 kg CO2e per tonne-km (the sum
-- is rounded in the source). Built from Ministry of Railways annual-report
-- data, five-year average, IPCC 2006 fuel factors, TTW uplifted to WTW with
-- the GLEC Framework ratio. Confirmed by two independent excerpts of the
-- document; not yet read from the PDF itself (host blocked in this session).
-- ---------------------------------------------------------------------------
INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit,
  data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
VALUES ('SFC_IN_RAIL_FREIGHT_WTW', '1.0', 4, 'freight:rail', 'IN', 'tkm', 0.0106,
  'secondary_factor',
  'Well-to-wheel (WTT 0.0064 + TTW 0.0041 kg CO2e/tkm); Indian Railways network average, traction mix as in the source',
  '<GWP basis stated in the document>',
  'Smart Freight Centre, India Default GHG Emission Values V1.0 (complementing the GLEC Framework)',
  '<table number and page of the rail emission intensity table>',
  <publication year on the cover page>, '2023-04-01', '<author user id>');

-- ---------------------------------------------------------------------------
-- Category 1, steel, India: hot-rolled and semi-finished iron and non-alloy
-- steel headings only.
-- Ministry of Steel, Government of India: FY2023-24 average emission
-- intensity of the Indian steel sector, 2.54 tCO2 per tonne of crude steel
-- (decarbonisation roadmap, "Greening the Steel Sector in India: Roadmap and
-- Action Plan"; the same figure is quoted in the draft National Steel Policy
-- Vision 2047). Confirmed in several independent reports of the Ministry's
-- figure; the boundary is not stated in any excerpt seen.
-- Caveats the approver must decide on:
--  * per tonne of CRUDE steel, applied here per tonne of product: yield loss
--    and rolling are not added, so the figure understates finished products
--    (that is why cold-rolled, coated and alloy headings are left out);
--  * reported as CO2, not CO2e;
--  * a national average across BF-BOF, DRI and scrap-EAF routes: a supplier's
--    own figure (a SUPPLIER:<GSTIN> factor) always takes precedence.
-- One row per HSN heading (material keys are exact; no chapter-wide factor).
-- ---------------------------------------------------------------------------
INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit,
  data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
SELECT 'MOS_IN_STEEL_' || h, 'FY2023-24', 1, 'hsn:' || h, 'IN', 'tonne', 2540,
  'secondary_factor',
  '<boundary as defined by the Ministry of Steel for the 2.54 tCO2/tcs figure>; per tonne of crude steel, applied per tonne of product',
  'CO2 only, as reported (tCO2)',
  'Ministry of Steel, Government of India: Greening the Steel Sector in India: Roadmap and Action Plan',
  '<section, table or slide giving 2.54 tCO2 per tonne of crude steel for FY2023-24>',
  <publication year>, '2023-04-01', '<author user id>'
FROM unnest(ARRAY[
  '7206',  -- iron and non-alloy steel in ingots or other primary forms
  '7207',  -- semi-finished products of iron or non-alloy steel
  '7208',  -- flat-rolled, width >= 600 mm, hot-rolled
  '7213',  -- bars and rods, hot-rolled, in irregularly wound coils
  '7214',  -- other bars and rods, forged or hot-rolled (incl. TMT rebar)
  '7216'   -- angles, shapes and sections
]) AS h;

-- ---------------------------------------------------------------------------
-- Approval (a second person, after checking the same pages):
-- UPDATE public.scope3_factors SET status = 'approved', approved_by = '<approver user id>', approved_at = now()
--  WHERE status = 'draft' AND (factor_key = 'SFC_IN_RAIL_FREIGHT_WTW' OR factor_key LIKE 'MOS_IN_STEEL_%');
-- ---------------------------------------------------------------------------

COMMIT;
