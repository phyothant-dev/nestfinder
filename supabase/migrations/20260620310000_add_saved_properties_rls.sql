alter table saved_properties enable row level security;

create policy "Users can view own saved properties"
on saved_properties for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can save properties"
on saved_properties for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can unsave own properties"
on saved_properties for delete
to authenticated
using (auth.uid() = user_id);
