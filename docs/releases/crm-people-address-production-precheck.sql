-- Production CRM People address precheck；唯讀，不修改 schema、資料或 migration ledger。
select
  to_regclass('public.people') as people_table,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'people'
      and column_name = 'address'
  ) as address_exists;

select
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'people'
  and column_name = 'address';

select
  count(*) as people_count,
  count(*) filter (where address is not null) as address_populated_count
from public.people;

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'people'
order by policyname;

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'people'
order by grantee, privilege_type;

-- 僅核對 ledger；本 release SQL 不會直接寫入 ledger。
select version
from supabase_migrations.schema_migrations
where version = '202607310101';
