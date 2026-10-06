-- CRM 相關 tables/views。
select table_schema,table_name,table_type from information_schema.tables where table_schema='public' and lower(table_name) ~ '(people|person|customer|contact|timeline|activity|task|requirement|inquiry|property|tag)' order by table_name;
-- 欄位、型別、nullable、default。
select table_name,column_name,data_type,udt_name,is_nullable,column_default,ordinal_position from information_schema.columns where table_schema='public' and lower(table_name) ~ '(people|person|customer|contact|timeline|activity|task|requirement|inquiry|property|tag)' order by table_name,ordinal_position;
-- Primary key、foreign key、check／unique constraints。
select conrelid::regclass as table_name,conname,contype,pg_get_constraintdef(oid) as definition from pg_constraint where connamespace='public'::regnamespace and conrelid::regclass::text ~ '(people|person|customer|contact|timeline|activity|task|requirement|inquiry|property|tag)';
-- Indexes。
select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname='public' and lower(tablename) ~ '(people|person|customer|contact|timeline|activity|task|requirement|inquiry|property|tag)';
