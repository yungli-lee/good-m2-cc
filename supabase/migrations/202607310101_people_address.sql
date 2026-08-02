-- Additive migration; execute manually only after Production schema precheck.
alter table public.people
  add column if not exists address text;

comment on column public.people.address is '客戶聯絡地址；CRM 後台可維護，非公開物件地址';
