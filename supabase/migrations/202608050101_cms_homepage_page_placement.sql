begin;

-- Fail closed for all existing and future rows. Backfill runs only while the
-- placement schema is first introduced, so a later re-run never overwrites an
-- editor's explicit choices.
do $$
declare
  placement_schema_missing boolean;
begin
  select not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_pages'
      and column_name = 'show_as_page'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_pages'
      and column_name = 'show_on_homepage'
  ) into placement_schema_missing;

  alter table public.site_pages
    add column if not exists show_as_page boolean not null default false,
    add column if not exists show_on_homepage boolean not null default false;

  if placement_schema_missing then
    -- Managed singleton pages and reminder pages historically support both a
    -- full public page and a homepage section.
    update public.site_pages
    set show_as_page = true,
        show_on_homepage = true
    where page_type in ('philosophy', 'services', 'contact', 'reminder');

    -- `process` is the one known legacy homepage contract stored as custom.
    update public.site_pages
    set show_as_page = true,
        show_on_homepage = true
    where page_key = 'process';

    -- A custom page explicitly linked from navigation has evidence for a
    -- standalone route, but no evidence that it belongs on the homepage.
    update public.site_pages p
    set show_as_page = true
    where p.page_type = 'custom'
      and exists (
        select 1
        from public.site_navigation_items n
        where n.page_id = p.id
      );
  end if;
end
$$;

create index if not exists site_pages_public_page_placement_idx
  on public.site_pages(status, show_as_page, sort_order, published_at desc)
  where archived_at is null;

create index if not exists site_pages_homepage_placement_idx
  on public.site_pages(status, show_on_homepage, sort_order, published_at desc)
  where archived_at is null;

comment on column public.site_pages.show_as_page is
  'Whether a published, non-archived CMS row is exposed as an independent public route.';

comment on column public.site_pages.show_on_homepage is
  'Whether a published, non-archived CMS row is rendered as a homepage section.';

commit;

-- Roll-forward verification (read-only):
-- select id, title, page_key, page_type, status, archived_at, sort_order,
--        show_as_page, show_on_homepage
-- from public.site_pages
-- order by sort_order, page_key;
--
-- Application rollback: deploy the previous application first; it ignores these
-- additive columns. Schema rollback, only if subsequently approved:
-- begin;
-- drop index if exists public.site_pages_homepage_placement_idx;
-- drop index if exists public.site_pages_public_page_placement_idx;
-- alter table public.site_pages
--   drop column if exists show_on_homepage,
--   drop column if exists show_as_page;
-- commit;
