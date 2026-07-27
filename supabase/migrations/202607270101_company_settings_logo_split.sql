-- Separate brand and franchise logos without overwriting the legacy logo_url.

alter table public.company_settings
  add column if not exists brand_logo_url text,
  add column if not exists franchise_logo_url text;

update public.company_settings
set brand_logo_url = coalesce(nullif(trim(brand_logo_url), ''), 'https://good.m2.cc/assets/logo-yongmei.jpeg'),
    franchise_logo_url = coalesce(nullif(trim(franchise_logo_url), ''), nullif(trim(logo_url), ''))
where id = 'default';

alter table public.company_settings
  alter column brand_logo_url set default 'https://good.m2.cc/assets/logo-yongmei.jpeg';

notify pgrst, 'reload schema';
