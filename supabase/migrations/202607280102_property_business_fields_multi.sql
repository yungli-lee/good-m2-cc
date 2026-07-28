-- Convert business fields from scalar text to PostgreSQL text[] without overwriting values.
alter table public.properties
  drop constraint if exists properties_sale_motivation_check,
  drop constraint if exists properties_current_condition_type_check,
  drop constraint if exists properties_current_usage_check,
  drop constraint if exists properties_building_style_check,
  drop constraint if exists properties_parking_type_check;

alter table public.properties
  alter column sale_motivation drop default;

alter table public.properties
  alter column sale_motivation type text[] using (
    case when nullif(trim(sale_motivation), '') is null then array['資金運用']::text[] else array[sale_motivation]::text[] end
  ),
  alter column current_condition_type type text[] using (
    case when nullif(trim(current_condition_type), '') is null then '{}'::text[] else array[current_condition_type]::text[] end
  ),
  alter column current_usage type text[] using (
    case when nullif(trim(current_usage), '') is null then '{}'::text[] else array[current_usage]::text[] end
  ),
  alter column building_style type text[] using (
    case when nullif(trim(building_style), '') is null then '{}'::text[] else array[building_style]::text[] end
  ),
  alter column parking_type type text[] using (
    case when nullif(trim(parking_type), '') is null then '{}'::text[] else array[parking_type]::text[] end
  ),
  alter column sale_motivation set default array['資金運用']::text[];

alter table public.properties
  add constraint properties_sale_motivation_check check (sale_motivation <@ array['換屋','工作','就學','家庭組成改變','移民','資金運用','其他']::text[]),
  add constraint properties_current_condition_type_check check (current_condition_type <@ array['空屋','自用','出租','結構體','其他']::text[]),
  add constraint properties_current_usage_check check (current_usage <@ array['住宅','店面','辦公','住辦','住店','廠房','倉庫','土地','車位','其他']::text[]),
  add constraint properties_building_style_check check (building_style <@ array['透天','別墅','農舍','公寓','華廈','電梯大樓','套房','店面','廠房','倉庫','土地','其他']::text[]),
  add constraint properties_parking_type_check check (parking_type <@ array['無','車庫','門前停車','騎樓停車','庭院停車','平面車位','機械車位','露天停車','其他']::text[]);
