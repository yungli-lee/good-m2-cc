begin;

create table if not exists public.crm_customer_requirements (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  title text not null,
  requirement_type text not null,
  transaction_type text not null,
  status text not null default 'active',
  urgency text,
  property_categories text[] not null default '{}',
  cities text[], districts text[], area_note text, school_districts text[], commute_notes text,
  sale_budget_min numeric, sale_budget_max numeric, rent_budget_min numeric, rent_budget_max numeric,
  price_per_ping_min numeric, price_per_ping_max numeric,
  land_area_min numeric, land_area_max numeric, building_area_min numeric, building_area_max numeric,
  frontage_min numeric, depth_min numeric, road_width_min numeric, building_height_min numeric, clear_height_min numeric,
  bedrooms_min integer, bedrooms_max integer, living_rooms_min integer, bathrooms_min integer,
  building_age_max numeric, floor_min integer, floor_max integer,
  elevator_required boolean, parking_required boolean, ground_floor_required boolean, accessible_required boolean,
  zoning_types text[], property_uses text[], orientation_preferences text[],
  needs_corner_lot boolean, needs_main_road boolean, needs_water boolean, needs_electricity boolean, needs_legal_farmhouse boolean,
  power_capacity_min numeric, needs_three_phase_power boolean, needs_fire_compliance boolean,
  needs_factory_registration boolean, needs_smoke_exhaust boolean, needs_office boolean,
  needs_staff_housing boolean, needs_large_vehicle_access boolean, crane_required boolean, crane_capacity_min numeric,
  must_have text[], nice_to_have text[], unacceptable text[],
  household_notes text, occupation_notes text, funding_status text, cash_available numeric,
  loan_amount_expected numeric, financing_status text, purchase_timeline text, move_in_date date, notes text,
  assigned_user_id uuid references auth.users(id), created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), last_matched_at timestamptz,
  constraint crm_req_title_check check (length(btrim(title)) > 0),
  constraint crm_req_type_check check (requirement_type in ('residential','townhouse','storefront','office','factory','warehouse','building_land','industrial_land','farmland','investment','rental','other')),
  constraint crm_req_transaction_check check (transaction_type in ('buy','rent')),
  constraint crm_req_status_check check (status in ('active','paused','fulfilled','archived')),
  constraint crm_req_urgency_check check (urgency is null or urgency in ('high','normal','low')),
  constraint crm_req_funding_check check (funding_status is null or funding_status in ('cash','loan','cash_and_loan','asset_sale','undecided')),
  constraint crm_req_timeline_check check (purchase_timeline is null or purchase_timeline in ('immediate','within_1_month','within_3_months','within_6_months','within_1_year','undecided')),
  constraint crm_req_categories_check check (cardinality(property_categories) > 0),
  constraint crm_req_area_check check (coalesce(cardinality(cities),0) > 0 or coalesce(cardinality(districts),0) > 0 or length(btrim(coalesce(area_note,''))) > 0),
  constraint crm_req_budget_by_transaction_check check ((transaction_type='buy' and sale_budget_max is not null and rent_budget_min is null and rent_budget_max is null) or (transaction_type='rent' and rent_budget_max is not null and sale_budget_min is null and sale_budget_max is null)),
  constraint crm_req_nonnegative_check check (least(
    coalesce(sale_budget_min,0),coalesce(sale_budget_max,0),coalesce(rent_budget_min,0),coalesce(rent_budget_max,0),
    coalesce(price_per_ping_min,0),coalesce(price_per_ping_max,0),coalesce(land_area_min,0),coalesce(land_area_max,0),
    coalesce(building_area_min,0),coalesce(building_area_max,0),coalesce(frontage_min,0),coalesce(depth_min,0),
    coalesce(road_width_min,0),coalesce(building_height_min,0),coalesce(clear_height_min,0),coalesce(bedrooms_min,0),
    coalesce(bedrooms_max,0),coalesce(living_rooms_min,0),coalesce(bathrooms_min,0),coalesce(building_age_max,0),
    coalesce(floor_min,0),coalesce(floor_max,0),coalesce(power_capacity_min,0),coalesce(crane_capacity_min,0),
    coalesce(cash_available,0),coalesce(loan_amount_expected,0)) >= 0),
  constraint crm_req_ranges_check check (
    (sale_budget_min is null or sale_budget_max is null or sale_budget_min <= sale_budget_max) and
    (rent_budget_min is null or rent_budget_max is null or rent_budget_min <= rent_budget_max) and
    (price_per_ping_min is null or price_per_ping_max is null or price_per_ping_min <= price_per_ping_max) and
    (land_area_min is null or land_area_max is null or land_area_min <= land_area_max) and
    (building_area_min is null or building_area_max is null or building_area_min <= building_area_max) and
    (bedrooms_min is null or bedrooms_max is null or bedrooms_min <= bedrooms_max) and
    (floor_min is null or floor_max is null or floor_min <= floor_max)
  )
);

