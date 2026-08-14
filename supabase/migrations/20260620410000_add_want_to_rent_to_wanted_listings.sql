ALTER TABLE wanted_listings
ADD COLUMN IF NOT EXISTS currency_unit text,
ADD COLUMN IF NOT EXISTS monthly_fee_from numeric,
ADD COLUMN IF NOT EXISTS monthly_fee_to numeric,
ADD COLUMN IF NOT EXISTS area_from numeric,
ADD COLUMN IF NOT EXISTS area_to numeric,
ADD COLUMN IF NOT EXISTS area_unit text,
ADD COLUMN IF NOT EXISTS furnished_status text,
ADD COLUMN IF NOT EXISTS floor text,
ADD COLUMN IF NOT EXISTS contact_phone text;

UPDATE wanted_listings SET contact_phone = (
  SELECT phone FROM profiles WHERE profiles.id = wanted_listings.user_id
) WHERE contact_phone IS NULL;
