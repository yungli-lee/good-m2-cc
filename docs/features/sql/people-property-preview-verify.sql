-- 只讀：確認 relation schema、FK、constraints、indexes、trigger、RLS、policies、grants。
select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns where table_schema='public' and table_name='people_properties'
order by ordinal_position;
select tc.constraint_name, tc.constraint_type, kcu.column_name, ccu.table_schema as foreign_schema, ccu.table_name as foreign_table, ccu.column_name as foreign_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu using (constraint_schema,constraint_name,table_name)
left join information_schema.constraint_column_usage ccu using (constraint_schema,constraint_name)
where tc.table_schema='public' and tc.table_name='people_properties';
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='people_properties';
select tg.tgname, pg_get_triggerdef(tg.oid) from pg_trigger tg join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='people_properties' and not tg.tgisinternal;
select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='people_properties';
select polname, polcmd, polroles::regrole[], pg_get_expr(polqual,polrelid) as using_expression, pg_get_expr(polwithcheck,polrelid) as with_check_expression from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='people_properties';
select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='people_properties' order by grantee, privilege_type;
