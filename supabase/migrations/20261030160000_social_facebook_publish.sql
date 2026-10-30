alter table public.social_posts
 add column if not exists facebook_post_id text,
 add column if not exists facebook_page_id text,
 add column if not exists facebook_published_at timestamptz,
 add column if not exists facebook_deleted_at timestamptz,
 add column if not exists facebook_error text;
create unique index if not exists social_posts_facebook_post_unique on public.social_posts(facebook_post_id) where facebook_post_id is not null;

alter table public.social_posts drop constraint if exists social_posts_status_check;
alter table public.social_posts add constraint social_posts_status_check
 check (status in ('draft','ready','publishing','publish_unknown','posted','archived'));
