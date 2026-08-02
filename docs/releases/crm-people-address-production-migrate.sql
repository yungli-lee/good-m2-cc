-- Production CRM People address additive migration。
-- 執行前必須完成 backup 與 crm-people-address-production-precheck.sql。
-- 本檔不寫入 supabase_migrations.schema_migrations。
begin;

do $$
begin
  if to_regclass('public.people') is null then
    raise exception 'Required table public.people is missing';
  end if;
end
$$;

alter table public.people
  add column if not exists address text;

comment on column public.people.address is
  '客戶聯絡地址；CRM 後台可維護，非公開物件地址';

do $$
declare
  address_type text;
  address_nullable text;
begin
  select data_type, is_nullable
    into address_type, address_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'people'
    and column_name = 'address';

  if address_type is distinct from 'text' then
    raise exception 'Unexpected public.people.address type: %', address_type;
  end if;
  if address_nullable is distinct from 'YES' then
    raise exception 'public.people.address must remain nullable';
  end if;
end
$$;

commit;
