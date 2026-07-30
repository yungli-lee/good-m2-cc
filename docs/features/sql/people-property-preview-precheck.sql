-- 只讀：確認必要 table、主鍵型別與既有 relation 物件。
select t.table_schema, t.table_name
from information_schema.tables t
where t.table_schema = 'public' and t.table_name in ('people','properties','people_properties');

select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable
from information_schema.columns c
where c.table_schema = 'public' and c.table_name in ('people','properties')
  and c.column_name in ('id','created_by','owner_id')
order by c.table_name, c.ordinal_position;

select tc.table_name, tc.constraint_name, tc.constraint_type
from information_schema.table_constraints tc
where tc.table_schema = 'public' and tc.table_name = 'people_properties';

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'people_properties';

select n.nspname as schema_name, c.relname as table_name, p.polname as policy_name
from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='people_properties';

select n.nspname as schema_name, p.proname as function_name
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('set_updated_at','is_admin_role');

select version from supabase_migrations.schema_migrations
where version in ('202607290101','202607290101_people_properties') order by version;
