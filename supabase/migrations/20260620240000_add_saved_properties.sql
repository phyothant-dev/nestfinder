create table if not exists saved_properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(user_id, property_id)
);

create index if not exists idx_saved_properties_user on saved_properties(user_id, created_at desc);
