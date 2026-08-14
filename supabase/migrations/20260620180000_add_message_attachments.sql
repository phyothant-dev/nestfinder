-- Add attachment column to messages
alter table messages add column if not exists attachment jsonb;

-- Create chat-media bucket
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- Allow conversation participants to upload files
create policy "chat participants can upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and exists (
    select 1 from public.conversations
    where id::text = split_part(name, '/', 1)
    and (buyer_id = auth.uid() or seller_id = auth.uid())
  )
);

-- Allow conversation participants to read files
create policy "chat participants can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'chat-media'
  and exists (
    select 1 from public.conversations
    where id::text = split_part(name, '/', 1)
    and (buyer_id = auth.uid() or seller_id = auth.uid())
  )
);
