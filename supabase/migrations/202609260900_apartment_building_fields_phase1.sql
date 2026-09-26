alter table public.properties
  add column if not exists building_subtype text,
  add column if not exists main_building_area_ping numeric,
  add column if not exists auxiliary_building_area_ping numeric,
  add column if not exists shared_area_ping numeric,
  add column if not exists parking_area_ping numeric,
  add column if not exists addition_area_ping numeric,
  add column if not exists above_ground_floors integer,
  add column if not exists basement_floors integer,
  add column if not exists parking_space_features text[],
  add column if not exists parking_access_types text[],
  add column if not exists parking_floor text,
  add column if not exists parking_space_no text,
  add column if not exists parking_arrangement text[],
  add column if not exists management_types text[],
  add column if not exists management_fee numeric,
  add column if not exists management_fee_payment text,
  add column if not exists cleaning_fee numeric,
  add column if not exists market_area text,
  add column if not exists park_green_space text,
  add column if not exists medical_facility text,
  add column if not exists nearby_train_station text,
  add column if not exists nearby_bus_stop text,
  add column if not exists community_name text,
  add column if not exists total_units integer,
  add column if not exists elevator_count integer,
  add column if not exists units_per_floor integer,
  add column if not exists mortgage_setting_amount numeric,
  add column if not exists has_courtyard boolean,
  add column if not exists is_corner_unit boolean,
  add column if not exists exterior_materials text[],
  add column if not exists building_structures text[],
  add column if not exists public_facilities text[],
  add column if not exists public_facility_floor_notes text,
  add column if not exists showing_key_available boolean,
  add column if not exists owner_age integer,
  add column if not exists owner_gender text,
  add column if not exists owner_occupation text;

alter table public.properties drop constraint if exists properties_building_subtype_check;
alter table public.properties add constraint properties_building_subtype_check
  check (building_subtype is null or building_subtype = any(array['huaxia'::text,'highrise'::text]));

alter table public.properties drop constraint if exists properties_apartment_area_fields_check;
alter table public.properties add constraint properties_apartment_area_fields_check
  check (
    (main_building_area_ping is null or main_building_area_ping >= 0) and
    (auxiliary_building_area_ping is null or auxiliary_building_area_ping >= 0) and
    (shared_area_ping is null or shared_area_ping >= 0) and
    (parking_area_ping is null or parking_area_ping >= 0) and
    (addition_area_ping is null or addition_area_ping >= 0) and
    (management_fee is null or management_fee >= 0) and
    (cleaning_fee is null or cleaning_fee >= 0) and
    (mortgage_setting_amount is null or mortgage_setting_amount >= 0) and
    (above_ground_floors is null or above_ground_floors >= 0) and
    (basement_floors is null or basement_floors >= 0) and
    (total_units is null or total_units >= 0) and
    (elevator_count is null or elevator_count >= 0) and
    (units_per_floor is null or units_per_floor >= 0) and
    (owner_age is null or owner_age >= 0)
  );

alter table public.properties drop constraint if exists properties_management_fee_payment_check;
alter table public.properties add constraint properties_management_fee_payment_check
  check (management_fee_payment is null or management_fee_payment = any(array['月繳'::text,'雙月繳'::text,'季繳'::text,'年繳'::text,'一次繳'::text]));

alter table public.properties drop constraint if exists properties_owner_gender_check;
alter table public.properties add constraint properties_owner_gender_check
  check (owner_gender is null or owner_gender = any(array['男'::text,'女'::text]));

comment on column public.properties.building_subtype is 'Manual subtype for property_type=building: huaxia or highrise. apartment remains property_type=apartment.';
comment on column public.properties.main_building_area_ping is '大樓華廈模板：主建坪';
comment on column public.properties.auxiliary_building_area_ping is '大樓華廈模板：附建坪';
comment on column public.properties.shared_area_ping is '大樓華廈模板：公設坪';
comment on column public.properties.parking_area_ping is '大樓華廈模板：車位坪數';
comment on column public.properties.addition_area_ping is '大樓華廈模板：加建坪數';
comment on column public.properties.mortgage_setting_amount is '大樓華廈模板：設定金額，單位萬元；Phase 1 後台限定';
