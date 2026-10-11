-- Phase 1: internal sales follow-up tasks; deploy to Preview and verify RLS before production.
create table if not exists public.sales_follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  person_id uuid references public.people(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  task_type text not null default 'follow_up' check (task_type in ('follow_up','showing','owner_report','matching','other')),
  showing_status text check (showing_status in ('requested','pending_confirmation','confirmed','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  due_at timestamptz not null,
  notes text check (length(notes) <= 2000),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint task_has_relation check (person_id is not null or property_id is not null),
  constraint showing_only_for_showing check (showing_status is null or task_type='showing')
);
create index if not exists sales_tasks_open_due_idx on public.sales_follow_up_tasks(status,due_at);
create index if not exists sales_tasks_person_idx on public.sales_follow_up_tasks(person_id);
create index if not exists sales_tasks_property_idx on public.sales_follow_up_tasks(property_id);
alter table public.sales_follow_up_tasks enable row level security;
revoke all on public.sales_follow_up_tasks from anon;
grant select,insert,update on public.sales_follow_up_tasks to authenticated;
-- Scope to active CRM operators, never the public site.
drop policy if exists sales_tasks_read on public.sales_follow_up_tasks;
create policy sales_tasks_read on public.sales_follow_up_tasks for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin','owner') and p.deleted_at is null));
drop policy if exists sales_tasks_insert on public.sales_follow_up_tasks;
create policy sales_tasks_insert on public.sales_follow_up_tasks for insert to authenticated
with check (created_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin','owner') and p.deleted_at is null));
drop policy if exists sales_tasks_update on public.sales_follow_up_tasks;
create policy sales_tasks_update on public.sales_follow_up_tasks for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin','owner') and p.deleted_at is null))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin','owner') and p.deleted_at is null));
