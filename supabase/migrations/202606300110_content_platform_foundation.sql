create table if not exists public.content_categories (
  id uuid primary key default gen_random_uuid(),
  content_type text,
  parent_id uuid references public.content_categories(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 1000,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint content_categories_content_type_check check (
    content_type is null or content_type in (
      'knowledge',
      'blog',
      'faq',
      'market_report',
      'case_study',
      'news',
      'ai_source'
    )
  ),
  constraint content_categories_slug_check check (slug ~ '^[a-z0-9-]+$'),
  constraint content_categories_unique_slug unique (content_type, slug)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  status text not null default 'draft',
  legal_status text,
  title text not null,
  slug text not null,
  summary text,
  body text,
  body_format text not null default 'markdown',
  category_id uuid references public.content_categories(id) on delete set null,
  cover_image_url text,
  seo_title text,
  meta_description text,
  og_image_url text,
  canonical_url text,
  published_at timestamptz,
  first_published_at timestamptz,
  is_featured boolean not null default false,
  sort_order integer not null default 1000,
  ai_searchable boolean not null default false,
  noindex boolean not null default false,
  source_type text,
  source_name text,
  source_url text,
  source_published_at timestamptz,
  source_updated_at timestamptz,
  effective_from timestamptz,
  effective_to timestamptz,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  review_cycle_days integer,
  review_owner uuid references auth.users(id),
  version integer not null default 1,
  supersedes_id uuid references public.content_items(id) on delete set null,
  superseded_by_id uuid references public.content_items(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_content_type_check check (
    content_type in (
      'knowledge',
      'blog',
      'faq',
      'market_report',
      'case_study',
      'news',
      'ai_source'
    )
  ),
  constraint content_items_status_check check (status in ('draft', 'published', 'archived')),
  constraint content_items_legal_status_check check (
    legal_status is null or legal_status in ('current', 'outdated', 'pending_review', 'draft', 'archived')
  ),
  constraint content_items_body_format_check check (body_format in ('markdown', 'html', 'plain_text')),
  constraint content_items_slug_check check (slug ~ '^[a-z0-9-]+$'),
  constraint content_items_version_check check (version >= 1),
  constraint content_items_review_cycle_check check (review_cycle_days is null or review_cycle_days > 0),
  constraint content_items_effective_range_check check (
    effective_to is null or effective_from is null or effective_to >= effective_from
  ),
  constraint content_items_published_at_check check (status <> 'published' or published_at is not null),
  constraint content_items_unique_type_slug unique (content_type, slug)
);

create table if not exists public.content_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint content_tags_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create table if not exists public.content_item_tags (
  content_id uuid not null references public.content_items(id) on delete cascade,
  tag_id uuid not null references public.content_tags(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (content_id, tag_id)
);

create table if not exists public.content_media (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  media_type text not null default 'image',
  role text not null default 'gallery',
  url text not null,
  storage_path text,
  thumbnail_url text,
  alt_text text,
  caption text,
  sort_order integer not null default 1000,
  is_cover boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint content_media_media_type_check check (media_type in ('image')),
  constraint content_media_role_check check (role in ('cover', 'gallery', 'inline', 'og'))
);

create table if not exists public.content_relations (
  id uuid primary key default gen_random_uuid(),
  source_content_id uuid not null references public.content_items(id) on delete cascade,
  target_content_id uuid references public.content_items(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  relation_type text not null,
  title text,
  external_url text,
  sort_order integer not null default 1000,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint content_relations_relation_type_check check (
    relation_type in (
      'related_content',
      'related_property',
      'source',
      'supersedes',
      'references',
      'ai_source'
    )
  ),
  constraint content_relations_target_check check (
    target_content_id is not null or property_id is not null or external_url is not null
  )
);

create unique index if not exists content_media_one_cover_idx
  on public.content_media(content_id)
  where is_cover = true and deleted_at is null;

create index if not exists content_items_type_status_published_idx
  on public.content_items(content_type, status, published_at desc)
  where deleted_at is null;

create index if not exists content_items_category_status_published_idx
  on public.content_items(category_id, status, published_at desc)
  where deleted_at is null;

create index if not exists content_items_type_slug_idx
  on public.content_items(content_type, slug);

create index if not exists content_items_deleted_at_idx
  on public.content_items(deleted_at);

create index if not exists content_items_legal_status_idx
  on public.content_items(legal_status);

create index if not exists content_items_next_review_at_idx
  on public.content_items(next_review_at)
  where deleted_at is null;

create index if not exists content_items_ai_searchable_idx
  on public.content_items(ai_searchable)
  where deleted_at is null;

create index if not exists content_items_noindex_idx
  on public.content_items(noindex)
  where deleted_at is null;

create index if not exists content_categories_type_sort_idx
  on public.content_categories(content_type, sort_order, name)
  where deleted_at is null;

create index if not exists content_item_tags_tag_idx
  on public.content_item_tags(tag_id);

create index if not exists content_media_content_sort_idx
  on public.content_media(content_id, sort_order)
  where deleted_at is null;

create index if not exists content_relations_source_sort_idx
  on public.content_relations(source_content_id, sort_order)
  where deleted_at is null;

drop trigger if exists content_categories_set_updated_at on public.content_categories;
create trigger content_categories_set_updated_at before update on public.content_categories
for each row execute function public.set_updated_at();

drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at before update on public.content_items
for each row execute function public.set_updated_at();

drop trigger if exists content_tags_set_updated_at on public.content_tags;
create trigger content_tags_set_updated_at before update on public.content_tags
for each row execute function public.set_updated_at();

drop trigger if exists content_media_set_updated_at on public.content_media;
create trigger content_media_set_updated_at before update on public.content_media
for each row execute function public.set_updated_at();

alter table public.content_categories enable row level security;
alter table public.content_items enable row level security;
alter table public.content_tags enable row level security;
alter table public.content_item_tags enable row level security;
alter table public.content_media enable row level security;
alter table public.content_relations enable row level security;

drop policy if exists "public read published content categories" on public.content_categories;
create policy "public read published content categories" on public.content_categories
  for select to anon, authenticated
  using (
    deleted_at is null and exists (
      select 1 from public.content_items ci
      where ci.category_id = content_categories.id
        and ci.status = 'published'
        and ci.deleted_at is null
        and ci.noindex = false
        and (ci.legal_status is null or ci.legal_status = 'current')
    )
  );

drop policy if exists "staff read content categories" on public.content_categories;
create policy "staff read content categories" on public.content_categories
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "admin owner manage content categories" on public.content_categories;
create policy "admin owner manage content categories" on public.content_categories
  for all to authenticated
  using (public.is_admin_role(array['admin','owner']))
  with check (public.is_admin_role(array['admin','owner']));

drop policy if exists "public read published content items" on public.content_items;
create policy "public read published content items" on public.content_items
  for select to anon, authenticated
  using (
    status = 'published'
    and deleted_at is null
    and noindex = false
    and (legal_status is null or legal_status = 'current')
  );

drop policy if exists "staff read content items" on public.content_items;
create policy "staff read content items" on public.content_items
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff insert draft content items" on public.content_items;
create policy "staff insert draft content items" on public.content_items
  for insert to authenticated
  with check (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and status = 'draft'
      and deleted_at is null
      and legal_status is distinct from 'current'
      and ai_searchable = false
    )
  );

drop policy if exists "staff update content items by role" on public.content_items;
create policy "staff update content items by role" on public.content_items
  for update to authenticated
  using (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and status = 'draft'
      and deleted_at is null
    )
  )
  with check (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and status = 'draft'
      and deleted_at is null
      and legal_status is distinct from 'current'
      and ai_searchable = false
    )
  );

drop policy if exists "admin owner delete content items" on public.content_items;
create policy "admin owner delete content items" on public.content_items
  for delete to authenticated
  using (public.is_admin_role(array['admin','owner']));

drop policy if exists "public read published content tags" on public.content_tags;
create policy "public read published content tags" on public.content_tags
  for select to anon, authenticated
  using (
    deleted_at is null and exists (
      select 1
      from public.content_item_tags cit
      join public.content_items ci on ci.id = cit.content_id
      where cit.tag_id = content_tags.id
        and ci.status = 'published'
        and ci.deleted_at is null
        and ci.noindex = false
        and (ci.legal_status is null or ci.legal_status = 'current')
    )
  );

drop policy if exists "staff read content tags" on public.content_tags;
create policy "staff read content tags" on public.content_tags
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "admin owner manage content tags" on public.content_tags;
create policy "admin owner manage content tags" on public.content_tags
  for all to authenticated
  using (public.is_admin_role(array['admin','owner']))
  with check (public.is_admin_role(array['admin','owner']));

drop policy if exists "public read published content item tags" on public.content_item_tags;
create policy "public read published content item tags" on public.content_item_tags
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.content_items ci
      where ci.id = content_item_tags.content_id
        and ci.status = 'published'
        and ci.deleted_at is null
        and ci.noindex = false
        and (ci.legal_status is null or ci.legal_status = 'current')
    )
  );

