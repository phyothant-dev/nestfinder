create policy "Users can update own profile"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
