create or replace function public.update_person_activity(
  p_person_id uuid,
  p_activity_id uuid,
  p_activity_type text,
  p_channel text,
  p_summary text,
  p_details text,
  p_occurred_at timestamptz
)
returns public.person_activities
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  updated_activity public.person_activities;
begin
  if not public.can_access_person(p_person_id) then
    raise exception using errcode = '42501', message = 'person not found or inaccessible';
  end if;

  update public.person_activities
  set
    activity_type = p_activity_type,
    channel = nullif(trim(p_channel), ''),
    summary = trim(p_summary),
    details = nullif(trim(p_details), ''),
    occurred_at = p_occurred_at,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_activity_id
    and person_id = p_person_id
    and deleted_at is null
  returning * into updated_activity;

  if updated_activity.id is null then
    raise exception using errcode = 'P0002', message = 'activity not found or deleted';
  end if;

  update public.people
  set
    last_contacted_at = (
      select max(active_activity.occurred_at)
      from (
        select activity.occurred_at
        from public.person_activities activity
        where activity.person_id = p_person_id
          and activity.id <> p_activity_id
          and activity.deleted_at is null
        union all
        select p_occurred_at
      ) active_activity
    ),
    updated_by = auth.uid()
  where id = p_person_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'person not found';
  end if;

  return updated_activity;
end;
$$;

create or replace function public.soft_delete_person_activity(
  p_person_id uuid,
  p_activity_id uuid
)
returns public.person_activities
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  deleted_activity public.person_activities;
begin
  if not public.can_access_person(p_person_id) then
    raise exception using errcode = '42501', message = 'person not found or inaccessible';
  end if;

  update public.person_activities
  set
    deleted_at = now(),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_activity_id
    and person_id = p_person_id
    and deleted_at is null
  returning * into deleted_activity;

  if deleted_activity.id is null then
    raise exception using errcode = 'P0002', message = 'activity not found or deleted';
  end if;

  update public.people
  set
    last_contacted_at = (
      select max(activity.occurred_at)
      from public.person_activities activity
      where activity.person_id = p_person_id
        and activity.id <> p_activity_id
        and activity.deleted_at is null
    ),
    updated_by = auth.uid()
  where id = p_person_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'person not found';
  end if;

  return deleted_activity;
end;
$$;

revoke all on function public.update_person_activity(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.update_person_activity(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz
) to authenticated;

revoke all on function public.soft_delete_person_activity(
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.soft_delete_person_activity(
  uuid,
  uuid
) to authenticated;
