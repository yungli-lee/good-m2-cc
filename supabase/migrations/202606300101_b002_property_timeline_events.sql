create table if not exists public.property_timeline_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  event_date date not null,
  event_type text not null,
  title text not null,
  content text,
  created_by uuid references auth.users(id),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_timeline_events_event_type_check check (
    event_type in (
      'created',
      'published',
      'unpublished',
      'featured',
      'unfeatured',
      'price_changed',
      'showing',
      'offer',
      'negotiation',
      'follow_up',
      'closed',
      'note'
    )
  )
);

drop trigger if exists property_timeline_events_set_updated_at on public.property_timeline_events;
create trigger property_timeline_events_set_updated_at
before update on public.property_timeline_events
for each row execute function public.set_updated_at();

create index if not exists property_timeline_events_property_date_idx
  on public.property_timeline_events(property_id, event_date desc, created_at desc);

alter table public.property_timeline_events enable row level security;

drop policy if exists "staff read property timeline" on public.property_timeline_events;
create policy "staff read property timeline" on public.property_timeline_events
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert property timeline" on public.property_timeline_events;
create policy "staff insert property timeline" on public.property_timeline_events
  for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "admin owner update property timeline" on public.property_timeline_events;
create policy "admin owner update property timeline" on public.property_timeline_events
  for update to authenticated
  using (public.is_admin_role(array['admin','owner']))
  with check (public.is_admin_role(array['admin','owner']));

drop policy if exists "admin owner delete property timeline" on public.property_timeline_events;
create policy "admin owner delete property timeline" on public.property_timeline_events
  for delete to authenticated
  using (public.is_admin_role(array['admin','owner']));

grant select, insert, update, delete on table public.property_timeline_events to authenticated;
revoke all on table public.property_timeline_events from anon;
