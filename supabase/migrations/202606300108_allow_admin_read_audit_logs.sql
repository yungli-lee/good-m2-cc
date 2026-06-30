drop policy if exists "owner read audit logs" on public.audit_logs;
drop policy if exists "admin owner read audit logs" on public.audit_logs;

create policy "admin owner read audit logs" on public.audit_logs
  for select to authenticated
  using (public.is_admin_role(array['admin','owner']));
