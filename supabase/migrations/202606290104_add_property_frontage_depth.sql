alter table public.properties
  add column if not exists frontage text,
  add column if not exists depth text;
