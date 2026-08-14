create or replace function increment_property_views(property_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update properties
  set views = coalesce(views, 0) + 1
  where id = property_id;
end;
$$;
