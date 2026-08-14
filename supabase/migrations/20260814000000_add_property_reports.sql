alter table properties add column if not exists is_flagged boolean not null default false;

create table if not exists property_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz default now()
);

create index if not exists property_reports_property_idx on property_reports (property_id);
