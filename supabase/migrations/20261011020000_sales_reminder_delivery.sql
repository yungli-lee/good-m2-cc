-- Claim each reminder atomically. The follow-up due_at is the sole reminder trigger.
alter table public.sales_follow_up_tasks
 add column if not exists line_reminder_sent_for timestamptz,
 add column if not exists line_reminder_claimed_for timestamptz,
 add column if not exists line_reminder_claimed_at timestamptz,
 add column if not exists line_reminder_attempts integer not null default 0,
 add column if not exists line_reminder_last_error text;

create index if not exists sales_reminder_due_idx
 on public.sales_follow_up_tasks(due_at)
 where status='open';

-- This RPC is not granted to API roles; the server invokes it through a service-role client.
create or replace function public.claim_due_sales_reminders(p_limit integer default 20)
returns table(id uuid, title text, due_at timestamptz, showing_at timestamptz, person_id uuid, property_id uuid, notes text)
language sql security invoker set search_path = public
as $$
 with candidates as (
  select t.id from public.sales_follow_up_tasks t
  where t.status='open' and t.due_at <= now()
    and t.line_reminder_sent_for is distinct from t.due_at
    and (t.line_reminder_claimed_for is distinct from t.due_at
         or t.line_reminder_claimed_at < now() - interval '10 minutes')
    and t.line_reminder_attempts < 3
  order by t.due_at asc
  limit greatest(1,least(p_limit,20)) for update skip locked
 ), claimed as (
  update public.sales_follow_up_tasks t
  set line_reminder_claimed_for=t.due_at,
      line_reminder_claimed_at=now(),
      line_reminder_attempts=t.line_reminder_attempts+1
  from candidates c where t.id=c.id
  returning t.id,t.title,t.due_at,t.showing_at,t.person_id,t.property_id,t.notes
 )
 select * from claimed;
$$;
revoke all on function public.claim_due_sales_reminders(integer) from public,anon,authenticated;
grant execute on function public.claim_due_sales_reminders(integer) to service_role;
