insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  storage_path text not null unique,
  original_filename text,
  mime_type text not null,
  file_size bigint,
  width integer,
  height integer,
  alt_text text,
  caption text,
  usage_type text not null,
  status text not null default 'active',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint media_assets_bucket_check check (bucket = 'media'),
  constraint media_assets_file_size_check check (file_size is null or file_size >= 0),
  constraint media_assets_width_check check (width is null or width > 0),
  constraint media_assets_height_check check (height is null or height > 0),
  constraint media_assets_usage_type_check check (
    usage_type in (
      'knowledge_hero',
      'knowledge_inline',
      'knowledge_gallery',
      'property_image',
      'property_cover',
      'property_floor_plan',
      'property_document_image',
      'company_logo',
      'company_line_qr',
      'hero_banner',
      'general'
    )
  ),
  constraint media_assets_status_check check (status in ('active', 'deleted'))
);

create table if not exists public.media_usages (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_assets(id),
  used_by_type text not null,
  used_by_id uuid not null,
  usage_role text not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists media_assets_usage_type_idx
  on public.media_assets(usage_type, created_at desc)
  where deleted_at is null;

create index if not exists media_assets_status_idx
  on public.media_assets(status, created_at desc);

create index if not exists media_assets_created_by_idx
  on public.media_assets(created_by, created_at desc);

create index if not exists media_usages_media_id_idx
  on public.media_usages(media_id)
  where deleted_at is null;

create index if not exists media_usages_target_idx
  on public.media_usages(used_by_type, used_by_id, usage_role, sort_order)
  where deleted_at is null;

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at before update on public.media_assets
for each row execute function public.set_updated_at();

alter table public.media_assets enable row level security;
alter table public.media_usages enable row level security;

drop policy if exists "public read active media assets" on public.media_assets;
create policy "public read active media assets" on public.media_assets
  for select to anon, authenticated
  using (bucket = 'media' and status = 'active' and deleted_at is null);

drop policy if exists "staff read media assets" on public.media_assets;
create policy "staff read media assets" on public.media_assets
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert media assets" on public.media_assets;
create policy "staff insert media assets" on public.media_assets
  for insert to authenticated
  with check (
    bucket = 'media'
    and status = 'active'
    and deleted_at is null
    and public.is_admin_role(array['editor','admin','owner'])
  );

drop policy if exists "staff update media assets" on public.media_assets;
create policy "staff update media assets" on public.media_assets
  for update to authenticated
  using (bucket = 'media' and public.is_admin_role(array['editor','admin','owner']))
  with check (bucket = 'media' and public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "public read active media usages" on public.media_usages;
create policy "public read active media usages" on public.media_usages
  for select to anon, authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.media_assets ma
      where ma.id = media_usages.media_id
        and ma.bucket = 'media'
        and ma.status = 'active'
        and ma.deleted_at is null
    )
  );

drop policy if exists "staff read media usages" on public.media_usages;
create policy "staff read media usages" on public.media_usages
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert media usages" on public.media_usages;
create policy "staff insert media usages" on public.media_usages
  for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff update media usages" on public.media_usages;
create policy "staff update media usages" on public.media_usages
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));

grant select on table public.media_assets to anon, authenticated;
grant insert, update on table public.media_assets to authenticated;
grant select on table public.media_usages to anon, authenticated;
grant insert, update on table public.media_usages to authenticated;

drop policy if exists "public read media bucket" on storage.objects;
create policy "public read media bucket" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "staff upload media bucket" on storage.objects;
create policy "staff upload media bucket" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and public.is_admin_role(array['editor','admin','owner'])
  );

drop policy if exists "staff update media bucket" on storage.objects;
create policy "staff update media bucket" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin_role(array['editor','admin','owner']))
  with check (bucket_id = 'media' and public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff delete media bucket" on storage.objects;
create policy "staff delete media bucket" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin_role(array['editor','admin','owner']));

alter type public.audit_action add value if not exists 'media_upload';
alter type public.audit_action add value if not exists 'media_update';
alter type public.audit_action add value if not exists 'media_delete';
alter type public.audit_action add value if not exists 'media_restore';
alter type public.audit_action add value if not exists 'media_attach';
alter type public.audit_action add value if not exists 'media_detach';
alter type public.audit_action add value if not exists 'media_cover_set';
alter type public.audit_action add value if not exists 'media_alt_update';
alter type public.audit_action add value if not exists 'media_caption_update';
