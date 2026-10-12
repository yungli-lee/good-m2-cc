-- Least-privilege sales task access. Editors only see and mutate assigned tasks.
-- Owners/admins may manage all records; viewers and anonymous visitors have no access.
drop policy if exists sales_tasks_read on public.sales_follow_up_tasks;
create policy sales_tasks_read on public.sales_follow_up_tasks for select to authenticated
using (
 exists (
  select 1 from public.profiles p
  where p.id=auth.uid() and p.deleted_at is null
    and (p.role in ('owner','admin') or (p.role='editor' and assigned_to=auth.uid()))
 )
);
drop policy if exists sales_tasks_insert on public.sales_follow_up_tasks;
create policy sales_tasks_insert on public.sales_follow_up_tasks for insert to authenticated
with check (
 created_by=auth.uid()
 and exists (
  select 1 from public.profiles p where p.id=auth.uid() and p.deleted_at is null
   and (p.role in ('owner','admin') or (p.role='editor' and assigned_to=auth.uid()))
 )
);
drop policy if exists sales_tasks_update on public.sales_follow_up_tasks;
create policy sales_tasks_update on public.sales_follow_up_tasks for update to authenticated
using (
 exists (select 1 from public.profiles p where p.id=auth.uid() and p.deleted_at is null
  and (p.role in ('owner','admin') or (p.role='editor' and assigned_to=auth.uid())))
)
with check (
 exists (select 1 from public.profiles p where p.id=auth.uid() and p.deleted_at is null
  and (p.role in ('owner','admin') or (p.role='editor' and assigned_to=auth.uid())))
);
