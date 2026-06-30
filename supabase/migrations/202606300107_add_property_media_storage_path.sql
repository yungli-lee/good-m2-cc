alter table public.property_media
  add column if not exists storage_path text;

alter table public.property_media
  alter column media_type set default 'image';
