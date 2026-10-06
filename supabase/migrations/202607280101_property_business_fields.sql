-- Additive property business/export fields. Safe to apply once on Preview first.
alter table public.properties
  add column if not exists contract_signed_date date,
  add column if not exists sale_motivation text not null default '資金運用',
  add column if not exists sale_motivation_other text,
  add column if not exists current_condition_type text,
  add column if not exists current_condition_other text,
  add column if not exists current_usage text,
  add column if not exists current_usage_other text,
  add column if not exists building_style text,
  add column if not exists building_style_other text,
  add column if not exists parking_type text,
  add column if not exists parking_type_other text,
  add column if not exists road_width numeric,
  add column if not exists completion_date date,
  add column if not exists has_addition boolean not null default false,
  add column if not exists addition_description text,
  add column if not exists elementary_school_district text,
  add column if not exists junior_high_school_district text,
  add column if not exists showing_meeting_location text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'properties_sale_motivation_check') then
    alter table public.properties add constraint properties_sale_motivation_check
      check (sale_motivation in ('換屋','工作','就學','家庭組成改變','移民','資金運用','其他'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_current_condition_type_check') then
    alter table public.properties add constraint properties_current_condition_type_check
      check (current_condition_type is null or current_condition_type in ('空屋','自用','出租','結構體','其他'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_current_usage_check') then
    alter table public.properties add constraint properties_current_usage_check
      check (current_usage is null or current_usage in ('住宅','店面','辦公','住辦','住店','廠房','倉庫','土地','車位','其他'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_building_style_check') then
    alter table public.properties add constraint properties_building_style_check
      check (building_style is null or building_style in ('透天','別墅','農舍','公寓','華廈','電梯大樓','套房','店面','廠房','倉庫','土地','其他'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_parking_type_check') then
    alter table public.properties add constraint properties_parking_type_check
      check (parking_type is null or parking_type in ('無','車庫','門前停車','騎樓停車','庭院停車','平面車位','機械車位','露天停車','其他'));
  end if;
end $$;

create index if not exists properties_contract_signed_date_idx on public.properties (contract_signed_date);
create index if not exists properties_completion_date_idx on public.properties (completion_date);
