alter table public.home_campaigns
  add column if not exists overlay_strength text default 'medium'
  check (overlay_strength in ('none', 'light', 'medium', 'dark'));
