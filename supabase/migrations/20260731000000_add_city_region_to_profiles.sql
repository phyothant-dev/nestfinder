alter table if exists public.profiles
add column if not exists city text;

alter table if exists public.profiles
add column if not exists region text;
