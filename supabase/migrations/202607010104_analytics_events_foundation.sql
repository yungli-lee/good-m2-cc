create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  entity_type text,
  entity_id uuid,
  page_path text,
  search_query text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  browser text,
  ip_hash text,
  user_agent_hash text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_name_check check (
    event_name in (
      'property_view',
      'property_search',
      'knowledge_view',
      'line_click',
      'phone_click',
      'inquiry_submit',
      'featured_property_click',
      'share_click',
      'media_view',
      'admin_login'
    )
  ),
  constraint analytics_events_search_query_length_check check (
    search_query is null or char_length(search_query) <= 300
  ),
  constraint analytics_events_page_path_length_check check (
    page_path is null or char_length(page_path) <= 500
  ),
  constraint analytics_events_referrer_length_check check (
    referrer is null or char_length(referrer) <= 500
  ),
  constraint analytics_events_session_id_length_check check (
    session_id is null or char_length(session_id) <= 120
  )
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events(created_at desc);

create index if not exists analytics_events_event_created_idx
  on public.analytics_events(event_name, created_at desc);

create index if not exists analytics_events_entity_created_idx
  on public.analytics_events(entity_type, entity_id, created_at desc);

create index if not exists analytics_events_session_created_idx
  on public.analytics_events(session_id, created_at desc);

create index if not exists analytics_events_search_query_idx
  on public.analytics_events(search_query)
  where search_query is not null;

alter table public.analytics_events enable row level security;

drop policy if exists "admin owner read analytics events" on public.analytics_events;
create policy "admin owner read analytics events" on public.analytics_events
  for select to authenticated
  using (public.is_admin_role(array['admin','owner']));

drop policy if exists "service role manage analytics events" on public.analytics_events;
create policy "service role manage analytics events" on public.analytics_events
  for all to service_role
  using (true)
  with check (true);

revoke all on table public.analytics_events from anon;
revoke all on table public.analytics_events from authenticated;
grant select on table public.analytics_events to authenticated;
grant select, insert, update, delete on table public.analytics_events to service_role;
