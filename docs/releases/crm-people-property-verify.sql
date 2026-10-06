-- 僅供 migration 後唯讀驗證。
select table_name from information_schema.tables where table_schema='public' and table_name='people_properties';
select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid='public.people_properties'::regclass;
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='people_properties';
select relrowsecurity,relforcerowsecurity from pg_class where oid='public.people_properties'::regclass;
select policyname,cmd,roles,qual,with_check from pg_policies where schemaname='public' and tablename='people_properties';
