create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  normalized_phone text,
  line_id text,
  normalized_line_id text,
  email text,
  normalized_email text,
  source text not null default 'manual',
  status text not null default 'active',
  assigned_to uuid references auth.users(id),
  last_contacted_at timestamptz,
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_status_check check (
    status in ('active', 'inactive', 'archived')
  ),
  constraint people_source_check check (
    source in ('manual', 'inquiry', 'line', 'facebook', 'referral', 'import', 'other')
  )
);

create table if not exists public.person_roles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  role text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint person_roles_role_check check (
    role in ('buyer', 'seller', 'landlord', 'investor', 'broker')
  ),
  constraint person_roles_person_role_key unique (person_id, role)
);

create index if not exists people_normalized_phone_idx
  on public.people(normalized_phone);

create index if not exists people_normalized_email_idx
  on public.people(normalized_email);

create index if not exists people_normalized_line_id_idx
  on public.people(normalized_line_id);

create index if not exists people_assigned_to_idx
  on public.people(assigned_to);

create index if not exists people_status_idx
  on public.people(status);

create index if not exists people_created_at_idx
  on public.people(created_at desc);

create index if not exists people_deleted_at_idx
  on public.people(deleted_at);

create index if not exists person_roles_person_id_idx
  on public.person_roles(person_id);

create index if not exists person_roles_role_idx
  on public.person_roles(role);

drop trigger if exists people_set_updated_at on public.people;
create trigger people_set_updated_at before update on public.people
for each row execute function public.set_updated_at();

alter table public.people enable row level security;
alter table public.person_roles enable row level security;

drop policy if exists "staff read people" on public.people;
create policy "staff read people" on public.people
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert people" on public.people;
create policy "staff insert people" on public.people
  for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff update people" on public.people;
create policy "staff update people" on public.people
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff read person roles" on public.person_roles;
create policy "staff read person roles" on public.person_roles
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert person roles" on public.person_roles;
create policy "staff insert person roles" on public.person_roles
  for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff update person roles" on public.person_roles;
create policy "staff update person roles" on public.person_roles
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff delete person roles" on public.person_roles;
create policy "staff delete person roles" on public.person_roles
  for delete to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

revoke all on table public.people from anon;
revoke all on table public.person_roles from anon;
revoke all on table public.people from authenticated;
revoke all on table public.person_roles from authenticated;

grant select, insert, update on table public.people to authenticated;
grant select, insert, update, delete on table public.person_roles to authenticated;

alter type public.audit_action add value if not exists 'people_created';
alter type public.audit_action add value if not exists 'people_updated';
alter type public.audit_action add value if not exists 'people_deleted';
alter type public.audit_action add value if not exists 'people_role_added';
alter type public.audit_action add value if not exists 'people_role_removed';

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check check (
    event_name in (
      'property_view',
      'property_search',
      'knowledge_view',
      'line_click',
      'phone_click',
      'inquiry_submit',
      'featured_property_click',
      'share_click',
      'media_view',
      'admin_login',
      'person_created'
    )
  );
