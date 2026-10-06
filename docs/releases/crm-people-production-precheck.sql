-- Production CRM Release precheck；僅 SELECT。
-- 請確認 SQL Editor project ref = rlbuadkmylulieoryzal 後執行。

select current_database(), current_user, inet_server_addr(), inet_server_port();

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('people','properties','people_properties','people_activities')
order by table_name;

select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('people','properties','people_properties','people_activities')
order by table_name, ordinal_position;

select tc.table_name, tc.constraint_name, tc.constraint_type
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.table_name in ('people_properties','people_activities')
order by tc.table_name, tc.constraint_name;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('people_properties','people_activities')
order by tablename, indexname;

select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('people_properties','people_activities')
  and not t.tgisinternal;

select n.nspname as schema_name, c.relname as table_name, p.polname,
       p.polcmd, pg_get_expr(p.polqual,p.polrelid) as using_expression,
       pg_get_expr(p.polwithcheck,p.polrelid) as with_check_expression
from pg_policy p
join pg_class c on c.oid=p.polrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('people_properties','people_activities');

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name in ('people_properties','people_activities')
order by table_name, grantee, privilege_type;

select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('set_updated_at','is_admin_role');

select version from supabase_migrations.schema_migrations order by version desc limit 20;
