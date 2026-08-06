-- Read-only. Run against Preview before requesting migration approval.
select current_database() as database_name, now() as checked_at;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('analytics_events','lead_attributions','inquiries')
order by table_name;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('analytics_events','lead_attributions','inquiries')
order by table_name, ordinal_position;

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
  ) as valid_uuid_count,
  count(*) filter (
    where session_id is not null
      and btrim(session_id::text) <> ''
      and btrim(session_id::text) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) as invalid_uuid_count
from public.analytics_events;

select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid in ('public.analytics_events'::regclass, 'public.inquiries'::regclass)
order by table_name, conname;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename in ('analytics_events','inquiries')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('analytics_events','inquiries')
order by table_name, grantee, privilege_type;

select 'analytics_events' as table_name, count(*) as row_count from public.analytics_events
union all
select 'inquiries', count(*) from public.inquiries;
