ALTER TABLE properties
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS hostel_type text,
ADD COLUMN IF NOT EXISTS room_capacity text;
