-- Keep the public brand subtitle independent from the legal company and franchise names.

alter table public.company_settings
  add column if not exists brand_tagline text;

update public.company_settings
set brand_tagline = '彰化房地產資訊與服務'
where id = 'default'
  and (brand_tagline is null or length(trim(brand_tagline)) = 0);

alter table public.company_settings
  alter column brand_tagline set default '彰化房地產資訊與服務',
  alter column brand_tagline set not null;

notify pgrst, 'reload schema';
