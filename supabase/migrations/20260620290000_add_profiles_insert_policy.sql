create policy "Users can insert own profile"
on profiles for insert
to authenticated
with check (auth.uid() = id);
