-- Enable RLS on properties table (safe to run even if already enabled)
alter table properties enable row level security;

-- Allow anyone (including unauthenticated) to read all properties
drop policy if exists "Public can read all properties" on properties;
create policy "Public can read all properties"
on properties for select
to public
using (true);

-- Allow authenticated users to insert their own properties
drop policy if exists "Users can insert own properties" on properties;
create policy "Users can insert own properties"
on properties for insert
to authenticated
with check (auth.uid() = user_id);

-- Allow authenticated users to update their own properties
drop policy if exists "Users can update own properties" on properties;
create policy "Users can update own properties"
on properties for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Allow authenticated users to delete their own properties
drop policy if exists "Users can delete own properties" on properties;
create policy "Users can delete own properties"
on properties for delete
to authenticated
using (auth.uid() = user_id);
