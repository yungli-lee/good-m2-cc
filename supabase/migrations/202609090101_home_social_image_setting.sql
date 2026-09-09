alter table public.site_display_settings
  add column if not exists home_social_image_url text,
  add column if not exists home_social_image_path text;

alter table public.site_display_settings
  drop constraint if exists site_display_settings_home_social_image_pair_check;

alter table public.site_display_settings
  add constraint site_display_settings_home_social_image_pair_check check (
    (
      home_social_image_url is null
      and home_social_image_path is null
    )
    or
    (
      home_social_image_url is not null
      and home_social_image_path is not null
      and home_social_image_path ~
        '^home-social/home-og-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}[.]jpg$'
      and home_social_image_url ~
        '^https://[^/]+/storage/v1/object/public/media/home-social/home-og-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}[.]jpg$'
      and right(
        home_social_image_url,
        length('/storage/v1/object/public/media/' || home_social_image_path)
      ) = '/storage/v1/object/public/media/' || home_social_image_path
    )
  );

comment on column public.site_display_settings.home_social_image_url is
  'Public HTTPS URL of the active homepage social preview image.';
comment on column public.site_display_settings.home_social_image_path is
  'Versioned object path in the public media bucket. Old objects are retained for shared-link cache stability.';
