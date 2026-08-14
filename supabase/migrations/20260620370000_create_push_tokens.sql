create table if not exists public.push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "Users can view own tokens"
on public.push_tokens for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own tokens"
on public.push_tokens for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own tokens"
on public.push_tokens for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete own tokens"
on public.push_tokens for delete
to authenticated
using (auth.uid() = user_id);
