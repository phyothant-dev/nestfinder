ALTER TABLE wanted_listings
ADD COLUMN IF NOT EXISTS co_brokerage boolean default false;
