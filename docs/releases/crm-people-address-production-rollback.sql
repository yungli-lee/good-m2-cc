-- 首選 rollback：回退應用程式並保留 nullable address 欄位與既有資料。
-- 下列 schema rollback 僅能在已備份、明確核准且 address 完全無資料時執行。
begin;

do $$
begin
  if to_regclass('public.people') is null then
    raise exception 'Required table public.people is missing';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'people'
      and column_name = 'address'
  ) and exists (
    select 1
    from public.people
    where address is not null
  ) then
    raise exception 'Rollback stopped: public.people.address contains data';
  end if;
end
$$;

alter table public.people
  drop column if exists address;

commit;

-- 本檔不修改 supabase_migrations.schema_migrations。
