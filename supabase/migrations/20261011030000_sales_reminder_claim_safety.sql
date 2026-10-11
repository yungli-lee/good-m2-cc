-- Prevent historical tasks from being claimed and avoid exhausting retries for a rescheduled due_at.
create or replace function public.claim_due_sales_reminders(p_limit integer default 20, p_not_before timestamptz default null)
returns table(id uuid, title text, due_at timestamptz, showing_at timestamptz, person_id uuid, property_id uuid, notes text)
language sql security invoker set search_path = public
as $$
 with candidates as (
  select t.id from public.sales_follow_up_tasks t
  where t.status='open' and t.due_at <= now()
    and p_not_before is not null and t.due_at >= p_not_before
    and t.line_reminder_sent_for is distinct from t.due_at
    and (t.line_reminder_claimed_for is distinct from t.due_at
         or t.line_reminder_claimed_at < now() - interval '10 minutes')
    and (case when t.line_reminder_claimed_for is distinct from t.due_at then 0 else t.line_reminder_attempts end) < 3
  order by t.due_at asc
  limit greatest(1,least(p_limit,20)) for update skip locked
 ), claimed as (
  update public.sales_follow_up_tasks t
  set line_reminder_attempts=case when t.line_reminder_claimed_for is distinct from t.due_at then 1 else t.line_reminder_attempts+1 end,
      line_reminder_claimed_for=t.due_at,
      line_reminder_claimed_at=now()
  from candidates c where t.id=c.id
  returning t.id,t.title,t.due_at,t.showing_at,t.person_id,t.property_id,t.notes
 )
 select * from claimed;
$$;
revoke all on function public.claim_due_sales_reminders(integer,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_due_sales_reminders(integer,timestamptz) to service_role;
drop function if exists public.claim_due_sales_reminders(integer);
