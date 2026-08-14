-- Function to check if a user can create a post (max 5 per rolling month from account creation)
create or replace function public.can_user_post(user_uuid uuid)
returns boolean
language sql
security definer
stable
as $$
  with user_account as (
    select created_at from auth.users where id = user_uuid
  ),
  cycle as (
    select
      created_at as account_created,
      floor(
        extract(year from age(now(), created_at)) * 12
        + extract(month from age(now(), created_at))
      )::int as months_passed
    from user_account
  )
  select (
    select count(*)
    from public.properties, cycle
    where properties.user_id = user_uuid
      and properties.created_at >= cycle.account_created + (cycle.months_passed || ' months')::interval
      and properties.created_at <  cycle.account_created + ((cycle.months_passed + 1) || ' months')::interval
  ) < 5;
$$;

-- Function to get the number of posts a user has created in their current cycle
create or replace function public.get_monthly_post_count(user_uuid uuid)
returns integer
language sql
security definer
stable
as $$
  with user_account as (
    select created_at from auth.users where id = user_uuid
  ),
  cycle as (
    select
      created_at as account_created,
      floor(
        extract(year from age(now(), created_at)) * 12
        + extract(month from age(now(), created_at))
      )::int as months_passed
    from user_account
  )
  select (
    select count(*)::int
    from public.properties, cycle
    where properties.user_id = user_uuid
      and properties.created_at >= cycle.account_created + (cycle.months_passed || ' months')::interval
      and properties.created_at <  cycle.account_created + ((cycle.months_passed + 1) || ' months')::interval
  );
$$;

-- Function to get the current posting cycle start and end dates for a user
create or replace function public.get_monthly_post_cycle(user_uuid uuid)
returns table(cycle_start timestamptz, cycle_end timestamptz)
language sql
security definer
stable
as $$
  with user_account as (
    select created_at from auth.users where id = user_uuid
  ),
  cycle as (
    select
      created_at as account_created,
      floor(
        extract(year from age(now(), created_at)) * 12
        + extract(month from age(now(), created_at))
      )::int as months_passed
    from user_account
  )
  select
    cycle.account_created + (cycle.months_passed || ' months')::interval,
    cycle.account_created + ((cycle.months_passed + 1) || ' months')::interval
  from cycle;
$$;

-- Update the insert policy to enforce the 5-post monthly limit
drop policy if exists "Users can insert own properties" on public.properties;
create policy "Users can insert own properties"
on public.properties for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.can_user_post(auth.uid())
);
