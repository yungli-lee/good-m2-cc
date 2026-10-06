-- Read-only verification after an approved Preview migration.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'analytics_events' and column_name in (
      'event_id','event_version','occurred_at','received_at','visitor_id','session_id',
      'person_id','inquiry_id','requirement_id','property_id','utm_content','utm_term',
      'device_class','source_system','environment','is_bot','is_internal','event_properties'
    ))
    or table_name = 'lead_attributions'
    or (table_name = 'inquiries' and column_name in ('visitor_id','session_id','attribution_status'))
  )
order by table_name, ordinal_position;

select conrelid::regclass::text as table_name, conname, convalidated,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid in (
    'public.analytics_events'::regclass,
    'public.lead_attributions'::regclass,
    'public.inquiries'::regclass
  )
order by table_name, conname;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('analytics_events','lead_attributions','inquiries')
order by tablename, indexname;

select n.nspname as schemaname, c.relname as tablename,
       c.relrowsecurity as rowsecurity, c.relforcerowsecurity as forcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('analytics_events','lead_attributions')
  and c.relkind = 'r';

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('analytics_events','lead_attributions')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('analytics_events','lead_attributions','inquiries')
order by table_name, grantee, privilege_type;

select event_object_table as table_name, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table = 'lead_attributions'
order by trigger_name;

select
  count(*) filter (where event_id is null) as missing_event_id,
  count(*) filter (where occurred_at is null or received_at is null) as missing_timestamps,
  count(*) filter (where environment is null) as missing_environment,
  count(*) filter (where is_bot is null or is_internal is null) as missing_traffic_flags,
  count(*) filter (where environment = 'legacy_unknown') as legacy_rows,
  count(*) as total_events
from public.analytics_events;

select attribution_status, count(*)
from public.inquiries
group by attribution_status
order by attribution_status;

select count(*) as lead_attribution_rows from public.lead_attributions;
