-- 1. 僅查 catalog：確認 people 是否存在及其欄位。
select table_schema,table_name,table_type from information_schema.tables where table_schema='public' and table_name in ('people','person_roles','property_timeline_events','inquiries');
select column_name,data_type,udt_name from information_schema.columns where table_schema='public' and table_name='people' and column_name in ('id','status','created_at','updated_at','deleted_at') order by ordinal_position;
-- 2. 只有上一段確認 people 存在後，才執行以下 aggregate。
select count(*) as people_total from public.people;
select max(created_at) as latest_created_at,max(updated_at) as latest_updated_at from public.people;
select status,count(*) as row_count from public.people group by status order by status;
select count(*) as people_total,count(*) > 150 as exceeds_150 from public.people;
