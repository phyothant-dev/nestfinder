create or replace function get_total_unread_count(p_user_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(
    case
      when buyer_id = p_user_id then buyer_unread_count
      else seller_unread_count
    end
  ), 0)
  from conversations
  where buyer_id = p_user_id or seller_id = p_user_id;
$$;
