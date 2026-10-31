-- Preview-only social video draft assets. Apply to staging after reviewing policies.
-- Public media is required only when a user explicitly publishes to Facebook.
create table if not exists public.social_post_videos (
  post_id uuid primary key references public.social_posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint social_video_path_owner check (split_part(storage_path,'/',1) = owner_id::text),
  constraint social_video_path_post check (split_part(storage_path,'/',2) = post_id::text)
);
alter table public.social_post_videos enable row level security;
create policy "social_post_videos_select_own" on public.social_post_videos
 for select to authenticated using (owner_id=(select auth.uid())
  and exists(select 1 from public.social_posts p where p.id=post_id and p.author_id=(select auth.uid())));
create policy "social_post_videos_insert_own" on public.social_post_videos
 for insert to authenticated with check (owner_id=(select auth.uid())
  and exists(select 1 from public.social_posts p where p.id=post_id and p.author_id=(select auth.uid()) and p.status in ('draft','ready')));
create policy "social_post_videos_delete_own" on public.social_post_videos
 for delete to authenticated using (owner_id=(select auth.uid())
  and exists(select 1 from public.social_posts p where p.id=post_id and p.author_id=(select auth.uid()) and p.status in ('draft','ready')));
grant select,insert,delete on public.social_post_videos to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('social-post-videos','social-post-videos',true,20971520,array['video/mp4'])
 on conflict (id) do nothing;
-- Storage insert via short-lived signed upload URLs; only own post paths.
create policy "social_post_videos_storage_insert_own" on storage.objects
 for insert to authenticated with check (bucket_id='social-post-videos'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.social_posts p
    where p.id::text=(storage.foldername(name))[2]
    and p.author_id=(select auth.uid()) and p.status in ('draft','ready')));
create policy "social_post_videos_storage_select_own" on storage.objects
 for select to authenticated using (bucket_id='social-post-videos'
  and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "social_post_videos_storage_delete_own" on storage.objects
 for delete to authenticated using (bucket_id='social-post-videos'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.social_posts p
    where p.id::text=(storage.foldername(name))[2]
    and p.author_id=(select auth.uid()) and p.status in ('draft','ready')));
