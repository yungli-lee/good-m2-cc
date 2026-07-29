-- People、Property、Timeline、Inquiry、Task、Requirement、Tag 的 FK。
select tc.table_name,tc.constraint_name,kcu.column_name,ccu.table_name as referenced_table,ccu.column_name as referenced_column from information_schema.table_constraints tc join information_schema.key_column_usage kcu on kcu.constraint_name=tc.constraint_name and kcu.table_schema=tc.table_schema join information_schema.constraint_column_usage ccu on ccu.constraint_name=tc.constraint_name and ccu.constraint_schema=tc.table_schema where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public' and lower(tc.table_name) ~ '(people|person|customer|contact|timeline|activity|task|requirement|inquiry|property|tag)';
-- 關聯候選表是否存在。
select table_name,table_type from information_schema.tables where table_schema='public' and lower(table_name) in ('people_properties','person_properties','property_people','customer_requirements','buyer_requirements','tags','person_tags','tasks','person_tasks','task_templates','task_packages','task_items','assignments','property_timeline_events','inquiries');
-- Inquiry 是否有 person 相關欄位。
select column_name,data_type,udt_name from information_schema.columns where table_schema='public' and table_name='inquiries' and lower(column_name) like '%person%';
-- orphan 查詢須待上面確認實際表／欄位後再另行執行；本檔不猜測欄位。
