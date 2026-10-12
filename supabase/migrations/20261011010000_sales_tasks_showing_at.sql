alter table public.sales_follow_up_tasks add column if not exists showing_at timestamptz;
comment on column public.sales_follow_up_tasks.due_at is 'Next follow-up/check time, not a push notification';
comment on column public.sales_follow_up_tasks.showing_at is 'Proposed/confirmed showing appointment independent of follow-up time';
