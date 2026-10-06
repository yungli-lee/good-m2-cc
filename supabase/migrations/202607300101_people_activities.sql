create table if not exists public.people_activities (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  activity_type text not null,
  activity_date timestamptz not null default now(),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint people_activities_type_check check (activity_type in ('visit','phone','line','sms','email','initial_contact','requirement_discussion','other'))
);
create index if not exists people_activities_person_date_idx on public.people_activities(person_id, activity_date desc, created_at desc);
drop trigger if exists people_activities_set_updated_at on public.people_activities;
create trigger people_activities_set_updated_at before update on public.people_activities for each row execute function public.set_updated_at();
alter table public.people_activities enable row level security;
drop policy if exists "staff read people activities" on public.people_activities;
create policy "staff read people activities" on public.people_activities for select to authenticated using (public.is_admin_role(array['editor','admin','owner']));
drop policy if exists "staff insert people activities" on public.people_activities;
create policy "staff insert people activities" on public.people_activities for insert to authenticated with check (public.is_admin_role(array['editor','admin','owner']));
grant select, insert on table public.people_activities to authenticated;
revoke all on table public.people_activities from anon;
