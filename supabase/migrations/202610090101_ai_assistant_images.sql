create table if not exists public.ai_assistant_images (
  role text primary key check (role in ('ayong', 'amei')),
  image_url text not null check (image_url like 'https://%'),
  storage_path text not null check (storage_path ~ '^ai-assistants/(ayong|amei)/[0-9a-f-]+\.(png|webp)$'),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.ai_assistant_images enable row level security;
create policy "public read assistant images" on public.ai_assistant_images
  for select to anon, authenticated using (true);
create policy "staff insert assistant images" on public.ai_assistant_images
  for insert to authenticated with check (public.is_admin_role(array['editor','admin','owner']));
create policy "staff update assistant images" on public.ai_assistant_images
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));
grant select on public.ai_assistant_images to anon, authenticated;
grant insert, update on public.ai_assistant_images to authenticated;
