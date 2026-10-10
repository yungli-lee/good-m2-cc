-- Explicitly consented conversation archive. No public access; backend service role only.
create table if not exists public.concierge_consented_sessions (
  id uuid primary key default gen_random_uuid(),
  proof_hash text not null,
  consent_version text not null,
  consented_at timestamptz not null default now(),
  source_path text not null default '/guide',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);
create table if not exists public.concierge_consented_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.concierge_consented_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null check(role in ('user','assistant')),
  message text not null check(char_length(message) between 1 and 1200),
  property_slug text,
  preference text not null default 'unspecified' check(preference in ('interested','not_interested','unspecified')),
  needs jsonb not null default '{}'::jsonb
);
create index if not exists concierge_messages_session_created on public.concierge_consented_messages (session_id,created_at);
create index if not exists concierge_sessions_expiration on public.concierge_consented_sessions (expires_at);
alter table public.concierge_consented_sessions enable row level security;
alter table public.concierge_consented_messages enable row level security;
-- No grants or RLS policies for anon/authenticated: service-role route handles writes and verification.
