-- Preview-only migration. 先執行 precheck 並核對 project ref；不要在 Production 執行。
begin;

do $$
begin
  if to_regclass('public.people_properties') is not null then
    raise exception 'people_properties already exists; stop and inspect precheck instead of rerunning migration';
  end if;
  if to_regclass('public.people') is null or to_regclass('public.properties') is null then
    raise exception 'required people/properties table is missing';
  end if;
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'required public.set_updated_at() is missing';
  end if;
end $$;

create table public.people_properties (
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
create index people_properties_person_idx on public.people_properties(person_id);
create index people_properties_property_idx on public.people_properties(property_id);
create index people_properties_type_idx on public.people_properties(relationship_type);
create index people_properties_status_idx on public.people_properties(status);
create index people_properties_created_idx on public.people_properties(created_at desc);
create unique index people_properties_active_unique_idx on public.people_properties(person_id, property_id, relationship_type) where status = 'active';
create trigger people_properties_set_updated_at before update on public.people_properties for each row execute function public.set_updated_at();
alter table public.people_properties enable row level security;
create policy "staff read people properties" on public.people_properties for select to authenticated using (public.is_admin_role(array['editor','admin','owner']));
create policy "staff insert people properties" on public.people_properties for insert to authenticated with check (public.is_admin_role(array['editor','admin','owner']));
create policy "staff update people properties" on public.people_properties for update to authenticated using (public.is_admin_role(array['editor','admin','owner'])) with check (public.is_admin_role(array['editor','admin','owner']));
grant select, insert, update on table public.people_properties to authenticated;
revoke all on table public.people_properties from anon;

commit;
