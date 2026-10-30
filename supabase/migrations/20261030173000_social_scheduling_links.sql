alter table public.social_posts add column if not exists link_url text;
alter table public.social_posts add column if not exists facebook_scheduled_for timestamptz;
alter table public.social_posts add column if not exists requested_delete_at timestamptz;
alter table public.social_posts drop constraint if exists social_posts_status_check;
alter table public.social_posts add constraint social_posts_status_check
check (status in ('draft','ready','publishing','publish_unknown','posted','archived','scheduled'));
