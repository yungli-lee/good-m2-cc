create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum ('viewer', 'editor', 'admin', 'owner');
  end if;
  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type public.property_status as enum ('draft', 'published', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'property_type') then
    create type public.property_type as enum ('townhouse', 'apartment', 'building', 'land', 'farmland', 'building_land', 'storefront', 'factory', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'media_type') then
    create type public.media_type as enum ('image');
  end if;
  if not exists (select 1 from pg_type where typname = 'inquiry_status') then
    create type public.inquiry_status as enum ('new', 'contacted', 'in_progress', 'closed', 'spam', 'rate_limited', 'turnstile_failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'blocklist_type') then
    create type public.blocklist_type as enum ('ip', 'email', 'keyword');
  end if;
  if not exists (select 1 from pg_type where typname = 'audit_action') then
    create type public.audit_action as enum (
      'property_create',
      'property_update',
      'property_delete',
      'property_publish',
      'property_unpublish',
      'property_featured_change',
      'property_image_upload',
      'property_image_delete',
      'property_cover_set',
      'inquiry_view',
      'inquiry_status_update',
      'inquiry_note_create',
      'inquiry_mark_spam',
      'inquiry_delete',
      'blocklist_create',
      'blocklist_update',
      'blocklist_status_change',
      'blocklist_delete',
      'admin_login_success',
      'admin_login_failure'
    );
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.admin_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  address_public text,
  address_private text,
  price numeric check (price is null or price >= 0),
  land_area_ping numeric check (land_area_ping is null or land_area_ping >= 0),
  building_area_ping numeric check (building_area_ping is null or building_area_ping >= 0),
  layout text,
  age numeric check (age is null or age >= 0),
  orientation text,
  floor text,
  property_type public.property_type not null default 'other',
  highlights text[] not null default '{}',
  description text,
  status public.property_status not null default 'draft',
  is_featured boolean not null default false,
  sort_order integer not null default 1000,
  seo_title text,
  meta_description text,
  og_image_url text,
  canonical_url text,
  published_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint properties_published_at_check check (
    status <> 'published' or published_at is not null
  )
);

create table if not exists public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  media_type public.media_type not null default 'image',
  url text not null,
  storage_path text,
  thumbnail_url text,
  alt_text text,
  sort_order integer not null default 1000,
  is_cover boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  name text,
  phone text,
  email text,
  message text,
  property_id uuid references public.properties(id),
  source_page text,
  ip_hash text,
  user_agent text,
  turnstile_verified boolean not null default false,
  status public.inquiry_status not null default 'new',
  spam_reason text,
  internal_note text,
  assigned_to uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.blocklist (
  id uuid primary key default gen_random_uuid(),
  type public.blocklist_type not null,
  value text not null,
  reason text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (type, value)
);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  user_email text,
  action public.audit_action not null,
  resource_type text not null,
  resource_id text,
  before_data jsonb,
  after_data jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create unique index if not exists property_media_one_cover_idx
  on public.property_media(property_id)
  where is_cover = true and deleted_at is null;
create index if not exists profiles_role_idx on public.profiles(role) where deleted_at is null;
create index if not exists properties_public_idx on public.properties(status, is_featured, sort_order, created_at desc) where deleted_at is null;
create index if not exists properties_admin_idx on public.properties(status, updated_at desc) where deleted_at is null;
create index if not exists property_media_public_idx on public.property_media(property_id, sort_order) where deleted_at is null;
create index if not exists inquiries_admin_idx on public.inquiries(status, created_at desc) where deleted_at is null;
create index if not exists inquiries_assigned_to_idx on public.inquiries(assigned_to, status) where deleted_at is null;
create index if not exists blocklist_active_idx on public.blocklist(type, value) where is_active = true and deleted_at is null;
create index if not exists rate_limit_events_scope_idx on public.rate_limit_events(scope, ip_hash, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_resource_idx on public.audit_logs(resource_type, resource_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at before update on public.properties
for each row execute function public.set_updated_at();
drop trigger if exists property_media_set_updated_at on public.property_media;
create trigger property_media_set_updated_at before update on public.property_media
for each row execute function public.set_updated_at();
drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at before update on public.inquiries
for each row execute function public.set_updated_at();
drop trigger if exists blocklist_set_updated_at on public.blocklist;
create trigger blocklist_set_updated_at before update on public.blocklist
for each row execute function public.set_updated_at();

create or replace function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and deleted_at is null
  limit 1;
$$;

create or replace function public.is_admin_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and deleted_at is null
      and role::text = any(roles)
  );
$$;

create or replace function public.enforce_profile_role_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.admin_role;
  owner_exists boolean;
begin
  actor_role := public.current_admin_role();
  select exists(select 1 from public.profiles where role = 'owner' and deleted_at is null) into owner_exists;

  if tg_op = 'INSERT' then
    if new.role = 'owner' and owner_exists is false and auth.uid() is null then
      return new;
    end if;
    if actor_role = 'owner' then
      return new;
    end if;
    if actor_role = 'admin' and new.role = 'editor' then
      return new;
    end if;
    raise exception 'Insufficient permission to create profile role';
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if actor_role = 'owner' then
      return new;
    end if;
    raise exception 'Only owner can modify roles';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_role_rules on public.profiles;
create trigger profiles_enforce_role_rules
before insert or update on public.profiles
for each row execute function public.enforce_profile_role_rules();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_media enable row level security;
alter table public.inquiries enable row level security;
alter table public.blocklist enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin_role(array['admin','owner']));

