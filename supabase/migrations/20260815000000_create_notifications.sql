-- In-app notifications table
create table if not exists notifications (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid not null references profiles(id) on delete cascade,
  type            text not null, -- 'new_property' | 'new_message'
  actor_id        uuid references profiles(id) on delete set null,
  property_id     uuid references properties(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  title           text,
  body            text,
  read_at         timestamptz,
  created_at      timestamptz default now() not null
);

create index if not exists idx_notifications_user_created
  on notifications(user_id, created_at desc);

alter table notifications enable row level security;

drop policy if exists "Users can read own notifications" on notifications;
create policy "Users can read own notifications"
  on notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on notifications;
create policy "Users can update own notifications"
  on notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notify all other users when a new property is posted
create or replace function notify_new_property()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, type, actor_id, property_id, title, body)
  select
    p.id,
    'new_property',
    new.user_id,
    new.id,
    'New Property',
    coalesce(nullif(new.title_en, ''), nullif(new.title_mm, ''), 'New listing posted')
  from profiles p
  where p.id <> new.user_id;
  return new;
end;
$$;

drop trigger if exists on_property_insert_notify on properties;
create trigger on_property_insert_notify
  after insert on properties
  for each row execute function notify_new_property();

-- Notify the recipient when a new message is sent
create or replace function notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other uuid;
begin
  select case
    when buyer_id = new.sender_id then seller_id
    else buyer_id
  end into v_other
  from conversations
  where id = new.conversation_id;

  if v_other is not null and v_other <> new.sender_id then
    insert into notifications (user_id, type, actor_id, conversation_id, body)
    values (v_other, 'new_message', new.sender_id, new.conversation_id, new.text);
  end if;
  return new;
end;
$$;

drop trigger if exists on_message_insert_notify on messages;
create trigger on_message_insert_notify
  after insert on messages
  for each row execute function notify_new_message();
