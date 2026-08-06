begin;

-- Phase 1 extends the existing ledger in place. Existing rows are retained and
-- are deliberately classified as legacy_unknown so they cannot enter either
-- Preview or Production reports by accident.
alter table public.analytics_events
  add column if not exists event_id uuid,
  add column if not exists event_version smallint,
  add column if not exists occurred_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists visitor_id uuid,
  add column if not exists person_id uuid,
  add column if not exists inquiry_id uuid,
  add column if not exists requirement_id uuid,
  add column if not exists property_id uuid,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists device_class text,
  add column if not exists source_system text,
  add column if not exists environment text,
  add column if not exists is_bot boolean,
  add column if not exists is_internal boolean,
  add column if not exists event_properties jsonb;

update public.analytics_events
set
  event_id = coalesce(event_id, gen_random_uuid()),
  event_version = coalesce(event_version, 1),
  occurred_at = coalesce(occurred_at, created_at),
  received_at = coalesce(received_at, created_at),
  device_class = coalesce(device_class, device_type, 'unknown'),
  source_system = coalesce(source_system, 'legacy_server'),
  environment = coalesce(environment, 'legacy_unknown'),
  is_bot = coalesce(is_bot, device_type = 'bot'),
  is_internal = coalesce(is_internal, false),
  event_properties = coalesce(event_properties, metadata, '{}'::jsonb)
where event_id is null
   or event_version is null
   or occurred_at is null
   or received_at is null
   or device_class is null
   or source_system is null
   or environment is null
   or is_bot is null
   or is_internal is null
   or event_properties is null;

