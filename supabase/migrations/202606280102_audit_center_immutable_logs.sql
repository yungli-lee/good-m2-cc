alter table public.audit_logs
  add column if not exists actor_role text,
  add column if not exists target_user_id uuid references auth.users(id),
  add column if not exists target_email text,
  add column if not exists result text not null default 'success',
  add column if not exists reason text,
  add column if not exists device text,
  add column if not exists request_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.audit_logs
  drop constraint if exists audit_logs_result_check,
  add constraint audit_logs_result_check check (result in ('success', 'denied', 'failed'));

alter type public.audit_action add value if not exists 'admin_logout';

create index if not exists audit_logs_actor_email_idx on public.audit_logs(user_email);
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_result_idx on public.audit_logs(result);

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are immutable';
end;
$$;

drop trigger if exists audit_logs_prevent_update on public.audit_logs;
create trigger audit_logs_prevent_update
before update on public.audit_logs
for each row execute function public.prevent_audit_log_mutation();

drop trigger if exists audit_logs_prevent_delete on public.audit_logs;
create trigger audit_logs_prevent_delete
before delete on public.audit_logs
for each row execute function public.prevent_audit_log_mutation();

drop policy if exists "staff insert audit logs" on public.audit_logs;
drop policy if exists "admin owner read audit logs" on public.audit_logs;
create policy "owner read audit logs" on public.audit_logs
  for select to authenticated
  using (public.is_admin_role(array['owner']));

revoke update, delete on public.audit_logs from anon, authenticated;

create or replace function public.write_audit_log(
  p_actor_user_id uuid,
  p_actor_email text,
  p_actor_role text,
  p_action public.audit_action,
  p_resource_type text,
  p_resource_id text,
  p_target_user_id uuid,
  p_target_email text,
  p_before_data jsonb,
  p_after_data jsonb,
  p_result text,
  p_reason text,
  p_ip_hash text,
  p_user_agent text,
  p_device text,
  p_request_id text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if p_result not in ('success', 'denied', 'failed') then
    raise exception 'Invalid audit result';
  end if;

  insert into public.audit_logs (
    user_id,
    user_email,
    actor_role,
    action,
    resource_type,
    resource_id,
    target_user_id,
    target_email,
    before_data,
    after_data,
    result,
    reason,
    ip_hash,
    user_agent,
    device,
    request_id,
    metadata
  )
  values (
    p_actor_user_id,
    p_actor_email,
    p_actor_role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_target_user_id,
    p_target_email,
    p_before_data,
    p_after_data,
    p_result,
    p_reason,
    p_ip_hash,
    p_user_agent,
    p_device,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke all on function public.write_audit_log(
  uuid,
  text,
  text,
  public.audit_action,
  text,
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.write_audit_log(
  uuid,
  text,
  text,
  public.audit_action,
  text,
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to service_role;
