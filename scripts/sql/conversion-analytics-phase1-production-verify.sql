-- Production post-migration verification. Every statement in this file is SELECT-only.
select current_database() as database_name, current_user as database_user, now() as checked_at;

select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'analytics_events' and column_name = 'session_id')
    or (table_name = 'inquiries' and column_name in ('id', 'visitor_id', 'session_id', 'attribution_status'))
    or table_name = 'lead_attributions'
  )
order by table_name, ordinal_position;

select
  count(*) filter (
    where table_name = 'analytics_events' and column_name = 'session_id'
      and udt_name = 'uuid'
  ) = 1 as analytics_session_is_uuid,
  count(*) filter (
    where table_name = 'inquiries' and column_name = 'visitor_id'
      and udt_name = 'uuid'
  ) = 1 as inquiry_visitor_is_uuid,
  count(*) filter (
    where table_name = 'inquiries' and column_name = 'session_id'
      and udt_name = 'uuid'
  ) = 1 as inquiry_session_is_uuid,
  count(*) filter (
    where table_name = 'inquiries' and column_name = 'attribution_status'
      and data_type = 'text' and is_nullable = 'NO'
      and column_default = '''missing''::text'
  ) = 1 as inquiry_attribution_default_is_missing
from information_schema.columns
where table_schema = 'public'
  and table_name in ('analytics_events', 'inquiries');

select conrelid::regclass::text as table_name, conname, convalidated,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid in (
    'public.analytics_events'::regclass,
    'public.inquiries'::regclass,
    'public.lead_attributions'::regclass
  )
order by table_name, conname;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and (
    (tablename = 'analytics_events' and indexname in (
      'analytics_events_environment_occurred_idx',
      'analytics_events_environment_name_occurred_idx',
      'analytics_events_visitor_occurred_idx',
      'analytics_events_session_occurred_idx',
      'analytics_events_inquiry_idx',
      'analytics_events_property_idx'
    ))
    or (tablename = 'inquiries' and indexname in (
      'inquiries_attribution_status_idx',
      'inquiries_visitor_session_idx'
    ))
    or (tablename = 'lead_attributions' and indexname in (
      'lead_attributions_inquiry_key',
      'lead_attributions_person_idx',
      'lead_attributions_property_idx',
      'lead_attributions_visitor_idx',
      'lead_attributions_session_idx',
      'lead_attributions_inquiry_at_idx'
    ))
  )
order by tablename, indexname;

select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('analytics_events', 'lead_attributions')
  and c.relkind = 'r'
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('analytics_events', 'lead_attributions', 'rate_limit_events')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and (
    table_name in ('analytics_events', 'lead_attributions')
    or (table_name = 'rate_limit_events' and grantee = 'service_role')
  )
order by table_name, grantee, privilege_type;

select count(*) as original_inquiry_count
from public.inquiries;

select count(*) as lead_attribution_count
from public.lead_attributions;

select version, name
from supabase_migrations.schema_migrations
where version = '202608060101';
