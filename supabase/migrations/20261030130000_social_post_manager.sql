-- Independent social publishing planner. Never posts to Facebook automatically.
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  category text not null default 'general' check (category in ('property','knowledge','daily','general')),
  body text not null default '',
  media_urls text[] not null default '{}',
  destination_notes text not null default '',
  status text not null default 'draft' check (status in ('draft','ready','posted','archived')),
  scheduled_for timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_posts_author_updated_idx on public.social_posts(author_id,updated_at desc);
alter table public.social_posts enable row level security;
create policy "social_posts_select_own" on public.social_posts for select to authenticated using ((select auth.uid()) = author_id);
create policy "social_posts_insert_own" on public.social_posts for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "social_posts_update_own" on public.social_posts for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "social_posts_delete_own" on public.social_posts for delete to authenticated using ((select auth.uid()) = author_id);
grant select, insert, update, delete on public.social_posts to authenticated;
