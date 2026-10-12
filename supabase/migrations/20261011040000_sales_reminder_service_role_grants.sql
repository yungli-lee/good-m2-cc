-- Allow only server-side service_role to claim reminders.
grant select, update on table public.sales_follow_up_tasks to service_role;
