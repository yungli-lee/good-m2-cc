alter table public.property_timeline_events
  add column if not exists updated_by uuid;

drop policy if exists "admin owner update property timeline" on public.property_timeline_events;
create policy "staff update property timeline" on public.property_timeline_events
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));

alter type public.audit_action add value if not exists 'timeline_event_update';

create table if not exists public.company_settings (
  id text primary key default 'default',
  company_name text not null default '赫成開發有限公司',
  franchise_name text not null default '太平洋房屋彰化縣府加盟店',
  brokerage_license_no text not null default '府地籍字第1120453178號',
  realtor_certificate_no text not null default '（112）彰縣字第00538號',
  updated_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint company_settings_singleton_check check (id = 'default')
);

drop trigger if exists company_settings_set_updated_at on public.company_settings;
create trigger company_settings_set_updated_at before update on public.company_settings
for each row execute function public.set_updated_at();

insert into public.company_settings (
  id,
  company_name,
  franchise_name,
  brokerage_license_no,
  realtor_certificate_no
)
values (
  'default',
  '赫成開發有限公司',
  '太平洋房屋彰化縣府加盟店',
  '府地籍字第1120453178號',
  '（112）彰縣字第00538號'
)
on conflict (id) do nothing;

alter table public.company_settings enable row level security;

drop policy if exists "public read company settings" on public.company_settings;
create policy "public read company settings" on public.company_settings
  for select to anon, authenticated
  using (id = 'default');

drop policy if exists "staff manage company settings" on public.company_settings;
create policy "staff manage company settings" on public.company_settings
  for all to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (id = 'default' and public.is_admin_role(array['editor','admin','owner']));

grant select on table public.company_settings to anon, authenticated;
grant insert, update, delete on table public.company_settings to authenticated;
