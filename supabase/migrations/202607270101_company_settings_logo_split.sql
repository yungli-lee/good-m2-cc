-- Separate brand and franchise logos without overwriting the legacy logo_url.

alter table public.company_settings
  add column if not exists brand_logo_url text,
  add column if not exists franchise_logo_url text;

update public.company_settings
set brand_logo_url = coalesce(nullif(trim(brand_logo_url), ''), '/assets/logo-yongmei-transparent.png'),
    franchise_logo_url = coalesce(nullif(trim(franchise_logo_url), ''), nullif(trim(logo_url), ''))
where id = 'default';

alter table public.company_settings
  alter column brand_logo_url set default '/assets/logo-yongmei-transparent.png';

notify pgrst, 'reload schema';
