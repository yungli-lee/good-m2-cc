-- Add the required home entry without rewriting the already-applied navigation migration.

insert into public.site_navigation_items
  (item_key, location, label, href, target, sort_order, is_visible)
values
  ('home', 'header', '首頁', '/', '_self', 50, true),
  ('home', 'mobile', '首頁', '/', '_self', 50, true),
  ('home', 'footer', '首頁', '/', '_self', 50, true)
on conflict (item_key, location) do nothing;
