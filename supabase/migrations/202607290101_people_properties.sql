-- CRM Phase 1: formal People–Property many-to-many relations.
create table if not exists public.people_properties (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  relationship_type text not null,
  relationship_label text,
  note text,
  status text not null default 'active',
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint people_properties_relationship_type_check check (relationship_type in ('owner','buyer','viewer','negotiator','tenant','landlord','referrer','contact','other')),
  constraint people_properties_status_check check (status in ('active','archived')),
  constraint people_properties_dates_check check (ended_at is null or started_at is null or ended_at >= started_at),
  constraint people_properties_archive_consistency_check check ((status = 'active' and archived_at is null) or (status = 'archived' and archived_at is not null))
);
create index if not exists people_properties_person_idx on public.people_properties(person_id);
create index if not exists people_properties_property_idx on public.people_properties(property_id);
create index if not exists people_properties_type_idx on public.people_properties(relationship_type);
create index if not exists people_properties_status_idx on public.people_properties(status);
create index if not exists people_properties_created_idx on public.people_properties(created_at desc);
create unique index if not exists people_properties_active_unique_idx on public.people_properties(person_id, property_id, relationship_type) where status = 'active';
drop trigger if exists people_properties_set_updated_at on public.people_properties;
create trigger people_properties_set_updated_at before update on public.people_properties for each row execute function public.set_updated_at();
alter table public.people_properties enable row level security;
drop policy if exists "staff read people properties" on public.people_properties;
create policy "staff read people properties" on public.people_properties for select to authenticated using (public.is_admin_role(array['editor','admin','owner']));
drop policy if exists "staff insert people properties" on public.people_properties;
create policy "staff insert people properties" on public.people_properties for insert to authenticated with check (public.is_admin_role(array['editor','admin','owner']));
drop policy if exists "staff update people properties" on public.people_properties;
create policy "staff update people properties" on public.people_properties for update to authenticated using (public.is_admin_role(array['editor','admin','owner'])) with check (public.is_admin_role(array['editor','admin','owner']));
grant select, insert, update on table public.people_properties to authenticated;
revoke all on table public.people_properties from anon;
