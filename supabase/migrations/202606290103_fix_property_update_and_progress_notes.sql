alter table public.properties
  add column if not exists progress_notes text;

grant update on table public.properties to authenticated;

alter table public.properties
  drop constraint if exists properties_listing_type_check,
  add constraint properties_listing_type_check
  check (listing_type is null or listing_type in ('專任', '一般委託', '口頭'));
