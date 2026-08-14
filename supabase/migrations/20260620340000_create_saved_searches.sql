create table if not exists saved_searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  search_params jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null
);

alter table saved_searches enable row level security;

create policy "Users can view own saved searches"
on saved_searches for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can save searches"
on saved_searches for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete own saved searches"
on saved_searches for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists idx_saved_searches_user on saved_searches(user_id, created_at desc);
