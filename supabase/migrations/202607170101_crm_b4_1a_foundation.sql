alter table public.people
  add column if not exists next_follow_up_at timestamptz;

create table if not exists public.person_activities (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  activity_type text not null,
  channel text,
  summary text not null,
  details text,
  occurred_at timestamptz not null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint person_activities_activity_type_check check (
    activity_type in ('call', 'message', 'email', 'meeting', 'note', 'other')
  ),
  constraint person_activities_channel_check check (
    channel is null or channel in ('phone', 'line', 'email', 'in_person', 'facebook', 'other')
  ),
  constraint person_activities_summary_check check (
    char_length(trim(summary)) between 1 and 240
  )
);

create index if not exists people_next_follow_up_active_idx
  on public.people(next_follow_up_at)
  where status <> 'archived' and deleted_at is null and next_follow_up_at is not null;

create index if not exists person_activities_person_occurred_active_idx
  on public.person_activities(person_id, occurred_at desc)
  where deleted_at is null;

alter table public.person_activities enable row level security;

drop policy if exists "scoped read person activities" on public.person_activities;
create policy "scoped read person activities" on public.person_activities
  for select to authenticated
  using (public.can_access_person(person_id));

drop policy if exists "scoped insert person activities" on public.person_activities;
create policy "scoped insert person activities" on public.person_activities
  for insert to authenticated
  with check (
    public.can_access_person(person_id)
    and created_by = auth.uid()
    and updated_by = auth.uid()
  );

drop policy if exists "scoped update person activities" on public.person_activities;
create policy "scoped update person activities" on public.person_activities
  for update to authenticated
  using (public.can_access_person(person_id))
  with check (
    public.can_access_person(person_id)
    and updated_by = auth.uid()
  );

revoke all on table public.person_activities from anon;
revoke all on table public.person_activities from authenticated;
grant select, insert, update on table public.person_activities to authenticated;

create or replace function public.create_person_activity(
  p_person_id uuid,
  p_activity_type text,
  p_channel text,
  p_summary text,
  p_details text,
  p_occurred_at timestamptz,
  p_follow_up_mode text default 'keep',
  p_next_follow_up_at timestamptz default null
)
returns public.person_activities
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_activity public.person_activities;
  updated_people_count integer;
begin
  if p_follow_up_mode not in ('keep', 'set', 'clear') then
    raise exception using errcode = '22023', message = 'invalid follow-up mode';
  end if;

  if p_follow_up_mode = 'set' and p_next_follow_up_at is null then
    raise exception using errcode = '22023', message = 'next follow-up time is required';
  end if;

  insert into public.person_activities (
    person_id,
    activity_type,
    channel,
    summary,
    details,
    occurred_at,
    created_by,
    updated_by
  )
  values (
    p_person_id,
    p_activity_type,
    nullif(trim(p_channel), ''),
    trim(p_summary),
    nullif(trim(p_details), ''),
    p_occurred_at,
    auth.uid(),
    auth.uid()
  )
  returning * into created_activity;

  update public.people
  set
    last_contacted_at = greatest(coalesce(last_contacted_at, p_occurred_at), p_occurred_at),
    next_follow_up_at = case
      when p_follow_up_mode = 'set' then p_next_follow_up_at
      when p_follow_up_mode = 'clear' then null
      else next_follow_up_at
    end,
    updated_by = auth.uid()
  where id = p_person_id;

  get diagnostics updated_people_count = row_count;
  if updated_people_count <> 1 then
    raise exception using errcode = 'P0002', message = 'person not found or inaccessible';
  end if;

  return created_activity;
end;
$$;

revoke all on function public.create_person_activity(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  timestamptz
) from public, anon;

grant execute on function public.create_person_activity(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  timestamptz
) to authenticated;
