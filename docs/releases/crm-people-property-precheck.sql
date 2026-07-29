-- 僅供執行前唯讀檢查。
select table_name from information_schema.tables where table_schema='public' and table_name in ('people','properties','people_properties');
select column_name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='people_properties' order by ordinal_position;
select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid='public.people_properties'::regclass;
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='people_properties';
