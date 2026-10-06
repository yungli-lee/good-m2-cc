-- Rollback 說明：最安全是保留 text[] schema、回退應用程式；多選轉回 scalar 不可完全無損。
-- 下列 SQL 僅在明確核准、已備份且接受資料壓縮後執行；會以頓號串接多選值。
begin;
alter table public.properties alter column sale_motivation type text using nullif(array_to_string(sale_motivation,'、'),'');
alter table public.properties alter column current_condition_type type text using nullif(array_to_string(current_condition_type,'、'),'');
alter table public.properties alter column current_usage type text using nullif(array_to_string(current_usage,'、'),'');
alter table public.properties alter column building_style type text using nullif(array_to_string(building_style,'、'),'');
alter table public.properties alter column parking_type type text using nullif(array_to_string(parking_type,'、'),'');
alter table public.properties alter column sale_motivation set default '資金運用';
commit;
-- 此回轉不會自動重建舊 constraints；不建議在未保存備份與未重建驗證前執行。