alter table public.analytics_events
  alter column event_id set default gen_random_uuid(),
  alter column event_id set not null,
  alter column event_version set default 1,
  alter column event_version set not null,
  alter column occurred_at set default now(),
  alter column occurred_at set not null,
  alter column received_at set default now(),
  alter column received_at set not null,
  alter column source_system set not null,
  alter column environment set not null,
  alter column is_bot set default false,
  alter column is_bot set not null,
  alter column is_internal set default false,
  alter column is_internal set not null,
  alter column event_properties set default '{}'::jsonb,
  alter column event_properties set not null;

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check check (
    event_name in (
      -- Existing names retained for compatibility during the producer rollout.
      'property_view', 'property_search', 'knowledge_view', 'line_click',
      'phone_click', 'inquiry_submit', 'featured_property_click', 'share_click',
      'media_view', 'admin_login', 'person_created',
      -- Phase 1 versioned taxonomy.
      'page_view', 'view_property', 'view_property_media', 'view_knowledge',
      'search_property', 'filter_property', 'open_map', 'share_property',
      'use_calculator', 'click_line', 'click_phone', 'start_inquiry',
      'submit_inquiry', 'inquiry_created'
    )
  ) not valid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_event_id_key' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_event_id_key unique (event_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_event_version_check' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_event_version_check check (event_version = 1) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_source_system_check' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_source_system_check check (
      source_system in ('web_client','public_api','crm_server','system_job','legacy_server')
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_environment_check' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_environment_check check (
      environment in ('preview','production','development','test','legacy_unknown')
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_device_class_check' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_device_class_check check (
      device_class is null or device_class in ('desktop','mobile','tablet','bot','unknown')
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_properties_object_check' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_properties_object_check check (
      jsonb_typeof(event_properties) = 'object'
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_sensitive_keys_check' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_sensitive_keys_check check (
      not (event_properties ?| array['name','phone','email','message','password','token','cookie','dom','html','form_data'])
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_person_id_fkey' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_person_id_fkey foreign key (person_id) references public.people(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_inquiry_id_fkey' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_inquiry_id_fkey foreign key (inquiry_id) references public.inquiries(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_requirement_id_fkey' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_requirement_id_fkey foreign key (requirement_id) references public.crm_customer_requirements(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_property_id_fkey' and conrelid = 'public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_property_id_fkey foreign key (property_id) references public.properties(id) on delete set null not valid;
  end if;
end $$;

create index if not exists analytics_events_environment_occurred_idx
  on public.analytics_events(environment, occurred_at desc);
create index if not exists analytics_events_environment_name_occurred_idx
  on public.analytics_events(environment, event_name, occurred_at desc);
create index if not exists analytics_events_visitor_occurred_idx
  on public.analytics_events(visitor_id, occurred_at asc)
  where visitor_id is not null and not is_bot and not is_internal;
create index if not exists analytics_events_session_occurred_idx
  on public.analytics_events(session_id, occurred_at asc)
  where session_id is not null and not is_bot and not is_internal;
create index if not exists analytics_events_inquiry_idx
  on public.analytics_events(inquiry_id, occurred_at desc) where inquiry_id is not null;
create index if not exists analytics_events_property_idx
  on public.analytics_events(property_id, occurred_at desc) where property_id is not null;

create table if not exists public.lead_attributions (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete restrict,
  person_id uuid references public.people(id) on delete set null,
  visitor_id uuid not null,
  session_id uuid not null,
  property_id uuid references public.properties(id) on delete set null,
  first_touch_event_id uuid references public.analytics_events(id) on delete set null,
  lead_touch_event_id uuid references public.analytics_events(id) on delete set null,
  last_non_direct_event_id uuid references public.analytics_events(id) on delete set null,
  first_source text not null,
  first_medium text,
  first_campaign text,
  lead_source text not null,
  lead_medium text,
  lead_campaign text,
  last_source text,
  last_medium text,
  last_campaign text,
  first_seen_at timestamptz not null,
  inquiry_at timestamptz not null,
  attribution_status text not null default 'complete',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_attributions_inquiry_key unique (inquiry_id),
  constraint lead_attributions_status_check check (attribution_status in ('complete','partial','missing')),
  constraint lead_attributions_time_check check (first_seen_at <= inquiry_at),
  constraint lead_attributions_source_length_check check (
    char_length(first_source) <= 120 and char_length(lead_source) <= 120 and
    (last_source is null or char_length(last_source) <= 120)
  )
);

create index if not exists lead_attributions_person_idx
  on public.lead_attributions(person_id) where person_id is not null;
create index if not exists lead_attributions_property_idx
  on public.lead_attributions(property_id) where property_id is not null;
create index if not exists lead_attributions_visitor_idx
  on public.lead_attributions(visitor_id, inquiry_at desc);
create index if not exists lead_attributions_session_idx
  on public.lead_attributions(session_id, inquiry_at desc);
create index if not exists lead_attributions_inquiry_at_idx
  on public.lead_attributions(inquiry_at desc);

create or replace function public.enforce_lead_attribution_snapshot_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (to_jsonb(new) - array['person_id','attribution_status','updated_at'])
     is distinct from
     (to_jsonb(old) - array['person_id','attribution_status','updated_at']) then
    raise exception 'lead attribution snapshot fields are immutable';
  end if;
  if old.person_id is not null and new.person_id is distinct from old.person_id then
    raise exception 'lead attribution person linkage cannot be replaced';
  end if;
  return new;
end;
$$;

drop trigger if exists lead_attributions_enforce_snapshot_immutable on public.lead_attributions;
create trigger lead_attributions_enforce_snapshot_immutable
before update on public.lead_attributions
for each row execute function public.enforce_lead_attribution_snapshot_immutable();

drop trigger if exists lead_attributions_set_updated_at on public.lead_attributions;
create trigger lead_attributions_set_updated_at before update on public.lead_attributions
for each row execute function public.set_updated_at();

alter table public.inquiries
  add column if not exists visitor_id uuid,
  add column if not exists session_id uuid,
  add column if not exists attribution_status text;

update public.inquiries
set attribution_status = 'missing'
where attribution_status is null;

alter table public.inquiries
  alter column attribution_status set default 'missing',
  alter column attribution_status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inquiries_attribution_status_check' and conrelid = 'public.inquiries'::regclass) then
    alter table public.inquiries add constraint inquiries_attribution_status_check check (
      attribution_status in ('pending','complete','partial','missing','failed')
    ) not valid;
  end if;
end $$;

create index if not exists inquiries_attribution_status_idx
  on public.inquiries(attribution_status, created_at desc)
  where deleted_at is null and attribution_status <> 'complete';
create index if not exists inquiries_visitor_session_idx
  on public.inquiries(visitor_id, session_id, created_at desc)
  where visitor_id is not null and session_id is not null;

alter table public.lead_attributions enable row level security;
alter table public.lead_attributions force row level security;

drop policy if exists "admin owner read lead attributions" on public.lead_attributions;
create policy "admin owner read lead attributions" on public.lead_attributions
  for select to authenticated
  using (public.is_admin_role(array['admin','owner']));

drop policy if exists "service role manage lead attributions" on public.lead_attributions;
create policy "service role manage lead attributions" on public.lead_attributions
  for all to service_role using (true) with check (true);

revoke all on table public.lead_attributions from anon, authenticated;
grant select on table public.lead_attributions to authenticated;
grant select, insert, update, delete on table public.lead_attributions to service_role;

-- Keep the existing analytics ledger fail-closed. Public ingestion uses a
-- server-held service role key; the browser never receives database secrets.
alter table public.analytics_events enable row level security;
alter table public.analytics_events force row level security;
revoke all on table public.analytics_events from anon, authenticated;
grant select on table public.analytics_events to authenticated;
grant select, insert, update, delete on table public.analytics_events to service_role;

comment on column public.analytics_events.event_id is 'Producer-generated idempotency UUID; globally unique across retries.';
comment on column public.analytics_events.environment is 'Explicit runtime isolation: preview, production, development, test, or legacy_unknown.';
comment on column public.analytics_events.event_properties is 'Event-specific allowlisted properties only; no form values, arbitrary DOM, tokens, or cookies.';
comment on table public.lead_attributions is 'Immutable acquisition snapshot created after a successful inquiry; person_id may be linked later.';
comment on column public.inquiries.attribution_status is 'Operational attribution state; inquiry success never depends on analytics success.';

commit;
