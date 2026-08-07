-- Production read-only precheck. Every statement in this file is SELECT-only.
select current_database() as database_name, current_user as database_user, now() as checked_at;

select 'analytics_events' as table_name, count(*) as row_count
from public.analytics_events
union all
select 'inquiries', count(*)
from public.inquiries
order by table_name;

select table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'analytics_events'
  and column_name = 'session_id';

select
  count(*) as total_rows,
  count(*) filter (where session_id is null) as null_count,
  count(*) filter (where session_id is not null and btrim(session_id::text) = '') as empty_string_count,
  count(*) filter (
    where session_id is not null
      and btrim(session_id::text) <> ''
      and btrim(session_id::text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) as valid_uuid_text_count,
  count(*) filter (
    where session_id is not null
      and btrim(session_id::text) <> ''
      and btrim(session_id::text) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) as invalid_non_empty_text_count
from public.analytics_events;

select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('analytics_events', 'rate_limit_events')
  and c.relkind = 'r'
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('analytics_events', 'rate_limit_events')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'rate_limit_events'
order by grantee, privilege_type;

select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as identity_arguments,
       pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin_role', 'set_updated_at')
order by p.proname, identity_arguments;

select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'analytics_events' and column_name in ('id', 'session_id'))
    or (table_name = 'inquiries' and column_name = 'id')
    or (table_name = 'people' and column_name = 'id')
    or (table_name = 'properties' and column_name = 'id')
    or (table_name = 'crm_customer_requirements' and column_name = 'id')
    or (table_name = 'rate_limit_events' and column_name = 'id')
  )
order by table_name, column_name;

select version, name
from supabase_migrations.schema_migrations
where version = '202608060101';
