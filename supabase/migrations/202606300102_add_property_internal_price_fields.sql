alter table public.properties
  add column if not exists service_fee_rate text,
  add column if not exists floor_price text;
