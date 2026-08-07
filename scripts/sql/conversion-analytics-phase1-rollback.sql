-- Preview-only destructive rollback. Never run in Production without a separate
-- data-retention review. Roll-forward is preferred after producers start.
begin;

do $$
begin
  if exists (select 1 from public.lead_attributions) then
    raise exception 'Rollback refused: lead attribution rows exist. Preserve attribution history and use a reviewed roll-forward instead.';
  end if;

  if exists (
    select 1 from public.analytics_events
    where event_name in (
      'page_view','view_property','view_property_media','view_knowledge',
      'search_property','filter_property','open_map','share_property',
      'use_calculator','click_line','click_phone','start_inquiry',
      'submit_inquiry','inquiry_created'
    )
  ) then
    raise exception 'Rollback refused: Phase 1 events exist. Use a reviewed roll-forward instead.';
  end if;
end $$;

drop table if exists public.lead_attributions;
drop function if exists public.enforce_lead_attribution_snapshot_immutable();

-- Restore the analytics ledger's pre-Phase-1 RLS mode. Existing policies and
-- table grants remain intact; rate-limit grants require environment-specific
-- review because the migration cannot know whether they predated Phase 1.
alter table public.analytics_events no force row level security;

drop index if exists public.inquiries_attribution_status_idx;
drop index if exists public.inquiries_visitor_session_idx;
alter table public.inquiries
  drop constraint if exists inquiries_attribution_status_check,
  drop column if exists attribution_status,
  drop column if exists session_id,
  drop column if exists visitor_id;

drop index if exists public.analytics_events_environment_occurred_idx;
drop index if exists public.analytics_events_environment_name_occurred_idx;
drop index if exists public.analytics_events_visitor_occurred_idx;
drop index if exists public.analytics_events_session_occurred_idx;
drop index if exists public.analytics_events_inquiry_idx;
drop index if exists public.analytics_events_property_idx;

alter table public.analytics_events
  drop constraint if exists analytics_events_event_id_key,
  drop constraint if exists analytics_events_event_version_check,
  drop constraint if exists analytics_events_source_system_check,
  drop constraint if exists analytics_events_environment_check,
  drop constraint if exists analytics_events_device_class_check,
  drop constraint if exists analytics_events_properties_object_check,
  drop constraint if exists analytics_events_sensitive_keys_check,
  drop constraint if exists analytics_events_person_id_fkey,
  drop constraint if exists analytics_events_inquiry_id_fkey,
  drop constraint if exists analytics_events_requirement_id_fkey,
  drop constraint if exists analytics_events_property_id_fkey,
  drop column if exists event_id,
  drop column if exists event_version,
  drop column if exists occurred_at,
  drop column if exists received_at,
  drop column if exists visitor_id,
  drop column if exists person_id,
  drop column if exists inquiry_id,
  drop column if exists requirement_id,
  drop column if exists property_id,
  drop column if exists utm_content,
  drop column if exists utm_term,
  drop column if exists device_class,
  drop column if exists source_system,
  drop column if exists environment,
  drop column if exists is_bot,
  drop column if exists is_internal,
  drop column if exists event_properties;

do $$
declare
  session_udt text;
begin
  select c.udt_name into session_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'analytics_events'
    and c.column_name = 'session_id';

  if session_udt = 'uuid' then
    alter table public.analytics_events
      alter column session_id type text
      using session_id::text;
  elsif session_udt is distinct from 'text' then
    raise exception 'analytics_events.session_id has unsupported rollback type: %', session_udt;
  end if;
end $$;

alter table public.analytics_events
  drop constraint if exists analytics_events_session_id_length_check;
alter table public.analytics_events
  add constraint analytics_events_session_id_length_check check (
    session_id is null or char_length(session_id) <= 120
  );

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;
alter table public.analytics_events
  add constraint analytics_events_event_name_check check (
    event_name in (
      'property_view','property_search','knowledge_view','line_click',
      'phone_click','inquiry_submit','featured_property_click','share_click',
      'media_view','admin_login','person_created'
    )
  );

commit;
