alter table public.properties
  add column if not exists listing_no text,
  add column if not exists listing_type text,
  add column if not exists listing_start_date date,
  add column if not exists listing_end_date date,
  add column if not exists owner_name text,
  add column if not exists owner_phone text,
  add column if not exists developer_names text,
  add column if not exists showing_instructions text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'properties_listing_type_check'
  ) then
    alter table public.properties
      add constraint properties_listing_type_check
      check (listing_type is null or listing_type in ('專任', '一般委託'));
  end if;
end $$;

create index if not exists properties_listing_no_idx
  on public.properties(listing_no)
  where deleted_at is null;

create index if not exists properties_owner_name_idx
  on public.properties(owner_name)
  where deleted_at is null;
