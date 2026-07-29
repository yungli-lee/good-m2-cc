-- CRM tables 的 RLS enabled／forced 狀態。
select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and lower(c.relname) ~ '(people|person|customer|contact|timeline|activity|task|requirement|inquiry|property|tag)';
-- RLS policies。
select schemaname,tablename,policyname,cmd,roles,qual as using_expression,with_check from pg_policies where schemaname='public' and lower(tablename) ~ '(people|person|customer|contact|timeline|activity|task|requirement|inquiry|property|tag)' order by tablename,policyname;
