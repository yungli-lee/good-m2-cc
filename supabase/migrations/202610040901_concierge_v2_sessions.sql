create table if not exists public.concierge_sessions (
  session_id uuid primary key,
  state jsonb not null default '{}'::jsonb,
  turn_count integer not null default 0 check (turn_count >= 0),
  last_intent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists concierge_sessions_expires_at_idx on public.concierge_sessions(expires_at);

alter table public.concierge_sessions enable row level security;

revoke all on public.concierge_sessions from anon, authenticated;
grant all on public.concierge_sessions to service_role;
