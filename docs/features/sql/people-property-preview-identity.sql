-- 只讀：在 Preview SQL Editor 執行；不要在未知或 Production project 執行。
select current_database() as database_name,
       current_user,
       inet_server_addr() as server_address,
       inet_server_port() as server_port,
       current_setting('cluster_name', true) as cluster_name,
       current_setting('app.settings.environment', true) as app_environment;

-- 只讀：確認必要 table 存在，不讀取業務資料。
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('people', 'properties', 'people_properties')
order by table_name;

-- 只讀：確認 migration ledger 最新版本。
select version
from supabase_migrations.schema_migrations
order by version desc
limit 20;
