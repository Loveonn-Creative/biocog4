-- Insert sample marketplace listings for testing
INSERT INTO marketplace_listings (
  msme_hash, sector, region, credits_available, 
  price_per_tonne, verification_score, vintage, 
  methodology, sdg_alignment, currency, is_active
) VALUES 
  (encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'Textiles', 'South India', 500, 850, 92, '2025', 'CDM AMS-I.D', ARRAY[7,13,8], 'INR', true),
  (encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'Manufacturing', 'North India', 1200, 750, 88, '2025', 'Verra VCS', ARRAY[9,13,12], 'INR', true),
  (encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'Agriculture', 'West India', 300, 950, 95, '2024', 'Gold Standard', ARRAY[15,13,1,2], 'INR', true),
  (encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'Renewable Energy', 'Central India', 800, 1100, 90, '2025', 'CDM AMS-I.D', ARRAY[7,13], 'INR', true),
  (encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'Food Processing', 'East India', 450, 900, 85, '2025', 'Puro.earth', ARRAY[13,12,2], 'INR', true),
  (encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'Logistics', 'North India', 650, 780, 82, '2024', 'CDM AMS-III.C', ARRAY[9,11,13], 'INR', true),
  (encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'Construction', 'West India', 420, 920, 87, '2025', 'Verra VCS', ARRAY[9,11,13], 'INR', true);