drop policy if exists "owner admin insert profiles" on public.profiles;
create policy "owner admin insert profiles" on public.profiles
  for insert to authenticated
  with check (public.is_admin_role(array['admin','owner']));

drop policy if exists "owner admin update profiles" on public.profiles;
create policy "owner admin update profiles" on public.profiles
  for update to authenticated
  using (public.is_admin_role(array['admin','owner']))
  with check (public.is_admin_role(array['admin','owner']));

drop policy if exists "public read published properties" on public.properties;
create policy "public read published properties" on public.properties
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists "staff read admin properties" on public.properties;
create policy "staff read admin properties" on public.properties
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert draft properties" on public.properties;
create policy "staff insert draft properties" on public.properties
  for insert to authenticated
  with check (
    public.is_admin_role(array['admin','owner'])
    or (public.is_admin_role(array['editor']) and status = 'draft' and deleted_at is null)
  );

drop policy if exists "staff update properties by role" on public.properties;
create policy "staff update properties by role" on public.properties
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (
    public.is_admin_role(array['admin','owner'])
    or (public.is_admin_role(array['editor']) and status = 'draft' and deleted_at is null)
  );

drop policy if exists "admin owner delete properties" on public.properties;
create policy "admin owner delete properties" on public.properties
  for delete to authenticated
  using (public.is_admin_role(array['admin','owner']));

drop policy if exists "public read media of published properties" on public.property_media;
create policy "public read media of published properties" on public.property_media
  for select to anon, authenticated
  using (
    deleted_at is null and exists (
      select 1 from public.properties p
      where p.id = property_media.property_id
        and p.status = 'published'
        and p.deleted_at is null
    )
  );

drop policy if exists "staff manage property media" on public.property_media;
create policy "staff manage property media" on public.property_media
  for all to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "public insert inquiries" on public.inquiries;
create policy "public insert inquiries" on public.inquiries
  for insert to anon, authenticated
  with check (true);

drop policy if exists "staff read inquiries" on public.inquiries;
create policy "staff read inquiries" on public.inquiries
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff update inquiries" on public.inquiries;
create policy "staff update inquiries" on public.inquiries
  for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']))
  with check (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "admin owner manage blocklist" on public.blocklist;
create policy "admin owner manage blocklist" on public.blocklist
  for all to authenticated
  using (public.is_admin_role(array['admin','owner']))
  with check (public.is_admin_role(array['admin','owner']));

drop policy if exists "service role manage rate limits" on public.rate_limit_events;
create policy "service role manage rate limits" on public.rate_limit_events
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "admin owner read audit logs" on public.audit_logs;
create policy "admin owner read audit logs" on public.audit_logs
  for select to authenticated
  using (public.is_admin_role(array['admin','owner']));

drop policy if exists "staff insert audit logs" on public.audit_logs;
create policy "staff insert audit logs" on public.audit_logs
  for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media',
  'property-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read property media bucket" on storage.objects;
create policy "public read property media bucket" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'property-media');

drop policy if exists "staff upload property media bucket" on storage.objects;
create policy "staff upload property media bucket" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-media'
    and public.is_admin_role(array['editor','admin','owner'])
    and lower((storage.foldername(name))[1]) = auth.uid()::text
  );

drop policy if exists "staff update property media bucket" on storage.objects;
create policy "staff update property media bucket" on storage.objects
  for update to authenticated
  using (bucket_id = 'property-media' and public.is_admin_role(array['editor','admin','owner']))
  with check (bucket_id = 'property-media' and public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff delete property media bucket" on storage.objects;
create policy "staff delete property media bucket" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-media' and public.is_admin_role(array['editor','admin','owner']));

insert into public.blocklist (type, value, reason)
values
  ('keyword', 'casino', 'default spam keyword'),
  ('keyword', 'bitcoin', 'default spam keyword'),
  ('keyword', 'crypto', 'default spam keyword'),
  ('keyword', 'loan', 'default spam keyword'),
  ('keyword', 'seo service', 'default spam keyword'),
  ('keyword', 'backlink', 'default spam keyword'),
  ('keyword', 'gambling', 'default spam keyword'),
  ('keyword', 'investment scam', 'default spam keyword')
on conflict (type, value) do nothing;