comment on column public.crm_customer_requirements.sale_budget_min is 'Minimum sale budget in TWD';
comment on column public.crm_customer_requirements.sale_budget_max is 'Maximum sale budget in TWD';
comment on column public.crm_customer_requirements.rent_budget_min is 'Minimum monthly rent in TWD';
comment on column public.crm_customer_requirements.rent_budget_max is 'Maximum monthly rent in TWD';
comment on column public.crm_customer_requirements.price_per_ping_min is 'Minimum unit price in TWD per ping';
comment on column public.crm_customer_requirements.price_per_ping_max is 'Maximum unit price in TWD per ping';
comment on column public.crm_customer_requirements.cash_available is 'Available cash in TWD';
comment on column public.crm_customer_requirements.loan_amount_expected is 'Expected loan amount in TWD';
comment on column public.crm_customer_requirements.land_area_min is 'Minimum land area in ping';
comment on column public.crm_customer_requirements.land_area_max is 'Maximum land area in ping';
comment on column public.crm_customer_requirements.building_area_min is 'Minimum building area in ping';
comment on column public.crm_customer_requirements.building_area_max is 'Maximum building area in ping';
comment on column public.crm_customer_requirements.frontage_min is 'Minimum frontage in meters';
comment on column public.crm_customer_requirements.depth_min is 'Minimum depth in meters';
comment on column public.crm_customer_requirements.road_width_min is 'Minimum road width in meters';

create index if not exists crm_req_person_idx on public.crm_customer_requirements(person_id);
create index if not exists crm_req_status_idx on public.crm_customer_requirements(status);
create index if not exists crm_req_type_idx on public.crm_customer_requirements(requirement_type);
create index if not exists crm_req_transaction_idx on public.crm_customer_requirements(transaction_type);
create index if not exists crm_req_urgency_idx on public.crm_customer_requirements(urgency);
create index if not exists crm_req_assignee_idx on public.crm_customer_requirements(assigned_user_id);
create index if not exists crm_req_created_idx on public.crm_customer_requirements(created_at desc);
create index if not exists crm_req_updated_idx on public.crm_customer_requirements(updated_at desc);
create index if not exists crm_req_categories_gin on public.crm_customer_requirements using gin(property_categories);
create index if not exists crm_req_cities_gin on public.crm_customer_requirements using gin(cities);
create index if not exists crm_req_districts_gin on public.crm_customer_requirements using gin(districts);

drop trigger if exists crm_customer_requirements_set_updated_at on public.crm_customer_requirements;
create trigger crm_customer_requirements_set_updated_at before update on public.crm_customer_requirements
for each row execute function public.set_updated_at();

alter table public.crm_customer_requirements enable row level security;
drop policy if exists "scoped read customer requirements" on public.crm_customer_requirements;
drop policy if exists "scoped insert customer requirements" on public.crm_customer_requirements;
drop policy if exists "scoped update customer requirements" on public.crm_customer_requirements;
drop policy if exists "admin owner delete customer requirements" on public.crm_customer_requirements;
create policy "scoped read customer requirements" on public.crm_customer_requirements for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id));
create policy "scoped insert customer requirements" on public.crm_customer_requirements for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id) and created_by=auth.uid() and updated_by=auth.uid()
    and (assigned_user_id is null or assigned_user_id=auth.uid() or public.is_admin_role(array['admin','owner'])));
create policy "scoped update customer requirements" on public.crm_customer_requirements for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id))
  with check (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id) and updated_by=auth.uid()
    and (assigned_user_id is null or assigned_user_id=auth.uid() or public.is_admin_role(array['admin','owner'])));
create policy "admin owner delete customer requirements" on public.crm_customer_requirements for delete to authenticated
  using (public.is_admin_role(array['admin','owner']) and public.can_access_person(person_id));
revoke all on public.crm_customer_requirements from anon, authenticated;
grant select, insert, update on public.crm_customer_requirements to authenticated;
grant delete on public.crm_customer_requirements to authenticated;

alter table public.people_activities add column if not exists requirement_id uuid references public.crm_customer_requirements(id) on delete set null;
alter table public.people_activities drop constraint if exists people_activities_type_check;
alter table public.people_activities add constraint people_activities_type_check check (activity_type in
  ('visit','phone','line','sms','email','initial_contact','requirement_discussion','other','requirement_created','requirement_updated',
   'requirement_paused','requirement_resumed','requirement_closed','requirement_archived','requirement_deleted','requirement_duplicated'));
create index if not exists people_activities_requirement_idx on public.people_activities(requirement_id, created_at desc);
drop policy if exists "staff read people activities" on public.people_activities;
drop policy if exists "authenticated read people activities" on public.people_activities;
drop policy if exists "scoped read people activities" on public.people_activities;
drop policy if exists "staff insert people activities" on public.people_activities;
drop policy if exists "scoped insert people activities" on public.people_activities;
drop policy if exists "staff update people activities" on public.people_activities;
drop policy if exists "scoped update people activities" on public.people_activities;
create policy "scoped read people activities" on public.people_activities for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id));
create policy "scoped insert people activities" on public.people_activities for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id) and created_by=auth.uid());
create policy "scoped update people activities" on public.people_activities for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id))
  with check (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id));

alter type public.audit_action add value if not exists 'requirement_created';
alter type public.audit_action add value if not exists 'requirement_updated';
alter type public.audit_action add value if not exists 'requirement_status_changed';
alter type public.audit_action add value if not exists 'requirement_duplicated';
alter type public.audit_action add value if not exists 'requirement_deleted';

commit;
