create index if not exists properties_expired_at_idx
  on public.properties(expired_at desc)
  where status = 'expired' and deleted_at is null;

create or replace function public.expire_published_listings(
  p_source text default 'manual',
  p_actor_user_id uuid default auth.uid(),
  p_actor_email text default null,
  p_actor_role text default null
)
returns table (
  property_id uuid,
  title text,
  listing_end_date date,
  expired_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  property_record record;
  executed_at timestamptz := now();
  today_taipei date := (now() at time zone 'Asia/Taipei')::date;
  source_name text := coalesce(nullif(p_source, ''), 'manual');
  actor_email text := coalesce(nullif(p_actor_email, ''), 'system');
  actor_role text := coalesce(nullif(p_actor_role, ''), 'system');
begin
  if source_name not in ('manual', 'auto') then
    raise exception 'Invalid expire listings source';
  end if;

  if auth.uid() is not null and not public.is_admin_role(array['admin','owner']) then
    raise exception 'Insufficient permission to expire listings';
  end if;

  if source_name = 'manual' and not public.is_admin_role(array['admin','owner']) then
    raise exception 'Insufficient permission to expire listings';
  end if;

  for property_record in
    select p.id, p.title, p.listing_end_date, p.status, p.published_at
    from public.properties p
    where p.status = 'published'
      and p.deleted_at is null
      and p.listing_end_date is not null
      and p.listing_end_date < today_taipei
    order by p.listing_end_date asc, p.updated_at asc
    for update skip locked
  loop
    update public.properties
    set
      status = 'expired',
      expired_at = executed_at,
      is_featured = false,
      updated_by = case when source_name = 'manual' then p_actor_user_id else null end,
      updated_at = executed_at
    where id = property_record.id
      and status = 'published'
      and deleted_at is null;

    insert into public.property_timeline_events (
      property_id,
      event_date,
      event_type,
      title,
      content,
      created_by,
      created_by_email
    )
    values (
      property_record.id,
      today_taipei,
      'unpublished',
      case when source_name = 'auto' then '委託到期自動下架' else '委託到期下架' end,
      '委託期限 ' || replace(property_record.listing_end_date::text, '-', '/') || ' 已到期，系統自動下架',
      case when source_name = 'manual' then p_actor_user_id else null end,
      actor_email
    );

    perform public.write_audit_log(
      case when source_name = 'manual' then p_actor_user_id else null end,
      actor_email,
      actor_role,
      'property_auto_expired'::public.audit_action,
      'property',
      property_record.id::text,
      null,
      null,
      jsonb_build_object(
        'status', property_record.status,
        'published_at', property_record.published_at,
        'listing_end_date', property_record.listing_end_date
      ),
      jsonb_build_object(
        'status', 'expired',
        'expired_at', executed_at,
        'listing_end_date', property_record.listing_end_date
      ),
      'success',
      case when source_name = 'auto' then '委託到期自動下架' else '委託到期手動下架' end,
      null,
      source_name,
      'system',
      null,
      jsonb_build_object(
        'property_id', property_record.id,
        'title', property_record.title,
        'listing_end_date', property_record.listing_end_date,
        'executed_at', executed_at,
        'actor', case when source_name = 'auto' then 'system' else actor_email end,
        'source', source_name
      )
    );

    property_id := property_record.id;
    title := property_record.title;
    listing_end_date := property_record.listing_end_date;
    expired_at := executed_at;
    return next;
  end loop;
end;
$$;

revoke all on function public.expire_published_listings(text, uuid, text, text) from public, anon;
grant execute on function public.expire_published_listings(text, uuid, text, text) to authenticated, service_role;

create extension if not exists pg_cron with schema extensions;

do $$
begin
  perform cron.unschedule('property-auto-expire-daily');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'property-auto-expire-daily',
  '10 16 * * *',
  $$select public.expire_published_listings('auto', null, 'system', 'system');$$
);
