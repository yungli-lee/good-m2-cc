create table if not exists public.sales_line_bindings (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists sales_line_bindings_target_idx on public.sales_line_bindings(target_user_id,created_at desc);
alter table public.sales_line_bindings enable row level security;
revoke all on public.sales_line_bindings from public,anon,authenticated;
grant select,insert,update,delete on public.sales_line_bindings to service_role;
create or replace function public.consume_sales_line_binding(p_token_hash text,p_line_user_id text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_target uuid;
begin
 if p_line_user_id !~ '^U[0-9a-fA-F]{32}$' then return null; end if;
 update public.sales_line_bindings b
 set consumed_at=now()
 where b.id=(
   select x.id from public.sales_line_bindings x
   where x.token_hash=p_token_hash and x.consumed_at is null and x.expires_at>now()
   order by x.created_at desc limit 1 for update skip locked
 )
 returning b.target_user_id into v_target;
 if v_target is null then return null; end if;
 insert into public.sales_line_recipients(user_id,line_user_id,updated_at)
 values(v_target,p_line_user_id,now())
 on conflict(user_id) do update set line_user_id=excluded.line_user_id,updated_at=now();
 return v_target;
end $$;
revoke all on function public.consume_sales_line_binding(text,text) from public,anon,authenticated;
grant execute on function public.consume_sales_line_binding(text,text) to service_role;