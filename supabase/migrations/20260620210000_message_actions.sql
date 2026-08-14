alter table messages
  add column if not exists reply_to_id uuid references messages(id) on delete set null,
  add column if not exists pinned boolean default false;
