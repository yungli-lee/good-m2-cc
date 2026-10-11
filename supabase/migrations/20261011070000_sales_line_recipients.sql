-- Per-user LINE delivery addresses. Accessible only through trusted server code.
create table if not exists public.sales_line_recipients (
 user_id uuid primary key references auth.users(id) on delete cascade,
 line_user_id text not null check (line_user_id ~ '^U[0-9a-fA-F]{32}$'),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.sales_line_recipients enable row level security;
revoke all on public.sales_line_recipients from public, anon, authenticated;
grant select, insert, update, delete on public.sales_line_recipients to service_role;
comment on table public.sales_line_recipients is 'LINE destination IDs, only available to trusted server operations';