drop policy if exists "staff read content item tags" on public.content_item_tags;
create policy "staff read content item tags" on public.content_item_tags
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff manage content item tags" on public.content_item_tags;
create policy "staff manage content item tags"
  on public.content_item_tags
  for all to authenticated
  using (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and exists (
        select 1 from public.content_items ci
        where ci.id = content_item_tags.content_id
          and ci.status = 'draft'
          and ci.deleted_at is null
      )
    )
  )
  with check (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and exists (
        select 1 from public.content_items ci
        where ci.id = content_item_tags.content_id
          and ci.status = 'draft'
          and ci.deleted_at is null
      )
    )
  );

drop policy if exists "public read published content media" on public.content_media;
create policy "public read published content media" on public.content_media
  for select to anon, authenticated
  using (
    deleted_at is null and exists (
      select 1 from public.content_items ci
      where ci.id = content_media.content_id
        and ci.status = 'published'
        and ci.deleted_at is null
        and ci.noindex = false
        and (ci.legal_status is null or ci.legal_status = 'current')
    )
  );

drop policy if exists "staff read content media" on public.content_media;
create policy "staff read content media" on public.content_media
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff manage content media" on public.content_media;
create policy "staff manage content media"
  on public.content_media
  for all to authenticated
  using (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and exists (
        select 1 from public.content_items ci
        where ci.id = content_media.content_id
          and ci.status = 'draft'
          and ci.deleted_at is null
      )
    )
  )
  with check (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and exists (
        select 1 from public.content_items ci
        where ci.id = content_media.content_id
          and ci.status = 'draft'
          and ci.deleted_at is null
      )
    )
  );

