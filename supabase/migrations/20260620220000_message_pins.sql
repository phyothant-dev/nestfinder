-- Per-user pin tracking (each participant pins independently)
alter table messages
  add column if not exists pinned_by_buyer boolean default false,
  add column if not exists pinned_by_seller boolean default false;

-- Drop old single-user pin column
alter table messages drop column if exists pinned;
