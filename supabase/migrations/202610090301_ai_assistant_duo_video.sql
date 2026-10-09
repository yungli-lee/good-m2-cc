create table if not exists public.ai_assistant_duo_video (
  id boolean primary key default true check (id),
  video_url text not null check (video_url like 'https://%'),
  storage_path text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.ai_assistant_duo_video enable row level security;
create policy "public read duo video" on public.ai_assistant_duo_video
  for select to anon, authenticated using (true);
create policy "staff insert duo video" on public.ai_assistant_duo_video
  for insert to authenticated with check (public.is_admin_role(array['editor','admin','owner']));
create policy "staff update duo video" on public.ai_assistant_duo_video
  for update to authenticated using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));
grant select on public.ai_assistant_duo_video to anon, authenticated;
grant insert, update on public.ai_assistant_duo_video to authenticated;
