-- Separate the public brand identity from the legal company name.
-- Existing company_name remains the legal company name.

alter table public.company_settings
  add column if not exists brand_name text;

update public.company_settings
set brand_name = '阿勇不動產顧問'
where id = 'default'
  and (brand_name is null or length(trim(brand_name)) = 0);

alter table public.company_settings
  alter column brand_name set default '阿勇不動產顧問',
  alter column brand_name set not null;

notify pgrst, 'reload schema';
