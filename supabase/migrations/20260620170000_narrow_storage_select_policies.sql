-- Drop overly broad SELECT policies that allow listing all files
drop policy if exists "public: read avatars" on storage.objects;
drop policy if exists "Allow public access to read media" on storage.objects;

-- Narrow policy: users can only list their own avatar files
create policy "users: read own avatar"
on storage.objects for select
to public
using (
  bucket_id = 'avatars'
  and (auth.uid())::text = split_part(name, '/', 1)
);

-- Narrow policy: users can only list their own property media files
create policy "users: read own property media"
on storage.objects for select
to public
using (
  bucket_id = 'property-media'
  and (auth.uid())::text = (storage.foldername(name))[1]
);
