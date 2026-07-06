alter table public.content_items
  add column if not exists image_fit text not null default 'cover';

alter table public.content_items
  drop constraint if exists content_items_image_fit_check;

alter table public.content_items
  add constraint content_items_image_fit_check
  check (image_fit in ('cover', 'contain'));
