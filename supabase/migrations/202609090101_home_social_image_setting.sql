alter table public.site_display_settings
  add column if not exists home_social_image_url text,
  add column if not exists home_social_image_path text;

alter table public.site_display_settings
  drop constraint if exists site_display_settings_home_social_image_pair_check;

alter table public.site_display_settings
  add constraint site_display_settings_home_social_image_pair_check check (
    (home_social_image_url is null and home_social_image_path is null)
    or (
      home_social_image_url ~ '^https://'
      and home_social_image_path ~ '^home-social/home-og-[A-Za-z0-9-]+[.]jpg$'
    )
  );

comment on column public.site_display_settings.home_social_image_url is
  'Public HTTPS URL of the active homepage social preview image.';
comment on column public.site_display_settings.home_social_image_path is
  'Versioned object path in the public media bucket. Old objects are retained for shared-link cache stability.';
