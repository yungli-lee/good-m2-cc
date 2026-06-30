grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.properties to authenticated;
grant select, insert, update, delete on table public.property_media to authenticated;

drop policy if exists "staff read admin properties" on public.properties;
create policy "staff read admin properties" on public.properties
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert draft properties" on public.properties;
create policy "staff insert draft properties" on public.properties
  for insert to authenticated
  with check (
    public.is_admin_role(array['admin','owner'])
    or (public.is_admin_role(array['editor']) and status = 'draft' and deleted_at is null)
  );

drop policy if exists "staff update properties by role" on public.properties;
create policy "staff update properties by role" on public.properties
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (
    public.is_admin_role(array['admin','owner'])
    or (public.is_admin_role(array['editor']) and status = 'draft' and deleted_at is null)
  );

drop policy if exists "admin owner delete properties" on public.properties;
create policy "admin owner delete properties" on public.properties
  for delete to authenticated
  using (public.is_admin_role(array['admin','owner']));

drop policy if exists "staff manage property media" on public.property_media;
create policy "staff manage property media" on public.property_media
  for all to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));
