-- Read-only post-migration verification.
select column_name, data_type, is_nullable, column_default,
       col_description('public.media_assets'::regclass, ordinal_position) as comment
from information_schema.columns
where table_schema = 'public' and table_name = 'media_assets'
  and column_name in ('media_type','poster_url','poster_storage_path');

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'property_media'
  and column_name in ('media_type','mime_type','file_size','thumbnail_url','poster_storage_path')
order by ordinal_position;

select column_name, data_type, is_nullable, column_default,
       col_description('public.home_campaigns'::regclass, ordinal_position) as comment
from information_schema.columns
where table_schema = 'public' and table_name = 'home_campaigns'
  and column_name = 'slide_duration_seconds';

select e.enumlabel
from pg_type t join pg_enum e on e.enumtypid = t.oid
where t.typname = 'media_type'
order by e.enumsortorder;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('media', 'property-media')
order by id;

select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in (
  'media_assets_media_type_check',
  'media_assets_video_mime_check',
  'media_assets_video_poster_check',
  'property_media_video_poster_check'
  ,'home_campaigns_slide_duration_check'
)
order by conname;

select count(*) as legacy_images_still_readable
from public.media_assets
where deleted_at is null and media_type = 'image' and mime_type like 'image/%';

select count(*) as property_images_still_readable
from public.property_media
where deleted_at is null and media_type::text = 'image';
