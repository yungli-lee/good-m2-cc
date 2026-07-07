create table if not exists public.home_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  eyebrow text,
  body text,
  image_media_id uuid references public.media_assets(id) on delete set null,
  fallback_image_url text,
  image_alt text,
  cta_label text,
  cta_href text,
  secondary_cta_label text,
  secondary_cta_href text,
  status text not null default 'draft',
  sort_order integer not null default 1000,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint home_campaigns_status_check check (status in ('draft', 'published', 'archived')),
  constraint home_campaigns_sort_order_check check (sort_order >= 0),
  constraint home_campaigns_date_range_check check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique,
  title text not null,
  subtitle text,
  markdown_content text,
  cover_media_id uuid references public.media_assets(id) on delete set null,
  fallback_cover_url text,
  seo_title text,
  seo_description text,
  status text not null default 'draft',
  sort_order integer not null default 1000,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint site_pages_key_check check (page_key in ('philosophy','services','process','reminders','team')),
  constraint site_pages_status_check check (status in ('draft', 'published', 'archived')),
  constraint site_pages_sort_order_check check (sort_order >= 0)
);

create index if not exists home_campaigns_public_idx
  on public.home_campaigns(status, sort_order, starts_at, ends_at)
  where status = 'published' and archived_at is null;

create index if not exists site_pages_public_idx
  on public.site_pages(page_key, status, sort_order)
  where status = 'published' and archived_at is null;

drop trigger if exists home_campaigns_set_updated_at on public.home_campaigns;
create trigger home_campaigns_set_updated_at before update on public.home_campaigns
for each row execute function public.set_updated_at();

drop trigger if exists site_pages_set_updated_at on public.site_pages;
create trigger site_pages_set_updated_at before update on public.site_pages
for each row execute function public.set_updated_at();

alter table public.home_campaigns enable row level security;
alter table public.site_pages enable row level security;

drop policy if exists "public read active home campaigns" on public.home_campaigns;
create policy "public read active home campaigns" on public.home_campaigns
  for select to anon, authenticated
  using (
    status = 'published'
    and archived_at is null
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "staff read home campaigns" on public.home_campaigns;
create policy "staff read home campaigns" on public.home_campaigns
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert home campaigns" on public.home_campaigns;
create policy "staff insert home campaigns" on public.home_campaigns
  for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff update home campaigns" on public.home_campaigns;
create policy "staff update home campaigns" on public.home_campaigns
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "public read published site pages" on public.site_pages;
create policy "public read published site pages" on public.site_pages
  for select to anon, authenticated
  using (status = 'published' and archived_at is null);

drop policy if exists "staff read site pages" on public.site_pages;
create policy "staff read site pages" on public.site_pages
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert site pages" on public.site_pages;
create policy "staff insert site pages" on public.site_pages
  for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff update site pages" on public.site_pages;
create policy "staff update site pages" on public.site_pages
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));

grant select on table public.home_campaigns to anon, authenticated;
grant insert, update on table public.home_campaigns to authenticated;
grant select on table public.site_pages to anon, authenticated;
grant insert, update on table public.site_pages to authenticated;

alter type public.audit_action add value if not exists 'home_campaign_create';
alter type public.audit_action add value if not exists 'home_campaign_update';
alter type public.audit_action add value if not exists 'home_campaign_publish';
alter type public.audit_action add value if not exists 'home_campaign_archive';
alter type public.audit_action add value if not exists 'site_page_create';
alter type public.audit_action add value if not exists 'site_page_update';
alter type public.audit_action add value if not exists 'site_page_publish';
alter type public.audit_action add value if not exists 'site_page_archive';

notify pgrst, 'reload schema';
