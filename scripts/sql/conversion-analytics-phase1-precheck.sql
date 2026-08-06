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
