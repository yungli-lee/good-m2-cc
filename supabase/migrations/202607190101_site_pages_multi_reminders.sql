alter table public.site_pages
  add column if not exists page_type text,
  add column if not exists published_at timestamptz;

update public.site_pages
set page_type = case
  when page_key = 'philosophy' then 'philosophy'
  when page_key = 'services' then 'services'
  when page_key in ('team', 'contact') then 'contact'
  when page_key = 'reminders' then 'reminder'
  else 'custom'
end
where page_type is null;

update public.site_pages
set published_at = coalesce(updated_at, created_at)
where status = 'published'
  and published_at is null;

alter table public.site_pages
  alter column page_type set default 'custom',
  alter column page_type set not null;

alter table public.site_pages
  drop constraint if exists site_pages_page_type_check;

alter table public.site_pages
  add constraint site_pages_page_type_check
  check (page_type in ('philosophy', 'services', 'contact', 'reminder', 'custom'));

create unique index if not exists site_pages_singleton_type_uidx
  on public.site_pages(page_type)
  where page_type in ('philosophy', 'services', 'contact');

drop index if exists public.site_pages_public_idx;

create index site_pages_public_idx
  on public.site_pages(page_type, status, sort_order, published_at desc)
  where status = 'published' and archived_at is null;

drop policy if exists "staff delete repeatable site pages" on public.site_pages;
create policy "staff delete repeatable site pages" on public.site_pages
  for delete to authenticated
  using (
    page_type in ('reminder', 'custom')
    and public.is_admin_role(array['editor','admin','owner'])
  );

grant delete on table public.site_pages to authenticated;

alter type public.audit_action add value if not exists 'site_page_delete';

notify pgrst, 'reload schema';
