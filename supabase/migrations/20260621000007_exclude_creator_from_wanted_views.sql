drop function increment_wanted_listing_views(uuid);

create or replace function increment_wanted_listing_views(listing_view_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is not null and uid = (select user_id from wanted_listings where id = listing_view_id) then
    return;
  end if;

  if uid is null then
    update wanted_listings set views = coalesce(views, 0) + 1 where id = listing_view_id;
    return;
  end if;

  insert into wanted_listing_views (user_id, listing_id)
  values (uid, listing_view_id)
  on conflict (user_id, listing_id) do nothing;

  if found then
    update wanted_listings set views = coalesce(views, 0) + 1 where id = listing_view_id;
  end if;
end;
$$;
