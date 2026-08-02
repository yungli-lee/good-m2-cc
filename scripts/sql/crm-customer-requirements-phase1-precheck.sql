select to_regclass('public.crm_customer_requirements') as requirements_table;
select column_name from information_schema.columns where table_schema='public' and table_name='people_activities' and column_name='requirement_id';
select pg_get_functiondef('public.can_access_person(uuid)'::regprocedure);
select count(*) as people_count from public.people;
select count(*) as activities_count from public.people_activities;
select policyname,cmd,qual,with_check from pg_policies where schemaname='public' and tablename in ('people','people_activities');
select grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='people_activities';
select version from supabase_migrations.schema_migrations where version='202608020201';
