-- Production CRM verify；僅 SELECT。不得修改資料或 ledger。
select table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name in ('people_properties','people_activities') order by table_name, ordinal_position;
select tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name, ccu.table_name as referenced_table, ccu.column_name as referenced_column
from information_schema.table_constraints tc left join information_schema.key_column_usage kcu using (constraint_schema,constraint_name,table_name) left join information_schema.constraint_column_usage ccu using (constraint_schema,constraint_name)
where tc.table_schema='public' and tc.table_name in ('people_properties','people_activities') order by tc.table_name,tc.constraint_name;
select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename in ('people_properties','people_activities') order by tablename,indexname;
select n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('people_properties','people_activities') and not t.tgisinternal;
select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('people_properties','people_activities');
select c.relname,p.polname,p.polcmd,p.polroles::regrole[],pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('people_properties','people_activities');
select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in ('people_properties','people_activities') order by table_name,grantee,privilege_type;
select count(*) as people_properties_count from public.people_properties;
select count(*) as people_activities_count from public.people_activities;
