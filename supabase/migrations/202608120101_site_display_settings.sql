create table if not exists public.site_display_settings (
  id text primary key default 'default' check (id = 'default'),
  featured_property_limit integer not null default 12 check (featured_property_limit between 3 and 24),
  featured_property_autoplay boolean not null default true,
  featured_property_interval_seconds integer not null default 5 check (featured_property_interval_seconds between 3 and 30),
  latest_property_limit integer not null default 12 check (latest_property_limit between 3 and 24),
  latest_property_autoplay boolean not null default true,
  latest_property_interval_seconds integer not null default 6 check (latest_property_interval_seconds between 3 and 30),
  knowledge_page_size integer not null default 6 check (knowledge_page_size in (6, 9, 12)),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_display_settings (id) values ('default') on conflict (id) do nothing;

drop trigger if exists site_display_settings_set_updated_at on public.site_display_settings;
create trigger site_display_settings_set_updated_at before update on public.site_display_settings
for each row execute function public.set_updated_at();

alter table public.site_display_settings enable row level security;
create policy "public read site display settings" on public.site_display_settings for select to anon, authenticated using (true);
create policy "staff update site display settings" on public.site_display_settings for update to authenticated
using (public.is_admin_role(array['editor','admin','owner']))
with check (public.is_admin_role(array['editor','admin','owner']));

revoke all privileges on public.site_display_settings from anon, authenticated;

grant select on public.site_display_settings to anon, authenticated;
grant update on public.site_display_settings to authenticated;
