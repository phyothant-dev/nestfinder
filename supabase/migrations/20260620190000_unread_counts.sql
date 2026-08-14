-- Add per-participant unread counters
alter table conversations
  add column if not exists buyer_unread_count integer default 0,
  add column if not exists seller_unread_count integer default 0;

-- Drop old boolean unread column
alter table conversations drop column if exists unread;

-- Update trigger to increment recipient's unread count
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update conversations
  set updated_at = now(),
      buyer_unread_count = case
        when new.sender_id = buyer_id then buyer_unread_count
        else buyer_unread_count + 1
      end,
      seller_unread_count = case
        when new.sender_id = seller_id then seller_unread_count
        else seller_unread_count + 1
      end
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;
