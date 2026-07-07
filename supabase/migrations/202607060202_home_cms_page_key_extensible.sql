alter table public.site_pages
  drop constraint if exists site_pages_key_check;

notify pgrst, 'reload schema';
