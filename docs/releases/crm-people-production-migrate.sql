-- Production CRM additive migration；人工執行前必須完成 backup 與 precheck。
-- 不寫入 migration ledger；不修改 people/properties/people_properties。
begin;

do $$
declare missing text[];
begin
  if to_regclass('public.people') is null or to_regclass('public.properties') is null then
    raise exception 'Required people/properties table is missing';
  end if;
  if to_regprocedure('public.set_updated_at()') is null or to_regprocedure('public.is_admin_role(text[])') is null then
    raise exception 'Required helper function is missing';
  end if;

  if to_regclass('public.people_properties') is not null then
    select array_agg(x) into missing from unnest(array['id','person_id','property_id','relationship_type','relationship_label','note','status','started_at','ended_at','created_by','created_at','updated_at','archived_at']) x
    where not exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='people_properties' and c.column_name=x);
    if missing is not null then raise exception 'people_properties exists but is missing columns: %', missing; end if;
  else
    create table public.people_properties (
      id uuid primary key default gen_random_uuid(), person_id uuid not null references public.people(id) on delete cascade,
      property_id uuid not null references public.properties(id) on delete cascade, relationship_type text not null,
      relationship_label text, note text, status text not null default 'active', started_at timestamptz, ended_at timestamptz,
      created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
      constraint people_properties_relationship_type_check check (relationship_type in ('owner','buyer','viewer','negotiator','tenant','landlord','referrer','contact','other')),
      constraint people_properties_status_check check (status in ('active','archived')),
      constraint people_properties_dates_check check (ended_at is null or started_at is null or ended_at >= started_at),
      constraint people_properties_archive_consistency_check check ((status='active' and archived_at is null) or (status='archived' and archived_at is not null))
    );
  end if;

  if to_regclass('public.people_activities') is not null then
    select array_agg(x) into missing from unnest(array['id','person_id','activity_type','activity_date','note','created_by','created_at','updated_at','archived_at']) x
    where not exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='people_activities' and c.column_name=x);
    if missing is not null then raise exception 'people_activities exists but is missing columns: %', missing; end if;
  else
    create table public.people_activities (
      id uuid primary key default gen_random_uuid(), person_id uuid not null references public.people(id) on delete cascade,
      activity_type text not null, activity_date timestamptz not null default now(), note text,
      created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
      constraint people_activities_type_check check (activity_type in ('visit','phone','line','sms','email','initial_contact','requirement_discussion','other'))
    );
  end if;
end $$;

create index if not exists people_properties_person_idx on public.people_properties(person_id);
create index if not exists people_properties_property_idx on public.people_properties(property_id);
create index if not exists people_properties_type_idx on public.people_properties(relationship_type);
create index if not exists people_properties_status_idx on public.people_properties(status);
create index if not exists people_properties_created_idx on public.people_properties(created_at desc);
create unique index if not exists people_properties_active_unique_idx on public.people_properties(person_id, property_id, relationship_type) where status='active';
create index if not exists people_activities_person_idx on public.people_activities(person_id);
create index if not exists people_activities_activity_date_idx on public.people_activities(activity_date desc);
create index if not exists people_activities_created_idx on public.people_activities(created_at desc);
create index if not exists people_activities_person_date_idx on public.people_activities(person_id, activity_date desc, created_at desc);

drop trigger if exists people_properties_set_updated_at on public.people_properties;
create trigger people_properties_set_updated_at before update on public.people_properties for each row execute function public.set_updated_at();
drop trigger if exists people_activities_set_updated_at on public.people_activities;
create trigger people_activities_set_updated_at before update on public.people_activities for each row execute function public.set_updated_at();

alter table public.people_properties enable row level security;
alter table public.people_activities enable row level security;

do $$ begin
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='people_properties' and p.polname='authenticated read people properties') then
    create policy "authenticated read people properties" on public.people_properties for select to authenticated using (public.is_admin_role(array['viewer','editor','admin','owner']));
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='people_properties' and p.polname='staff insert people properties') then
    create policy "staff insert people properties" on public.people_properties for insert to authenticated with check (public.is_admin_role(array['editor','admin','owner']));
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='people_properties' and p.polname='staff update people properties') then
    create policy "staff update people properties" on public.people_properties for update to authenticated using (public.is_admin_role(array['editor','admin','owner'])) with check (public.is_admin_role(array['editor','admin','owner']));
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='people_activities' and p.polname='authenticated read people activities') then
    create policy "authenticated read people activities" on public.people_activities for select to authenticated using (public.is_admin_role(array['viewer','editor','admin','owner']));
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='people_activities' and p.polname='staff insert people activities') then
    create policy "staff insert people activities" on public.people_activities for insert to authenticated with check (public.is_admin_role(array['editor','admin','owner']));
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='people_activities' and p.polname='staff update people activities') then
    create policy "staff update people activities" on public.people_activities for update to authenticated using (public.is_admin_role(array['editor','admin','owner'])) with check (public.is_admin_role(array['editor','admin','owner']));
  end if;
end $$;

grant select, insert, update on public.people_properties to authenticated;
grant select, insert, update on public.people_activities to authenticated;
revoke all on public.people_properties from anon;
revoke all on public.people_activities from anon;
revoke delete, truncate, references, trigger on public.people_properties from authenticated;
revoke delete, truncate, references, trigger on public.people_activities from authenticated;
revoke delete, truncate, references, trigger on public.people_properties from anon;
revoke delete, truncate, references, trigger on public.people_activities from anon;

commit;
