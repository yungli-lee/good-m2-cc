-- Production CRM People address post-migration verification；唯讀。
select
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  col_description('public.people'::regclass, ordinal_position) as description
from information_schema.columns
where table_schema = 'public'
  and table_name = 'people'
  and column_name = 'address';

select
  count(*) as people_count,
  count(*) filter (where address is null) as address_null_count,
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

-- Ledger 必須由官方 migration/reconciliation 流程處理。
select version
from supabase_migrations.schema_migrations
where version = '202607310101';
