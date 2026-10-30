-- Isolated Preview bucket for assets controlled by the authenticated author.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('social-post-images-preview','social-post-images-preview',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy "social images author upload" on storage.objects for insert to authenticated
with check(bucket_id='social-post-images-preview' and
  (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "social images author delete" on storage.objects for delete to authenticated
using(bucket_id='social-post-images-preview' and
  (storage.foldername(name))[1]=(select auth.uid())::text);
