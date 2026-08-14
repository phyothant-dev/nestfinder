ALTER TABLE wanted_listings
ADD COLUMN IF NOT EXISTS bedrooms integer,
ADD COLUMN IF NOT EXISTS bathrooms integer;
