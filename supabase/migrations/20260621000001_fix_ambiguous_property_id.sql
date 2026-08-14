drop function increment_property_views(uuid);

create or replace function increment_property_views(property_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    update properties set views = coalesce(views, 0) + 1 where id = increment_property_views.property_id;
    return;
  end if;

  insert into property_views (user_id, property_id)
  values (uid, increment_property_views.property_id)
  on conflict (user_id, property_id) do nothing;

  if found then
    update properties set views = coalesce(views, 0) + 1 where id = increment_property_views.property_id;
  end if;
end;
$$;
