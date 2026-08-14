-- Clean up: drop columns that were mistakenly added to properties
-- (want_to_rent fields belong on wanted_listings, not properties)
ALTER TABLE properties
DROP COLUMN IF EXISTS monthly_fee_from,
DROP COLUMN IF EXISTS monthly_fee_to,
DROP COLUMN IF EXISTS area_from,
DROP COLUMN IF EXISTS area_to,
DROP COLUMN IF EXISTS furnished_status;
