alter table public.site_pages
  add column if not exists eyebrow text;

notify pgrst, 'reload schema';