drop policy if exists "public read published content relations" on public.content_relations;
create policy "public read published content relations" on public.content_relations
  for select to anon, authenticated
  using (
    deleted_at is null and exists (
      select 1 from public.content_items ci
      where ci.id = content_relations.source_content_id
        and ci.status = 'published'
        and ci.deleted_at is null
        and ci.noindex = false
        and (ci.legal_status is null or ci.legal_status = 'current')
    )
  );

drop policy if exists "staff read content relations" on public.content_relations;
create policy "staff read content relations" on public.content_relations
  for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']));

drop policy if exists "staff manage content relations" on public.content_relations;
create policy "staff manage content relations"
  on public.content_relations
  for all to authenticated
  using (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and exists (
        select 1 from public.content_items ci
        where ci.id = content_relations.source_content_id
          and ci.status = 'draft'
          and ci.deleted_at is null
      )
    )
  )
  with check (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and exists (
        select 1 from public.content_items ci
        where ci.id = content_relations.source_content_id
          and ci.status = 'draft'
          and ci.deleted_at is null
      )
    )
  );

grant select on table public.content_categories to anon, authenticated;
grant select on table public.content_items to anon, authenticated;
grant select on table public.content_tags to anon, authenticated;
grant select on table public.content_item_tags to anon, authenticated;
grant select on table public.content_media to anon, authenticated;
grant select on table public.content_relations to anon, authenticated;

grant insert, update, delete on table public.content_categories to authenticated;
grant insert, update, delete on table public.content_items to authenticated;
grant insert, update, delete on table public.content_tags to authenticated;
grant insert, update, delete on table public.content_item_tags to authenticated;
grant insert, update, delete on table public.content_media to authenticated;
grant insert, update, delete on table public.content_relations to authenticated;

alter type public.audit_action add value if not exists 'content_create';
alter type public.audit_action add value if not exists 'content_update';
alter type public.audit_action add value if not exists 'content_publish';
alter type public.audit_action add value if not exists 'content_unpublish';
alter type public.audit_action add value if not exists 'content_delete';
alter type public.audit_action add value if not exists 'content_restore';
