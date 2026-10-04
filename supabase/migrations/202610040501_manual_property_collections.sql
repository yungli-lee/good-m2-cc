-- Allow property collections to either follow dynamic filters or a manually curated, ordered list.
alter table public.property_collections
  add column selection_mode text not null default 'filters'
    check (selection_mode in ('filters','manual')),
  add column selected_property_ids uuid[] not null default '{}'
    check (cardinality(selected_property_ids) <= 50);

alter table public.property_collections
  add constraint property_collections_manual_selection
  check (selection_mode <> 'manual' or cardinality(selected_property_ids) > 0);

grant select (selection_mode, selected_property_ids) on public.property_collections to anon;
grant update (selection_mode, selected_property_ids) on public.property_collections to authenticated;

notify pgrst, 'reload schema';
