-- Run on staging first. Production execution requires human Preview acceptance.
-- Transactional and repeatable; never inserts, deletes or publishes an article.
begin;
lock table public.content_categories, public.content_items in share row exclusive mode;
create temporary table knowledge_taxonomy_before on commit drop as
  select id, to_jsonb(i) - 'category_id' - 'updated_at' as protected_fields
  from public.content_items i;

do $$
declare
  definition record;
  previous_id uuid;
  target_id uuid;
begin
  for definition in select * from (values
    ('買屋指南','buying','buying-guide',100),
    ('賣屋指南','selling','selling-guide',200),
    ('貸款','mortgage','loan',300),
    ('稅務','tax',null,400),
    ('交易安全','transaction-safety',null,500),
    ('土地建地','land-building',null,600),
    ('農地','farmland',null,700),
    ('農舍','farmhouse',null,800),
    ('工業地廠房','industrial-property',null,900),
    ('繼承贈與','inheritance-gift',null,1000)
  ) as d(name,slug,legacy,position)
  loop
    select id into target_id from public.content_categories
      where content_type='knowledge' and slug=definition.slug;
    select id into previous_id from public.content_categories
      where content_type='knowledge' and slug=definition.legacy;
    if target_id is null and previous_id is not null then
      -- Preserve the existing category ID and all article associations.
      update public.content_categories set slug=definition.slug where id=previous_id;
    end if;
    insert into public.content_categories(content_type,name,slug,sort_order)
      values('knowledge',definition.name,definition.slug,definition.position)
      on conflict(content_type,slug) do update
      set name=excluded.name, sort_order=excluded.sort_order, deleted_at=null
      where (content_categories.name,content_categories.sort_order,content_categories.deleted_at)
        is distinct from (excluded.name,excluded.sort_order,null::timestamptz)
      returning id into target_id;
    -- ON CONFLICT with unchanged values has no RETURNING row.
    select id into target_id from public.content_categories
      where content_type='knowledge' and slug=definition.slug;
    if previous_id is not null and previous_id <> target_id then
      update public.content_items set category_id=target_id where category_id=previous_id;
      -- Keep the historical category row; retire only after all references moved.
      update public.content_categories set deleted_at=now()
        where id=previous_id and deleted_at is null
        and not exists(select 1 from public.content_items where category_id=previous_id);
    end if;
  end loop;
end $$;

-- Exact, unique (content_type, slug) identities verified against Production IDs.
-- Staging may lack these articles: leave absent articles absent, never seed content.
with moves(slug,target_slug) as (values
  ('bank-appraisal-vs-purchase-price','mortgage'),
  ('youth-home-loan-3','mortgage'),
  ('property-disclosure-checklist','transaction-safety'),
  ('before-making-property-offer','transaction-safety'),
  ('seller-disclose-leaks-and-defects','transaction-safety'),
  ('building-land-types','land-building'),
  ('building-land-before-buying','land-building'),
  ('land-road-access-rights','land-building'),
  ('townhouse-land-share-private-road-check','land-building')
)
update public.content_items i set category_id=c.id
from moves m join public.content_categories c
  on c.content_type='knowledge' and c.slug=m.target_slug
where i.content_type='knowledge' and i.slug=m.slug and i.deleted_at is null
  and i.category_id is distinct from c.id;

-- legal/changhua-market/faq rows are intentionally preserved. The application
-- excludes unused legacy categories from selectors; used ones remain in admin.
-- Uncategorized remains category_id IS NULL, including soft-deleted references.
do $$
begin
  if exists (
    select 1 from knowledge_taxonomy_before b
    full join public.content_items i on i.id=b.id
    where b.id is null or i.id is null
      or b.protected_fields is distinct from (to_jsonb(i) - 'category_id' - 'updated_at')
  ) then
    raise exception 'Category migration modified protected article fields; aborting';
  end if;
end $$;
commit;
