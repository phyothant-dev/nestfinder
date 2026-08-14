create table if not exists wanted_listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  deal_type text not null check (deal_type in ('buy', 'rent')),
  property_type text,
  region_id text references states_regions(id),
  township_id text references townships(id),
  budget_min numeric,
  budget_max numeric,
  contact_phone text,
  status text not null default 'active' check (status in ('active', 'filled', 'expired')),
  created_at timestamptz default now() not null
);

alter table wanted_listings enable row level security;

create policy "Anyone can view active wanted listings"
on wanted_listings for select
to anon, authenticated
using (status = 'active' or (auth.uid() = user_id));

create policy "Users can insert own wanted listings"
on wanted_listings for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own wanted listings"
on wanted_listings for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete own wanted listings"
on wanted_listings for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists idx_wanted_listings_status on wanted_listings(status, created_at desc);
create index if not exists idx_wanted_listings_user on wanted_listings(user_id, created_at desc);
