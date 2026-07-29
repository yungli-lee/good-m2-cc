-- 執行前唯讀檢查：只 SELECT，不修改 Production。
select column_name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='properties' and column_name in ('contract_signed_date','sale_motivation','sale_motivation_other','current_condition_type','current_condition_other','current_usage','current_usage_other','building_style','building_style_other','parking_type','parking_type_other','road_width','completion_date','has_addition','addition_description','elementary_school_district','junior_high_school_district','showing_meeting_location') order by ordinal_position;
-- Constraints。
select conname,pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.properties'::regclass and conname like 'properties_%_check';
-- Indexes。
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='properties' and (indexname like '%contract_signed%' or indexname like '%completion%');
-- Migration ledger；不可由本包直接 INSERT。
select version from supabase_migrations.schema_migrations where version in ('202607280101','202607280102') order by version;
-- Aggregate 異常資料。
select count(*) total,count(*) filter(where sale_motivation is null) sale_null,count(*) filter(where sale_motivation::text='') sale_empty,count(*) filter(where current_condition_type::text='') condition_empty,count(*) filter(where current_usage::text='') usage_empty,count(*) filter(where building_style::text='') style_empty,count(*) filter(where parking_type::text='') parking_empty from public.properties;
