ALTER TABLE properties
ADD COLUMN IF NOT EXISTS monthly_fee_from numeric,
ADD COLUMN IF NOT EXISTS monthly_fee_to numeric,
ADD COLUMN IF NOT EXISTS area_from numeric,
ADD COLUMN IF NOT EXISTS area_to numeric,
ADD COLUMN IF NOT EXISTS furnished_status text;
