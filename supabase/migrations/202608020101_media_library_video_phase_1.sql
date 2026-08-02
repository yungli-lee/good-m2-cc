begin;

alter table public.media_assets
  add column if not exists media_type text not null default 'image',
  add column if not exists poster_url text,
  add column if not exists poster_storage_path text;

alter table public.property_media
  add column if not exists poster_storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint;

alter table public.home_campaigns
  add column if not exists slide_duration_seconds integer not null default 5;

alter table public.home_campaigns
  drop constraint if exists home_campaigns_slide_duration_check;
alter table public.home_campaigns
  add constraint home_campaigns_slide_duration_check
  check (slide_duration_seconds between 5 and 30);

update public.media_assets
set media_type = 'video'
where mime_type like 'video/%'
  and media_type = 'image';

alter table public.media_assets
  drop constraint if exists media_assets_media_type_check;
alter table public.media_assets
  add constraint media_assets_media_type_check
  check (media_type in ('image', 'video'));

alter table public.media_assets
  drop constraint if exists media_assets_video_mime_check;
alter table public.media_assets
  add constraint media_assets_video_mime_check
  check (
    (media_type = 'image' and mime_type in ('image/jpeg','image/png','image/webp','image/gif'))
    or (media_type = 'video' and mime_type in ('video/mp4','video/webm'))
  );

alter table public.media_assets
  drop constraint if exists media_assets_video_poster_check;
alter table public.media_assets
  add constraint media_assets_video_poster_check
  check (
    media_type = 'image'
    or (poster_url is not null and poster_storage_path is not null)
  );

alter table public.property_media
  drop constraint if exists property_media_video_poster_check;
alter table public.property_media
  add constraint property_media_video_poster_check
  check (
    media_type::text = 'image'
    or (
      thumbnail_url is not null
      and poster_storage_path is not null
      and mime_type in ('video/mp4','video/webm')
      and file_size > 0
      and file_size <= 104857600
    )
  ) not valid;

alter type public.media_type add value if not exists 'video';

update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm'
  ]
where id in ('media', 'property-media');

comment on column public.media_assets.media_type is
  'Phase 1 uploaded media discriminator: image or video.';
comment on column public.media_assets.poster_url is
  'Required public image poster URL for uploaded video assets.';
comment on column public.media_assets.poster_storage_path is
  'Required media bucket object path for an uploaded video poster.';
comment on column public.property_media.poster_storage_path is
  'Property-media bucket object path corresponding to thumbnail_url for videos.';
comment on column public.property_media.mime_type is
  'Uploaded property media MIME; Phase 1 videos allow only video/mp4 or video/webm.';
comment on column public.property_media.file_size is
  'Uploaded property media size in bytes; Phase 1 video maximum is 100MB.';
comment on column public.home_campaigns.slide_duration_seconds is
  'Image slide duration in seconds, from 5 through 30. Video slides remain capped at 30 seconds.';

notify pgrst, 'reload schema';

commit;
