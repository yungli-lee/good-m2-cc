-- Preview social publishing image storage. Images are PUBLIC because Meta must fetch them at a future scheduled time.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('social-post-images','social-post-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create table if not exists public.social_post_images (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.social_posts(id) on delete cascade,
 owner_id uuid not null references auth.users(id),
 storage_path text not null unique,
 position integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.social_post_images enable row level security;
create policy "social images owner select" on public.social_post_images for select to authenticated using (owner_id=(select auth.uid()));
create policy "social images owner insert" on public.social_post_images for insert to authenticated with check (
 owner_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and p.author_id=(select auth.uid()) and p.status in ('draft','ready'))
);
create policy "social images owner delete" on public.social_post_images for delete to authenticated using (owner_id=(select auth.uid()));
create policy "social image uploads by owner" on storage.objects for insert to authenticated
with check (bucket_id='social-post-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "social image delete by owner" on storage.objects for delete to authenticated
using (bucket_id='social-post-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
