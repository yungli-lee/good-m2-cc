-- Shareable, staff-curated property searches. No customer or private property data.
create table public.property_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 1 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 100),
  description text not null default '' check (length(description) <= 500),
  q text not null default '' check (length(q) <= 200),
  city text not null default '' check (length(city) <= 80),
  districts text[] not null default '{}',
  property_type text not null default '' check (property_type in ('','residential','farmland','building_land','townhouse','apartment','building','storefront','farmhouse','factory','industrial_land')),
  price_min numeric check (price_min >= 0 and price_min <= 100000000),
  price_max numeric check (price_max >= 0 and price_max <= 100000000),
  cover_storage_path text not null default '' check (cover_storage_path = '' or cover_storage_path ~ '^property-collections/cover-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_collections_price_range check (price_min is null or price_max is null or price_min <= price_max),
  constraint property_collections_districts check (cardinality(districts) <= 26 and districts <@ array['彰化市','員林市','鹿港鎮','和美鎮','北斗鎮','溪湖鎮','田中鎮','二林鎮','線西鄉','伸港鄉','福興鄉','秀水鄉','花壇鄉','芬園鄉','大村鄉','埔鹽鄉','埔心鄉','永靖鄉','社頭鄉','二水鄉','田尾鄉','埤頭鄉','芳苑鄉','大城鄉','竹塘鄉','溪州鄉']::text[])
);
create index property_collections_admin_updated_idx on public.property_collections(updated_at desc);
create trigger property_collections_set_updated_at before update on public.property_collections
  for each row execute function public.set_updated_at();
alter table public.property_collections enable row level security;
revoke all on public.property_collections from anon, authenticated;
grant select (id,slug,title,description,q,city,districts,property_type,price_min,price_max,cover_storage_path,status,created_at,updated_at) on public.property_collections to anon;
grant select, insert on public.property_collections to authenticated;
-- Slugs, IDs and creation metadata are immutable to application users.
grant update (title,description,q,city,districts,property_type,price_min,price_max,cover_storage_path,status,updated_by) on public.property_collections to authenticated;
grant all on public.property_collections to service_role;
create policy "public read published property collections" on public.property_collections
  for select to anon, authenticated using (status = 'published');
create policy "staff read property collections" on public.property_collections
  for select to authenticated using ((select public.is_admin_role(array['editor','admin','owner'])));
create policy "staff insert property collections" on public.property_collections
  for insert to authenticated with check ((select public.is_admin_role(array['editor','admin','owner'])) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "staff update property collections" on public.property_collections
  for update to authenticated using ((select public.is_admin_role(array['editor','admin','owner'])))
  with check ((select public.is_admin_role(array['editor','admin','owner'])) and updated_by = (select auth.uid()));
notify pgrst, 'reload schema';
