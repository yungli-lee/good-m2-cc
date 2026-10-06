-- Application-first, data-preserving rollback. Do not run without an approved change window.
-- PostgreSQL enum values cannot be safely removed in place. This rollback disables new video
-- uploads at Storage and removes Phase 1 enforcement while retaining columns and existing data.
begin;

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = case id
      when 'media' then array['image/jpeg','image/png','image/webp','image/gif']
      else array['image/jpeg','image/png','image/webp']
    end
where id in ('media','property-media');

alter table public.media_assets drop constraint if exists media_assets_video_mime_check;
alter table public.media_assets drop constraint if exists media_assets_video_poster_check;
alter table public.property_media drop constraint if exists property_media_video_poster_check;
alter table public.home_campaigns drop constraint if exists home_campaigns_slide_duration_check;

notify pgrst, 'reload schema';
commit;
