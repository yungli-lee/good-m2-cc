-- Managed site navigation for Header, Mobile, and Footer.

create table if not exists public.site_navigation_items (
  id uuid primary key default gen_random_uuid(),
  item_key text not null,
  location text not null,
  label text not null,
  page_id uuid references public.site_pages(id) on delete cascade,
  href text,
  target text not null default '_self',
  sort_order integer not null default 1000,
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_navigation_items_location_check
    check (location in ('header', 'mobile', 'footer')),
  constraint site_navigation_items_target_check
    check (target in ('_self', '_blank')),
  constraint site_navigation_items_sort_order_check
    check (sort_order >= 0),
  constraint site_navigation_items_destination_check
    check (
      (page_id is not null and href is null)
      or (page_id is null and href is not null and length(trim(href)) > 0)
    ),
  constraint site_navigation_items_key_location_unique
    unique (item_key, location)
);

create index if not exists site_navigation_items_public_idx
  on public.site_navigation_items(location, sort_order, id)
  where is_visible = true;

create index if not exists site_navigation_items_page_idx
  on public.site_navigation_items(page_id)
  where page_id is not null;

drop trigger if exists site_navigation_items_set_updated_at
  on public.site_navigation_items;
create trigger site_navigation_items_set_updated_at
before update on public.site_navigation_items
for each row execute function public.set_updated_at();

alter table public.site_navigation_items enable row level security;

drop policy if exists "public read visible navigation items"
  on public.site_navigation_items;
create policy "public read visible navigation items"
  on public.site_navigation_items
  for select to anon, authenticated
  using (is_visible = true);

drop policy if exists "staff read navigation items"
  on public.site_navigation_items;
create policy "staff read navigation items"
  on public.site_navigation_items
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert navigation items"
  on public.site_navigation_items;
create policy "staff insert navigation items"
  on public.site_navigation_items
  for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff update navigation items"
  on public.site_navigation_items;
create policy "staff update navigation items"
  on public.site_navigation_items
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff delete navigation items"
  on public.site_navigation_items;
create policy "staff delete navigation items"
  on public.site_navigation_items
  for delete to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

grant select on table public.site_navigation_items to anon, authenticated;
grant insert, update, delete on table public.site_navigation_items to authenticated;

-- Existing fixed routes are seeded once per location. Custom pages are not
-- inserted automatically; an editor must opt them into each menu.
insert into public.site_navigation_items
  (item_key, location, label, href, target, sort_order, is_visible)
values
  ('philosophy', 'header', '服務理念', '/#philosophy', '_self', 100, true),
  ('properties', 'header', '精選物件', '/properties', '_self', 200, true),
  ('knowledge', 'header', '知識庫', '/knowledge', '_self', 300, true),
  ('services', 'header', '服務項目', '/#services', '_self', 400, true),
  ('calculator', 'header', '房產試算工具', '/calculator', '_self', 500, true),
  ('process', 'header', '買屋流程', '/#process', '_self', 600, true),
  ('reminders', 'header', '阿勇生活小提醒', '/#reminders', '_self', 700, true),
  ('contact', 'header', '聯絡我們', '/contact', '_self', 800, true),
  ('philosophy', 'mobile', '服務理念', '/#philosophy', '_self', 100, true),
  ('properties', 'mobile', '精選物件', '/properties', '_self', 200, true),
  ('knowledge', 'mobile', '知識庫', '/knowledge', '_self', 300, true),
  ('services', 'mobile', '服務項目', '/#services', '_self', 400, true),
  ('calculator', 'mobile', '房產試算工具', '/calculator', '_self', 500, true),
  ('process', 'mobile', '買屋流程', '/#process', '_self', 600, true),
  ('reminders', 'mobile', '阿勇生活小提醒', '/#reminders', '_self', 700, true),
  ('contact', 'mobile', '聯絡我們', '/contact', '_self', 800, true),
  ('philosophy', 'footer', '服務理念', '/#philosophy', '_self', 100, true),
  ('properties', 'footer', '精選物件', '/properties', '_self', 200, true),
  ('knowledge', 'footer', '知識庫', '/knowledge', '_self', 300, true),
  ('services', 'footer', '服務項目', '/#services', '_self', 400, true),
  ('calculator', 'footer', '房產試算工具', '/calculator', '_self', 500, true),
  ('process', 'footer', '買屋流程', '/#process', '_self', 600, true),
  ('reminders', 'footer', '阿勇生活小提醒', '/#reminders', '_self', 700, true),
  ('contact', 'footer', '聯絡我們', '/contact', '_self', 800, true)
on conflict (item_key, location) do nothing;

notify pgrst, 'reload schema';
