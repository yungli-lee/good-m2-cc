insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-assets',
  'company-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read company assets bucket" on storage.objects;
create policy "public read company assets bucket" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'company-assets');

drop policy if exists "staff upload company assets bucket" on storage.objects;
create policy "staff upload company assets bucket" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-assets'
    and public.is_admin_role(array['editor','admin','owner'])
    and lower((storage.foldername(name))[1]) = auth.uid()::text
  );

drop policy if exists "staff update company assets bucket" on storage.objects;
create policy "staff update company assets bucket" on storage.objects
  for update to authenticated
  using (bucket_id = 'company-assets' and public.is_admin_role(array['editor','admin','owner']))
  with check (bucket_id = 'company-assets' and public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff delete company assets bucket" on storage.objects;
create policy "staff delete company assets bucket" on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-assets' and public.is_admin_role(array['editor','admin','owner']));
