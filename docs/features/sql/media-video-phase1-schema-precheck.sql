-- Read-only. Run separately in Preview and Production and compare the complete result sets.
select current_database() as database_name;

select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('media_assets', 'media_usages', 'home_campaigns', 'property_media')
order by table_name, ordinal_position;

select t.typname, e.enumlabel, e.enumsortorder
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname = 'media_type'
order by e.enumsortorder;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('media', 'property-media')
order by id;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('media_assets', 'media_usages', 'home_campaigns', 'property_media'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('media_assets', 'media_usages', 'home_campaigns', 'property_media')
order by table_name, grantee, privilege_type;

select version, name
from supabase_migrations.schema_migrations
where version = '202608020101';

select
  count(*) filter (where deleted_at is null and mime_type like 'image/%') as active_library_images,
  count(*) filter (where deleted_at is null and mime_type like 'video/%') as active_library_videos
from public.media_assets;

select
  count(*) filter (where deleted_at is null and media_type::text = 'image') as active_property_images,
  count(*) filter (where deleted_at is null and media_type::text = 'video') as active_property_videos
from public.property_media;
